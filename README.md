# NAGIH GRAPHY

Web giới thiệu thợ chụp và thu thập thông tin khách cho studio NAGIH GRAPHY.
Không phải hệ thống đặt chỗ: khách xem portfolio, web soạn sẵn tin nhắn, khách chủ động nhắn Zalo.

Kế hoạch chi tiết nằm trong [PLAN.md](PLAN.md).

## Stack

Next.js 16 App Router, TypeScript, Tailwind CSS 4, Prisma 7 trên PostgreSQL, ảnh xử lý bằng sharp và lưu trên đĩa server. Triển khai bằng Docker sau Nginx.

## Chạy lần đầu

```bash
npm install
cp .env.example .env
```

Mở `.env` và điền `DATABASE_URL` trỏ tới PostgreSQL của bạn. Sau đó:

```bash
npm run db:deploy
npm run db:seed
npm run dev
```

Mở http://localhost:3000.

### Không có PostgreSQL trên máy?

`npm run db:local` chạy một PostgreSQL thật ngay trong Node bằng PGlite, không cần cài gì thêm và không cần Docker. Mở một terminal riêng, để nó chạy, rồi đặt trong `.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/postgres"
```

Dữ liệu nằm trong `.pglite/`, xoá thư mục đó là reset sạch. Chỉ dùng để phát triển, không dùng cho production.

`db:deploy` áp migration có sẵn trong `prisma/migrations`. `db:seed` nạp dữ liệu thật trích từ bản artifact của khách: 5 hạng ekip, 5 dịch vụ, 5 tag, 21 địa điểm phụ phí, 5 dòng chính sách, 6 thợ và 18 ảnh portfolio.

Seed chạy lại nhiều lần được. Muốn nạp lại chữ mà không xử lý ảnh:

```bash
SEED_SKIP_PHOTOS=1 npm run db:seed
```

## Lệnh thường dùng

```bash
npm run dev          # dev server
npm run build        # build production
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run db:studio    # xem dữ liệu bằng Prisma Studio
npm run db:migrate   # tạo migration mới sau khi sửa schema
npm run db:local     # PostgreSQL tạm bằng PGlite, chỉ để dev
```

## Lưu ý về Windows

Máy phát triển hiện tại bị chính sách Application Control chặn native binding của SWC, nên Turbopack không chạy được. Vì vậy `dev` và `build` đang gắn cờ `--webpack`. Trên Linux và trong Docker thì bỏ cờ này đi sẽ build nhanh hơn đáng kể.

## Ảnh

Ảnh lưu ngoài repo, mặc định ở `./uploads` khi chạy local và `/app/uploads` trong container. Mỗi ảnh sinh ra bốn file: một bản gốc trong `originals/` không public, và ba bản WebP cỡ 400, 800, 1600 do Nginx serve trực tiếp.

## Triển khai

Từng bước đầy đủ nằm trong [DEPLOY.md](DEPLOY.md).

Tóm tắt: push lên `main` là xong. GitHub Actions build hai image `nagihgraphy-web` và `nagihgraphy-migrator` lên GHCR, rồi SSH vào server pull, migrate, bật và gọi health. Cần bốn secret SSH trong repo, xem DEPLOY.md mục 5. Server đã có Traefik giữ cổng 80/443 và một container PostgreSQL dùng chung, dự án tạo database riêng trong instance đó rồi gắn label Traefik. Không build trên server, không dựng thêm Postgres hay reverse proxy. Rollback bằng `IMAGE_TAG=sha-xxxxxxx`.

## Cấu trúc

```
prisma/schema.prisma     data model, xem PLAN.md mục 4
prisma/seed.ts           nạp dữ liệu thật từ seed-data.json
seed-data.json           trích từ file HTML của khách, đã tách ảnh ra ngoài
seed-assets/             18 ảnh portfolio gốc tách từ base64
src/lib/db.ts            Prisma client dùng driver adapter
src/lib/images.ts        pipeline sharp: 1 gốc + 3 cỡ WebP
src/lib/slug.ts          bỏ dấu tiếng Việt, slug, chuẩn hoá tìm kiếm
src/app/uploads/         route serve ảnh portfolio
scripts/local-db.mts     PostgreSQL tạm bằng PGlite
docker-compose.yml       service web + migrate + seed, gắn label Traefik
DEPLOY.md                các bước lên server
```

## Đã xong và chưa xong

**Xong (Phase 0 tới 5):** hạ tầng Docker và Traefik, schema 16 bảng, migration, seed dữ liệu thật, pipeline ảnh, design token theo palette gốc của studio, health check, hiệu ứng scroll, hero ảnh tràn màn, và các trang khách:

| Đường dẫn | Nội dung |
|---|---|
| `/` | Trang chủ: hero chữ với số liệu, 4 thợ nổi bật, phụ phí tỉnh, quy trình 4 bước |
| `/tho` | Danh sách thợ, lọc theo khu vực / hạng / tag / còn lịch hôm nay, tìm không dấu, 5 kiểu sắp xếp |
| `/tho/[slug]` | Chi tiết thợ: gallery vuốt ngang, ma trận dịch vụ, lịch, link Drive |
| `/bang-gia` | Bảng giá theo hạng, máy tính phụ phí 21 tỉnh, chính sách |
| `/lien-he` | Form đặt lịch theo luồng cũ: chọn thợ, cả ngày hay nửa ngày, số người, ngày, tỉnh, địa điểm, concept; tin nhắn soạn sẵn cập nhật realtime; nút sao chép; bấm Zalo, Instagram, Messenger thì tự chép rồi mở app; nút SMS có sẵn nội dung trên điện thoại |

