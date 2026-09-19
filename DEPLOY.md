# Triển khai lên server

Server đã có sẵn Traefik v3.1 giữ cổng 80/443 và một container `postgres:15-alpine` tên `esm_postgres`. Dùng chung cả hai, không dựng thêm gì.

## 1. Tạo database riêng trong Postgres đang chạy

Dùng chung **instance**, nhưng tạo **database riêng và user riêng**. Không dùng chung database với ứng dụng khác.

```bash
docker exec -it esm_postgres psql -U postgres
```

Trong psql, thay `MAT_KHAU_MANH` bằng mật khẩu bạn tự sinh:

```sql
CREATE ROLE nagih WITH LOGIN PASSWORD 'MAT_KHAU_MANH';
CREATE DATABASE nagih OWNER nagih;
\c nagih
GRANT ALL ON SCHEMA public TO nagih;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
\q
```

Sinh mật khẩu:

```bash
openssl rand -base64 24
```

Kiểm tra user mới vào được:

```bash
docker exec -it esm_postgres psql -U nagih -d nagih -c "SELECT current_database(), current_user;"
```

## 2. Quy ước Traefik của server này

Đã xác nhận từ label của `luxefleur-web`, và đã điền cứng vào `docker-compose.yml`:

| Giá trị | Trên server này |
|---|---|
| Network của Traefik | `proxy` |
| Entrypoint HTTP | `web` |
| Entrypoint HTTPS | `websecure` |
| Certresolver | `letsencrypt` |
| Cổng ứng dụng | `3000` |

Label của NAGIH đặt theo đúng kiểu luxefleur: router `nagih-web` lo chuyển hướng HTTP, router `nagih-websecure` là router chính, middleware `nagih-https-redirect`, service `nagih`. Thêm một router `nagih-leads` cho form liên hệ, có giới hạn nhịp.

Còn **một giá trị duy nhất** chưa biết, là network của Postgres:

```bash
docker inspect esm_postgres --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

Kết quả đó điền vào `DATABASE_NETWORK` trong `.env`.

## 2.5. Trỏ DNS trước khi deploy

Domain là `nagihgraphy.com`. Cần **hai** bản ghi cùng trỏ về IP server, vì Let's Encrypt xác minh từng hostname một và sẽ cấp hai chứng chỉ:

| Loại | Tên | Giá trị |
|---|---|---|
| A | `@` | IP server |
| A | `www` | IP server |

Thiếu bản ghi `www` thì router chuyển hướng www sẽ không lấy được chứng chỉ, và Traefik có thể bị Let's Encrypt chặn tạm vì thử lại nhiều lần.

Kiểm tra DNS đã lan chưa:

```bash
dig +short nagihgraphy.com www.nagihgraphy.com
```

Cả hai dòng phải ra đúng IP server trước khi chạy `docker compose up -d`.

## 3. Điền .env trên server

```bash
cp .env.example .env
nano .env
```

Bốn dòng quan trọng:

```bash
DATABASE_URL="postgresql://nagih:MAT_KHAU_MANH@esm_postgres:5432/nagih?schema=public"
SITE_DOMAIN="nagihgraphy.com"
AUTH_URL="https://nagihgraphy.com"
DATABASE_NETWORK="ten_network_lay_o_buoc_2"
```

`SITE_DOMAIN` chỉ điền apex, đừng thêm `www`. Compose tự sinh router chuyển `www.nagihgraphy.com` về `nagihgraphy.com` bằng 301.

Host trong `DATABASE_URL` là `esm_postgres`, tên container, vì hai container nói chuyện trực tiếp qua network chung. Không đi qua cổng 5432 công khai.

Sinh `AUTH_SECRET` và `CRON_SECRET`:

```bash
openssl rand -base64 32
```

## 4. Tạo thư mục ảnh

```bash
mkdir -p /srv/nagih/uploads /srv/nagih/backups
```

## 5. Đăng nhập GHCR rồi deploy

Image do GitHub Actions build mỗi khi push lên `main`, đẩy lên GHCR với ba tag: `latest`, `sha-<7 ký tự>` và full sha. Server không build, chỉ pull. Xem `.github/workflows/deploy-image.yml`.

Repo là private nên package trên GHCR cũng private. Tạo một PAT classic tại github.com/settings/tokens với đúng một quyền `read:packages`, điền vào `.env`:

```bash
GHCR_USER="haonnedu"
GHCR_TOKEN="ghp_..."
```

Script deploy tự đăng nhập bằng token đó. Clone repo lên server:

```bash
git clone https://github.com/haonnedu/nagihgraphy.git /opt/nagihgraphy && cd /opt/nagihgraphy
```

Lần đầu, sau khi đã có `.env` theo mục 3, có seed và tạo admin:

```bash
bash deploy/server-deploy.sh --seed --admin chu@nagihgraphy.com
```

Các lần cập nhật sau: đợi Actions chạy xong trên GitHub, rồi trên server:

```bash
bash deploy/server-deploy.sh
```

Rollback về một commit cũ, lấy tag ngắn từ tab Actions hoặc `git log --oneline`:

```bash
IMAGE_TAG=sha-abc1234 bash deploy/server-deploy.sh
```

Script kéo compose mới, pull image, chạy migration, bật service rồi chờ health. Nó không tạo `.env`, không tạo database, và không seed nếu không có cờ `--seed`. Migration và seed chạy từ image `nagihgraphy-migrator`, cũng do CI build, image web thường trực thì gọn hơn.

Chỉ chạy `seed` một lần. Nó nạp 6 thợ mẫu và 17 ảnh từ bản artifact của khách, trong đó ba thợ gắn cờ `sample` là dữ liệu giả cần thay bằng thợ thật.

Nếu CI chưa chạy được mà cần lên gấp, build tại chỗ bằng file override, nhớ là build ăn 1–2 GB RAM trên server:

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml build
```

