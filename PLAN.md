# NAGIH GRAPHY — Kế hoạch xây dựng web giới thiệu thợ + admin dashboard

> Tài liệu plan. Phase 0 tới 5 đã làm xong. Xem README.md để biết trạng thái hiện tại và những gì còn mở.

---

## 1. Đọc lại bản của khách (file `CHỌNTHỢNAGIHGRAPHY.html`)

Bản khách làm là **một file HTML đơn 1.2 MB**, toàn bộ giao diện render bằng JS thuần, dữ liệu nhúng trong một thẻ `<script type="application/json">`, ảnh nhúng base64.

**Những tính năng nghiệp vụ đáng giữ lại:**

| Nhóm | Chi tiết trong bản khách |
|---|---|
| Danh sách thợ | Card ảnh bìa, tên, hạng ekip, rating, số buổi đã chụp, giá từ, trạng thái "còn lịch hôm nay" |
| Lọc & sắp xếp | Tìm kiếm không dấu, lọc theo khu vực / hạng thợ / tag dịch vụ / còn lịch hôm nay; sắp xếp nổi bật, giá, rating, số buổi |
| Hạng thợ (tier) | Ekip 1 / Ekip 2 / Ekip 3 / Take Care / Intern, mỗi hạng một mức giá gốc, thợ có thể override giá riêng |
| Chi tiết thợ | Gallery vuốt ngang, thumbnail, mô tả phong cách, tag, link album Google Drive |
| Ma trận dịch vụ | 5 dịch vụ (bong bóng, đèn, trang phục, trợ lý, file gốc) × 3 trạng thái (có sẵn / tính thêm phí / không có) |
| Bảng giá | Ladder theo hạng thợ, đếm số thợ mỗi hạng |
| Phụ phí đi tỉnh | 21 địa điểm, min/max, ghi chú riêng từng tỉnh, nhân theo số thợ, 5 dòng chính sách |
| Máy tính giá | Chọn tỉnh → giá thợ + phụ phí = tạm tính |
| Gói nhóm | Slider 1–9 người, giá theo bậc nhóm của từng tier |
| Đặt lịch | Sinh sẵn tin nhắn text → copy → mở Zalo/Instagram/Messenger |
| Admin | Sửa inline ngay trên trang: thêm/sửa/xoá thợ, upload ảnh (nén về 1000px), bật/tắt lịch hôm nay, ẩn/hiện, sửa bảng giá + bảng phụ phí + thông tin studio, rồi "Đăng bản mới" ghi đè cả file HTML |

**Những giới hạn khiến không nên đi tiếp theo hướng đó:**

1. **Mất dấu khách hoàn toàn.** Khách bấm Zalo xong là studio không còn thông tin gì nếu họ không nhắn. Không có danh sách khách quan tâm để gọi lại.
2. **Không có database.** Dữ liệu nằm trong chính file HTML. Mỗi lần sửa là ghi đè toàn bộ file. Không có lịch thợ, không có lịch sử.
3. **Ảnh base64 trong HTML.** Trần dung lượng 15.5 MB, admin bar phải hiển thị thanh đo dung lượng. Không scale được quá ~30 thợ.
4. **Không có xác thực.** Quyền admin dựa vào capability của môi trường Artifact, không phải tài khoản.
5. **Không SEO.** Trang trắng khi tắt JS, không có meta, không có OG image, không index được — chí mạng với studio bán dịch vụ.
6. **Không có scroll effect.** Chỉ có hover nhấc card lên 2px.

**Kết luận:** giữ nguyên *toàn bộ mô hình nghiệp vụ* (tier, feature matrix, phụ phí tỉnh, gói nhóm) và giữ nguyên *luồng liên hệ* (soạn tin nhắn cho khách copy). Làm lại *toàn bộ kỹ thuật* và bổ sung ba thứ bản cũ không có: lưu thông tin khách, lịch thợ, và SEO.

---

## 2. Mục tiêu bản mới