Bộ lọc nằm trong URL nên chia sẻ link giữ nguyên kết quả, và trang vẫn render từ server cho SEO.

### Hiệu ứng scroll

Trang chủ có 5 section kể chuyện theo scroll, Motion lo hiện dần và đếm số. Không còn GSAP, không còn Lenis: cuộn là cuộn gốc của trình duyệt.

Lenis đã gỡ ngày 2026-09-20 vì hai lỗi trên desktop: nó chỉ đo giới hạn cuộn từ hộp của thẻ `html`, mà `html` có `h-full` nên không bao giờ đổi khi nội dung dài ra hay khi chuyển trang, dẫn tới không lăn tới đáy được; và cấu hình `duration` cộng dồn đích cuộn nên touchpad đảo chiều bị khựng. Các hiệu ứng còn lại không cần cuộn mượt.

Section portfolio sách lật đã bỏ theo yêu cầu của khách ngày 2026-09-20. Ảnh chỉ còn xem trong gallery từng thợ.

Mọi hiệu ứng tắt sạch dưới `prefers-reduced-motion`.

### Hero chữ trên nền trắng

Từ 2026-09-20 hero không còn ảnh, theo yêu cầu của khách. Khối đầu trang là nền trắng với quầng xanh rất nhạt, chữ căn giữa: dòng nhỏ in hoa màu cam, tiêu đề serif màu xanh có cụm nhấn màu cam đặt giữa hai dấu `*`, đoạn mô tả có cụm in đậm đặt giữa hai dấu `**`, hai nút, và một hàng viên số liệu bo tròn. Số trong viên đếm lên khi vào màn hình.

Toàn bộ chữ nằm trong `site_settings` khoá `hero`, sửa ở `/admin/hero`. Trường nào trống thì rơi về `studio.kicker`, `studio.headline`, `studio.intro`; hàng số liệu trống thì tự tính số thợ, số buổi đã chụp và giá khởi điểm từ database.

### Form liên hệ và lead

Khách chọn thợ, web soạn sẵn tin nhắn, khách chép rồi nhắn qua Zalo, Messenger hoặc Instagram của studio. Từ 2026-09-23 không còn kênh liên hệ riêng theo thợ: bốn cột `zalo`, `phone`, `facebook`, `instagram` của bảng `photographers` vẫn còn trong schema nhưng admin không sửa và web không đọc nữa. Nút Instagram mở popup "Chọn liên hệ tư vấn" liệt kê các tài khoản trong `site_settings.contacts.instagramAccounts`; chưa có trong database thì dùng mặc định trong `src/lib/contacts.ts` (page chính và ba tài khoản sale). Số điện thoại không hiện ở đâu trên web.

Nếu khách điền tên và số điện thoại thì khi bấm sao chép hoặc bấm một kênh, form gửi một lead về `POST /api/leads` chạy nền, không chặn việc mở app, và hiện mã dạng `NG-1909-A7K3`. Lead là để chủ studio xem lại trong admin, web không hứa gọi lại.

API kiểm tra lại toàn bộ dữ liệu bằng Zod, tính lại giá tạm tính từ database chứ không tin con số client gửi, ghi một `LeadEvent` trạng thái NEW, và báo Telegram nếu có `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` trong `.env`. Thiếu hai biến đó thì bỏ qua thông báo, lead vẫn lưu. Ô honeypot ẩn: bot điền vào thì API trả về thành công giả và không lưu gì. Giới hạn nhịp 10 request mỗi phút cho mỗi IP nằm ở Traefik, xem `docker-compose.yml`.

Zalo, Instagram và Messenger không nhận nội dung tin nhắn qua link, nên chép vào bộ nhớ tạm là cách duy nhất. Chỉ SMS điền sẵn được, vì vậy điện thoại có thêm nút "Nhắn SMS, có sẵn nội dung".

### Admin

Đăng nhập tại `/admin/login` bằng email và mật khẩu, phiên lưu trong JWT cookie, không cần bảng session. Guard nằm trong layout của nhóm `(panel)` chứ không dùng middleware, để Prisma không phải chạy ở edge. Ba quyền: OWNER và SALE được sửa, VIEWER chỉ xem.

Tạo tài khoản đầu tiên:

```bash
npm run admin:create -- --email chu@nagihgraphy.com --password "mat khau manh" --role OWNER
```

| Trang | Làm gì |
|---|---|
| `/admin` | Số thợ, số ảnh, khách mới, cảnh báo thợ chưa có kênh liên hệ riêng |
| `/admin/tho` | Thêm, sửa, ẩn, sắp thứ tự thợ; link album Drive; upload nhiều ảnh, chọn bìa, sắp thứ tự, xoá |
| `/admin/goi` | Hạng ekip với giá nửa ngày và giá cả ngày, giá gói nhóm theo số người, phụ phí từng tỉnh, chính sách, phụ phí buổi tối |
| `/admin/hero` | Sửa chữ đầu trang chủ: dòng nhỏ, tiêu đề, mô tả, hai nút, tối đa 4 viên số liệu |
| `/admin/lead` | Xem khách để lại thông tin, lọc theo trạng thái, ghi chú, đổi trạng thái |

Mọi thao tác lưu đều gọi `revalidatePath` cho trang khách nên đổi hiện gần như ngay. Upload đi qua server action, giới hạn 25 MB mỗi lần trong `next.config.ts`, server tự resize bằng sharp thành ba cỡ WebP.

**Chưa làm:** quản lý lịch trống của thợ trong admin (hiện mới có dữ liệu seed), sửa các đoạn chữ khác ngoài hero và thông tin studio qua admin. Xem PLAN.md mục 7.