Kiểm tra:

```bash
docker compose logs -f web
curl -s https://nagihgraphy.com/api/health
```

Kết quả mong đợi: `{"ok":true,"db":"up"}`

## 6. Backup

Thêm vào crontab của root:

```bash
0 3 * * * docker exec esm_postgres pg_dump -U nagih nagih | gzip > /srv/nagih/backups/nagih-$(date +\%F).sql.gz
5 3 * * * find /srv/nagih/backups -name "nagih-*.sql.gz" -mtime +14 -delete
0 4 * * 0 tar czf /srv/nagih/backups/uploads-$(date +\%F).tar.gz -C /srv/nagih uploads
```

Diễn tập phục hồi một lần trước khi bàn giao cho studio.

---

## Hai việc nên làm trên server

### Đóng cổng 5432 khỏi internet

`docker ps` cho thấy Postgres đang publish `0.0.0.0:5432->5432/tcp`, tức là mở ra toàn internet. Bất kỳ ai cũng có thể thử đoán mật khẩu.

Các container khác nói chuyện với Postgres qua network nội bộ, không cần cổng này. Nếu bạn chỉ dùng nó để thỉnh thoảng kết nối từ máy cá nhân, hãy đổi sang chỉ nghe localhost rồi dùng SSH tunnel:

```yaml
ports:
  - "127.0.0.1:5432:5432"
```

Kết nối từ máy cá nhân sau khi đổi:

```bash
ssh -L 5432:127.0.0.1:5432 root@server
```

Việc này nằm ở compose của `esm_postgres`, không phải dự án này, nên tôi không tự sửa.

### Cân nhắc phiên bản Postgres

`postgres:15-alpine` đã chạy 9 tháng chưa restart. Postgres 15 vẫn được hỗ trợ tới cuối 2027 nên không gấp, nhưng nên có kế hoạch cập nhật bản vá. Schema của dự án này không dùng gì đặc thù phiên bản, chạy từ Postgres 13 trở lên đều được.

---

## Ảnh portfolio được serve thế nào

Không còn Nginx nên `/uploads/` do chính Next.js trả, qua route `src/app/uploads/[...path]/route.ts`. Route này stream file từ đĩa kèm header cache vĩnh viễn, chặn path traversal và chặn truy cập thư mục `originals/`.

Cách này đủ tốt cho quy mô hiện tại. Nếu sau này ảnh nhiều và muốn Node nhẹ hơn, thêm một container `nginx:alpine` nhỏ chỉ để serve `/uploads/`, gắn label Traefik với `PathPrefix(/uploads)` và priority cao hơn router chính. Chưa cần làm ngay.