Web này là **kênh giới thiệu profile thợ và thu thập thông tin khách**, không phải hệ thống đặt chỗ. Mọi việc chốt lịch và cọc vẫn diễn ra qua Zalo giữa sale và khách.

1. Landing page có scroll storytelling để bán cảm xúc, không chỉ liệt kê thợ.
2. Profile từng thợ đủ đẹp và đủ thông tin để khách chọn được người hợp gu mà không cần hỏi sale.
3. Luồng liên hệ giữ nguyên như bản cũ: soạn sẵn tin nhắn, khách copy rồi chủ động nhắn. Thêm việc giữ lại thông tin khách nếu họ điền tên và số điện thoại.
4. Admin dashboard riêng biệt, có đăng nhập, quản lý lead / thợ / lịch / bảng giá / ảnh.
5. SEO tốt cho các từ khoá "chụp kỷ yếu Hà Nội", "thợ chụp kỷ yếu", tên từng thợ.
6. Mobile-first. Traffic thực tế của nhóm khách này gần như toàn bộ là điện thoại.

---

## 3. Tech stack đề xuất

| Lớp | Chọn | Lý do |
|---|---|---|
| Framework | **Next.js 16, App Router, TypeScript** | SSR cho SEO, Server Actions cho form liên hệ, một codebase cho cả web khách và admin |
| CSS | **Tailwind CSS v4** | Nhanh, dễ giữ design token đồng bộ với palette xanh/cam sẵn có |
| Animation | **Motion (framer-motion) + Lenis** | Motion lo enter/exit và layout animation; Lenis lo smooth scroll |
| Database | **PostgreSQL** (đã có sẵn trên server) | Hợp với schema quan hệ bên dưới, hỗ trợ tốt `unaccent` cho tìm kiếm tiếng Việt |
| ORM | **Prisma**, provider `postgresql` | Schema rõ ràng, migration an toàn |
| Ảnh | **Lưu trên đĩa server + `sharp`** | Tự resize thành 3 cỡ WebP lúc upload |
| Auth admin | **Auth.js v5**, credentials + bcrypt | Chỉ 2–5 tài khoản nội bộ, không cần OAuth |
| Thông báo | **Nodemailer** (SMTP) + **Telegram bot** | Studio nhận lead ngay trên điện thoại, không phụ thuộc dịch vụ trả phí |
| Form & validate | **React Hook Form + Zod** | Zod schema dùng chung client và server |
| Hosting | **Server riêng, Linux + Docker** | Next.js standalone trong container, sau Traefik sẵn có |
| Analytics | **Umami** self-host | Cùng server, không gửi dữ liệu khách ra ngoài |

**Lưu ý hiệu năng:** Motion nằm trong bundle chính, Lenis nạp trễ. GSAP đã gỡ vì ghim bằng sticky là đủ.

**Lưu ý khi tự host Next.js:** bật `output: "standalone"` trong `next.config` để image Docker gọn (khoảng 150 MB thay vì 1 GB). Next.js Image Optimization chạy được khi self-host nhưng cần `sharp` trong image và cần cấp CPU; nếu server yếu thì tắt optimizer runtime và dùng ảnh đã resize sẵn lúc upload.

---

## 3.1 Hạ tầng triển khai trên server

### Hiện trạng server

Server đã chạy sẵn nhiều thứ, dự án này ghép vào chứ không dựng lại:

| Container | Vai trò | Dự án này dùng thế nào |
|---|---|---|
| `traefik:v3.1` | giữ cổng 80/443, TLS | Gắn label vào service web, không đụng cấu hình Traefik |
| `esm_postgres` (postgres:15-alpine) | database | Dùng chung instance, tạo database và user riêng tên `nagih` |
| `engrisk-frontend`, `engrisk-backend`, `luxefleur-web` | ứng dụng khác | Không liên quan |

**Không dựng container Postgres thứ hai.** Một instance phục vụ nhiều database là cách làm chuẩn: tiết kiệm RAM, một chỗ để backup, một chỗ để vá lỗi. Cái cần tách là *database* và *user*, không phải *tiến trình*.

Đánh đổi khi dùng chung: cả bốn ứng dụng chết cùng nhau nếu Postgres chết, và nâng cấp major version phải làm đồng loạt. Ở quy mô này, đổi lấy sự đơn giản là xứng đáng.

### Bố cục container mới thêm

```
traefik (đã có)        :80 / :443   TLS, định tuyến theo Host
  └─ nagih-web         :3000        Next.js standalone
esm_postgres (đã có)   :5432        database nagih, user nagih
```

Container `nagih-web` nằm trên hai network: network của Traefik để nhận traffic, và network của Postgres để nói chuyện với database qua tên container `esm_postgres`. Không đi qua cổng 5432 công khai.

### Thư mục dữ liệu trên host

```
/srv/nagih/
  uploads/            volume mount vào container web
    brand/logo-{1600,800,400}.webp
    photographers/<id>/<photoId>-{1600,800,400}.webp
    originals/        bản gốc, không public, để tái sinh khi đổi kích thước
  backups/            dump Postgres theo ngày
  .env                biến môi trường, chmod 600
```

Ảnh gốc giữ lại riêng, bản public chỉ là WebP ba kích thước. Tên file dùng ID ngẫu nhiên, không dùng tên gốc do khách tải lên.

### Traefik

Không còn Nginx. Traefik định tuyến theo label gắn trên container:

- Router chính khớp `Host(domain)`, trỏ vào cổng 3000, TLS qua certresolver sẵn có.
- Router phụ trên cổng 80 chỉ để chuyển hướng sang HTTPS.
- Router riêng cho `/api/leads` với middleware `ratelimit` 10 request mỗi phút cho mỗi IP, thay cho `limit_req` của Nginx.

**Hệ quả với ảnh:** không còn Nginx để serve file tĩnh, nên `/uploads/` do chính Next.js trả qua một route handler. Route này stream file kèm `Cache-Control: immutable`, chặn path traversal và chặn thư mục `originals/`. Đủ tốt ở quy mô này.

Nếu sau này ảnh nhiều và muốn Node nhẹ hơn, thêm một container `nginx:alpine` nhỏ chỉ serve `/uploads/`, gắn label Traefik `PathPrefix(/uploads)` với priority cao hơn router chính. Chưa cần làm ngay.

### Vận hành

| Việc | Cách làm |
|---|---|
| Deploy | Push lên `main` → GitHub Actions build image `web` và `migrator` lên GHCR. Trên server `bash deploy/server-deploy.sh`: pull, migrate, up. Không build trên server |
| Rollback | Mỗi commit có tag `sha-xxxxxxx` trên GHCR. `IMAGE_TAG=sha-xxxxxxx bash deploy/server-deploy.sh` |
| Backup DB | `docker exec esm_postgres pg_dump -U nagih nagih` hằng đêm bằng cron, giữ 14 ngày, nén gzip |
| Backup ảnh | `tar` thư mục `uploads/` hằng tuần, để cạnh dump |
| Job định kỳ | Chỉ còn hai việc nhẹ: nhắc Telegram về lead quá 24 giờ chưa ai liên hệ, và dọn ảnh mồ côi không còn thợ nào dùng. Cron trên host gọi route nội bộ có token |
| Log | `docker compose logs` gom về file, xoay vòng bằng logrotate |
| Giám sát | Healthcheck `/api/health` kiểm tra kết nối DB, Uptime Kuma tự host nếu muốn cảnh báo |

### Biến môi trường

```
DATABASE_URL          postgresql://nagih:pass@esm_postgres:5432/nagih
SITE_DOMAIN           domain gắn vào rule Host() của Traefik
TRAEFIK_NETWORK       tên network Traefik đang dùng
DATABASE_NETWORK      tên network esm_postgres đang dùng
AUTH_SECRET           chuỗi ngẫu nhiên 32 byte
AUTH_URL              https://domain
UPLOAD_DIR            /app/uploads
NEXT_PUBLIC_UPLOAD_BASE  /uploads
SMTP_HOST/PORT/USER/PASS
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
CRON_SECRET
```

---

## 4. Kiến trúc dữ liệu

Schema Prisma dự kiến (rút gọn, chưa phải code cuối):

```
Tier          id, name, slug, basePrice, note, order, hiddenInTable
GroupPrice    tierId, people (2..9), price          // thay cho mảng group[] cũ
Photographer  id, slug, name, tierId, city, style, bio, rating,
              sessions, priceOverride, driveUrl, published, order
Photo         id, photographerId, path, width, height, blurHash, order
              // path là đường dẫn tương đối dưới /uploads, không phải URL tuyệt đối,
              // để đổi domain không phải sửa dữ liệu
Feature       id, key, label, shortLabel, order
PhotographerFeature  photographerId, featureId, status(IN|EXTRA|NO)
Tag           id, name, slug
PhotographerTag      photographerId, tagId
TravelZone    id, name, minFee, maxFee, note, order
Policy        id, text, order
Availability  id, photographerId, date, half(MORNING|AFTERNOON),
              status(OPEN|BUSY|OFF), note
              @@unique([photographerId, date, half])
Lead          id, code, photographerId?, customerName, phone, zalo?, email?,
              shootDate?, shootType(FULL_DAY|HALF_DAY), people,
              travelZoneId?, placeDetail, concept, eveningAddon(bool),
              quotedBase, quotedTravel, quotedTotal,     // số đã hiển thị lúc đó
              status(NEW|CONTACTED|QUOTED|DEPOSITED|CONFIRMED|DONE|LOST),
              internalNote, channel(ZALO|INSTAGRAM|FACEBOOK|PHONE|FORM),
              createdAt, userAgent, referrer
LeadEvent     leadId, fromStatus, toStatus, actorId, note, createdAt
AdminUser     id, email, passwordHash, role(OWNER|SALE|VIEWER)
SiteSetting   key, valueJson    // studio info, contacts, headline, steps, maxPeople
AuditLog      actorId, entity, entityId, action, diffJson, createdAt
```

### Ba quyết định đã chốt

**1. Buổi chụp: chỉ cả ngày hoặc nửa ngày. Một thợ nhận tối đa 2 buổi một ngày.**

Mô hình hoá thành hai ô nửa ngày cho mỗi thợ mỗi ngày: `MORNING` và `AFTERNOON`. Chụp cả ngày chiếm cả hai ô, chụp nửa ngày chiếm một ô. Trang khách hiển thị:

| Trạng thái 2 ô | Hiển thị cho khách |
|---|---|
| Cả hai `OPEN` | Còn cả ngày |
| Một ô `OPEN` | Còn nửa ngày (sáng / chiều) |
| Không ô nào `OPEN` | Nhắn để hỏi lịch |

Chính sách "chụp thêm buổi tối đến 20h: +500.000đ" **không** thành ô thứ ba. Nó là phụ phí cộng thêm vào buổi chiều, thể hiện bằng một checkbox trong máy tính giá.

**2. Không nhận cọc online, và không có sale.** Bỏ hoàn toàn cổng thanh toán, bỏ trạng thái giữ chỗ tạm, bỏ cron nhả slot. Khách nhắn thẳng cho thợ qua Zalo hoặc Messenger của thợ, thợ tự chốt cọc. Mỗi thợ có bốn cột liên hệ riêng, trống thì rơi về liên hệ chung của studio. Chủ studio đổi trạng thái lead trong dashboard nếu muốn theo dõi.

**3. Lịch chỉ để hiển thị, không phải để đặt chỗ.** Khách không tự chiếm slot. Admin tự bật tắt ô trống. Hệ quả kỹ thuật: không cần khoá giao dịch, không cần chống trùng, không cần hàng đợi. Đơn giản hơn nhiều so với bản plan đầu.

**Báo giá vẫn là ước tính.** Giữ nguyên tinh thần bản cũ: mọi con số đều kèm "tham khảo, sale báo chính xác". Lead lưu lại con số đã hiển thị tại thời điểm đó để sale đối chiếu khi khách nhắc lại.

---

## 5. Sitemap và scroll storytelling

### Trang khách

```
/                    Landing (scroll story)
/tho                 Danh sách thợ + filter
/tho/[slug]          Chi tiết một thợ
/bang-gia            Bảng giá + phụ phí đi tỉnh + máy tính giá
/lien-he             Form một trang: chọn thợ, ngày, số người, nơi chụp → sinh tin nhắn
/ve-nagih            Giới thiệu studio
```

Không còn `/dat-lich/[code]`. Khách không có đơn để tra cứu, vì mọi thứ chốt qua Zalo.

### Kịch bản scroll của landing

| # | Section | Hiệu ứng | Ghi chú kỹ thuật |
|---|---|---|---|
| 1 | Hero | Ảnh portfolio tràn màn cao 72vh, lớp phủ tối, chữ đè lên, ảnh trôi parallax chậm hơn trang | Motion `useScroll` + `useTransform`, ảnh là LCP nên eager + fetchpriority high |
| 2 | Số liệu | 3 con số (thợ, buổi đã chụp, tỉnh đã đi) đếm lên khi vào viewport | `useInView` + count-up |
| 3 | Sách lật | Section ghim bằng sticky, 8 trang xếp chồng, cuộn dọc lật từng trang quanh gáy tới 105°, chạy giống nhau mọi màn hình | Motion `useTransform` từ tiến độ tự đo bằng `getBoundingClientRect`; không dùng GSAP |
| 4 | Chọn thợ theo vibe | Lưới card stagger reveal, hover đổi ảnh bìa | Motion `staggerChildren` 0.06s |
| 5 | Bảng giá | Các dòng ladder trượt vào lần lượt, giá đổi màu khi active | `whileInView` |
| 6 | Bản đồ tỉnh | SVG miền Bắc, các tỉnh sáng dần theo scroll, hover hiện phụ phí | SVG path + stagger |
| 7 | Quy trình 4 bước | Đường kẻ dọc vẽ dần nối 4 bước | `pathLength` scrub theo scroll |
| 8 | Feedback | Trượt ngang tự động, pause khi hover | Marquee CSS |
| 9 | CTA cuối | Ảnh nền zoom nhẹ, nút đặt lịch sticky hiện ra | scale 1 → 1.08 |

**Bắt buộc:** mọi hiệu ứng phải tắt sạch dưới `prefers-reduced-motion: reduce`. Bản khách đã làm đúng chỗ này, giữ nguyên tinh thần đó.

**Ngân sách hiệu năng:** LCP dưới 2.5s trên 4G, CLS dưới 0.1, JS ban đầu dưới 200 KB gzip. Section 3 và 6 lazy-load khi gần tới viewport.

---

## 6. Luồng liên hệ

Giữ đúng tinh thần bản cũ. Không có wizard nhiều bước, không giữ chỗ, không xác nhận đơn. Khách tự chủ động nhắn, web chỉ giúp họ soạn sẵn nội dung và giúp studio giữ lại thông tin.

### Giao diện

Một form duy nhất, tất cả trên cùng một màn hình, mọi trường đều không bắt buộc:

```
Thợ muốn chụp      select, mặc định "Nhờ studio gợi ý"
Chụp cả ngày / nửa ngày   hai nút chọn
Ngày chụp dự kiến  date, hiện trạng thái lịch của thợ đã chọn
Số người           slider 1–9
Tỉnh / thành       select, kèm phụ phí tham khảo
Địa điểm cụ thể    text
Chụp thêm buổi tối checkbox, +500.000đ
Concept mong muốn  textarea
─────────────────────────────────
Tên bạn            text
Số điện thoại      tel
```

Bên dưới là khung xem trước tin nhắn, cập nhật realtime khi khách đổi bất kỳ trường nào. Giống hệt bản cũ, nhưng thêm dòng giá tạm tính.

### Hai nút, hai việc khác nhau

**Nút "Sao chép tin nhắn"** — chép vào clipboard, hiện toast. Đúng như bản cũ, không cần tên và số điện thoại.

**Nút Zalo / Instagram / Messenger** — chép tin nhắn rồi mở app. Nếu khách đã điền tên và số điện thoại thì đồng thời gửi một `Lead` về server trước khi chuyển hướng, chạy nền, không chặn việc mở app.

Đây là điểm khác duy nhất so với bản cũ, và nó chính là phần "lấy thông tin khách". Bản cũ khách bấm Zalo xong là studio mất dấu hoàn toàn nếu họ không nhắn. Bản mới vẫn còn lại một lead để sale chủ động gọi lại.

### Một ràng buộc kỹ thuật cần biết trước

**Zalo không hỗ trợ điền sẵn tin nhắn qua link.** `zalo.me/<số>` chỉ mở được cửa sổ chat, không truyền được nội dung. Instagram và Messenger cũng vậy. Đó chính là lý do bản cũ phải làm cách chép clipboard rồi bảo khách dán, và đó vẫn là cách tốt nhất hiện có.

Chỉ hai kênh điền sẵn được thật:

| Kênh | Link | Ghi chú |
|---|---|---|
| SMS | `sms:0961120879?body=<nội dung>` | Chạy tốt trên cả iOS và Android, nên hiện nút này trên mobile |
| Email | `mailto:...?subject=&body=` | Ít khách dùng, để ở footer |

Đề xuất: mobile hiện thêm nút "Nhắn tin SMS" bên cạnh Zalo, vì đó là kênh duy nhất khách bấm một phát là xong, không phải dán.

### Chống spam

Chỉ cần honeypot field và rate limit theo IP ở tầng Nginx. Vì lead không tạo ra nghĩa vụ gì cho studio, rủi ro spam thấp. Chưa cần captcha, chỉ thêm khi thực sự bị làm phiền.

---

## 7. Admin dashboard

```
/admin                     Tổng quan
/admin/leads               Danh sách khách để lại thông tin
/admin/leads/[id]          Chi tiết lead + đổi trạng thái + ghi chú
/admin/calendar            Lịch tháng × thợ, bật tắt buổi trống
/admin/photographers       Quản lý thợ
/admin/photographers/[id]  Sửa thợ + upload ảnh
/admin/pricing             Tier, giá nhóm, phụ phí tỉnh, chính sách
/admin/settings            Thông tin studio, liên hệ, nội dung landing
/admin/users               Tài khoản nội bộ (chỉ OWNER)
```

**Màn hình tổng quan:** lead mới chưa ai liên hệ, lead đã liên hệ nhưng im hơn 3 ngày, lịch chụp 7 ngày tới, thợ được hỏi nhiều nhất tháng này, tỉnh được hỏi nhiều nhất.

Bỏ ô doanh thu ước tính. Vì không chốt đơn trên web nên mọi con số doanh thu đều là đoán, hiển thị chỉ gây hiểu nhầm.

**Quản lý lead:** bảng lọc theo trạng thái, thợ, khoảng ngày và tỉnh. Đổi trạng thái bằng kanban 7 cột theo đúng cách sale làm việc:

```
Mới → Đã liên hệ → Đã báo giá → Đã cọc → Đã chốt lịch → Đã chụp
                                                        ↘ Mất khách
```

Mỗi lead hiện sẵn nút gọi và nút mở Zalo theo số khách để lại, bấm một phát là liên hệ được. Ghi chú nội bộ tự do. Mọi lần đổi trạng thái ghi vào `LeadEvent` kèm người thao tác.

Lưu ý thực tế: sẽ có khách nhắn Zalo mà không điền form, tức là không có lead. Vì vậy dashboard cần nút **"Thêm lead thủ công"** để sale tự nhập khách đến từ kênh khác. Không có nút này thì dashboard sẽ luôn thiếu dữ liệu và sale sẽ bỏ dùng.

**Quản lý lịch:** lưới tháng, mỗi thợ một hàng, mỗi ngày một ô chia đôi sáng/chiều. Click nửa ô để bật tắt. Kéo chọn nhiều ngày. Có nút "nghỉ từ ngày… đến ngày…" cho các đợt thợ bận dài. Ô đã gán cho lead nào thì hiện tên khách khi hover.

**Quản lý ảnh:** kéo thả upload, server tự resize bằng `sharp` thành ba cỡ WebP, kéo để sắp thứ tự, ảnh đầu là bìa. Không còn trần 15,5 MB như bản cũ.

**Phân quyền:** OWNER làm mọi thứ. SALE xử lý lead và đổi lịch, không sửa giá và không sửa nội dung landing. VIEWER chỉ xem.

---

## 8. Lộ trình

| Phase | Nội dung | Ước lượng |
|---|---|---|
| **0. Khởi tạo** ✅ | Next.js + TS + Tailwind, ESLint/Prettier, cấu trúc thư mục, design token lấy từ palette bản cũ | 0.5 ngày |
| **0.5. Hạ tầng** ✅ | Dockerfile standalone, `docker-compose.yml`, Nginx + TLS, nối vào Postgres sẵn có, deploy một trang trống lên domain thật để chốt luồng deploy ngay từ đầu | 0.5–1 ngày |
| **1. Dữ liệu** ✅ | Prisma schema, migration, seed toàn bộ dữ liệu thật trích từ file HTML của khách (6 thợ, 5 tier, 5 feature, 21 tỉnh, 5 chính sách) | 1 ngày |
| **2. Trang khách tĩnh** ✅ | Layout, header/footer, `/tho` + filter + sort, `/tho/[slug]`, `/bang-gia` + máy tính giá. Chưa animation | 2–3 ngày |
| **3. Scroll effects** ✅ | Lenis, Motion; sách lật ghim bằng sticky; dựng 7 section landing; kiểm tra reduced-motion và hiệu năng mobile | 2–3 ngày |
| **4. Liên hệ** ✅ | Form một trang, sinh tin nhắn realtime, copy clipboard, nút Zalo/IG/FB/SMS, lưu lead, báo Telegram | 1–1.5 ngày |
| **5. Admin** ✅ | Auth.js, layout dashboard, CRUD thợ/ảnh, kanban lead, lịch tháng × thợ, bảng giá, settings | 3–4 ngày |
| **6. Hoàn thiện** | SEO (metadata, OG image động, sitemap, JSON-LD LocalBusiness), a11y, Lighthouse, test luồng liên hệ, backup, hướng dẫn cho studio | 1.5–2 ngày |

**Tổng: khoảng 11–16 ngày công.**

Giảm khoảng 2 ngày so với plan trước, toàn bộ đến từ Phase 4. Bỏ wizard, bỏ giữ chỗ, bỏ trang tra cứu và bỏ cron nhả slot làm phần này gọn hẳn.

Phase 0.5 làm sớm là có chủ đích. Tự host thì lỗi deploy thường lộ muộn và tốn thời gian nhất, nên dựng đường ống trước khi có gì để deploy.

Có thể cắt ngắn thêm: Phase 3 rút còn 1 ngày nếu bỏ pin gallery ngang và bản đồ SVG. Phase 5 rút còn 2 ngày nếu admin chỉ cần quản lý lead và lịch, còn thợ và giá vẫn sửa bằng seed.

---

## 9. Trạng thái các câu hỏi

### Đã chốt

| Câu hỏi | Quyết định |
|---|---|
| Slot chụp | Chỉ cả ngày hoặc nửa ngày |
| Một thợ một ngày | Tối đa 2 buổi, mô hình hoá thành ô sáng và ô chiều |
| Cọc online | Không. Sale chốt cọc thủ công qua Zalo |
| Luồng booking | Giữ như bản cũ: soạn tin nhắn, khách copy và chủ động liên hệ |
| Mục đích web | Show profile thợ và thu thập thông tin khách |

### Còn mở, không chặn việc bắt đầu

1. **Kênh nhận thông báo lead**: Telegram bot là rẻ và nhanh nhất. Zalo OA cần doanh nghiệp duyệt.
2. **Domain** đã trỏ về server chưa, ai quản lý DNS.
3. **Nguồn ảnh portfolio**: xuất từ Drive hiện có hay upload lại từ đầu.
4. **Dữ liệu 6 thợ trong file khách** có phải thật không, hay 3 người gắn cờ `sample` là dữ liệu giả cần thay.
5. **Buổi tối tính là gì**: theo bản cũ thì "+500.000đ đến 20h". Plan đang hiểu là phụ phí cộng vào buổi chiều, không phải buổi thứ ba. Cần studio xác nhận lại.
6. **Có hiện nút SMS trên mobile không**: đây là kênh duy nhất điền sẵn được tin nhắn thật sự. Cần studio đồng ý nhận SMS.

### Cần biết thêm về server

| Câu hỏi | Vì sao cần |
|---|---|
| RAM và số core của server | Quyết định có bật Next.js Image Optimization lúc chạy hay resize sẵn khi upload. Dưới 2 GB RAM thì nên resize sẵn |
| Dung lượng đĩa còn trống | Ước lượng số ảnh chứa được, quyết định có cần ổ riêng cho `uploads/` |
| PostgreSQL chạy trong Docker hay trực tiếp trên host | Quyết định cách nối mạng giữa container web và DB |
| Phiên bản PostgreSQL | Từ 13 trở lên là đủ. Cần bật extension `unaccent` cho tìm kiếm không dấu |
| Server đã có Nginx/Caddy và website khác chưa | Nếu có rồi thì thêm virtual host, không dựng reverse proxy mới |
| Cổng 80 và 443 đã mở ra internet chưa | Cần cho Let's Encrypt cấp chứng chỉ |
| Có sẵn SMTP để gửi mail không | Nếu không thì dùng Telegram bot là đủ, bỏ phần email |

---

## 10. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Scroll effect giật trên máy Android tầm trung | Chỉ animate `transform` và `opacity`, giới hạn ScrollTrigger ở desktop, đo bằng Lighthouse mobile throttle |
| Rất ít khách chịu điền tên và SĐT, dashboard trống | Đây là rủi ro lớn nhất của mô hình này. Giảm bằng cách để hai trường đó ngay cạnh nút Zalo với dòng "để lại số nếu muốn sale gọi lại tư vấn", không bắt buộc, không chặn nút. Kèm nút thêm lead thủ công cho sale. Đo tỉ lệ điền sau 2 tuần rồi mới tính tiếp |
| Lịch trên web lệch với lịch thật của thợ | Lịch do admin tự cập nhật nên sẽ có lúc cũ. Luôn kèm dòng "nhắn để xác nhận lịch chính xác", và cảnh báo trong dashboard nếu quá 7 ngày không ai đụng vào lịch |
| Lead ảo, spam | Honeypot và rate limit theo IP. Lead không tạo nghĩa vụ gì nên rủi ro thấp |
| Studio không quen dùng dashboard | Giữ đúng ngôn ngữ và thuật ngữ tiếng Việt của bản cũ, viết hướng dẫn 1 trang kèm ảnh chụp màn hình |
| Đầy đĩa vì ảnh portfolio | Giữ bản gốc riêng, bản public chỉ WebP ba cỡ. Cảnh báo khi đĩa còn dưới 20%. Ước tính 30 thợ × 8 ảnh chiếm dưới 1 GB |
| Mất dữ liệu do tự host | `pg_dump` hằng đêm giữ 14 ngày, `rsync` thư mục ảnh hằng tuần sang máy khác. Diễn tập phục hồi một lần trước khi bàn giao |
| Server chết là web chết | Không có redundancy như PaaS. Bù bằng healthcheck, `restart: unless-stopped`, và Uptime Kuma cảnh báo qua Telegram |
| Băng thông server yếu, ảnh tải chậm | Serve ảnh qua Nginx với cache dài hạn, dùng AVIF/WebP, lazy-load. Nếu vẫn chậm thì đặt Cloudflare miễn phí trước domain làm CDN |
