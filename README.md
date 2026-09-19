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

Tóm tắt: server đã có Traefik giữ cổng 80/443 và một container PostgreSQL dùng chung. Dự án này tạo database riêng trong instance đó, rồi gắn label Traefik để nhận traffic. Không dựng thêm Postgres, không dựng thêm reverse proxy.

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
| `/` | Trang chủ tĩnh: hero, số liệu, 4 thợ nổi bật, quy trình 4 bước |
| `/tho` | Danh sách thợ, lọc theo khu vực / hạng / tag / còn lịch hôm nay, tìm không dấu, 5 kiểu sắp xếp |
| `/tho/[slug]` | Chi tiết thợ: gallery vuốt ngang, ma trận dịch vụ, lịch, link Drive |
| `/bang-gia` | Bảng giá theo hạng, máy tính phụ phí 21 tỉnh, chính sách |
| `/lien-he` | Form đặt lịch theo luồng cũ: chọn thợ, cả ngày hay nửa ngày, số người, ngày, tỉnh, địa điểm, concept; tin nhắn soạn sẵn cập nhật realtime; nút sao chép; bấm Zalo, Instagram, Messenger thì tự chép rồi mở app; nút SMS có sẵn nội dung trên điện thoại |

Bộ lọc nằm trong URL nên chia sẻ link giữ nguyên kết quả, và trang vẫn render từ server cho SEO.

### Hiệu ứng scroll

Trang chủ có 7 section kể chuyện theo scroll. Lenis làm mượt cuộn trên desktop, Motion lo hiện dần, đếm số, parallax và sách lật. Không còn GSAP.

**Portfolio là một cuốn sách lật, cuộn xuống là lật trang, chạy giống nhau trên mọi kích thước màn.** Section cao bằng một màn cộng thêm nửa màn cho mỗi trang, bên trong là sân khấu ghim bằng `position: sticky`. Tám trang xếp chồng đúng một chỗ, trang đầu trên cùng. Cuộn xuống thì trang trên gập quanh mép trái tới 105 độ và tối dần 70%, quá 90 độ thì `backface-visibility` giấu nó đi, trang dưới đã nằm phẳng sẵn. Dưới khung có tên thợ và số trang.

Tiến độ lật không dùng `useScroll` với `target` của Motion, vì nó cache vị trí phần tử lúc mount và bị trôi khi ảnh hero, font nạp muộn làm nội dung phía trên đổi chiều cao. Thay vào đó đọc `getBoundingClientRect` mỗi khung hình khi cuộn, kèm `ResizeObserver` trên body. Ghim bằng sticky chứ không bằng JS nên trên iOS không giật.

Khung ảnh tính theo chiều cao màn để không thừa khoảng trống: rộng `min(94vw, 60svh)`. Điện thoại dọc dùng tỉ lệ 3:5 cho khung cao hơn, ảnh 3:4 bị cắt hai bên chừng 12%. Từ 640px trở lên về 3:4.

Mọi hiệu ứng tắt sạch dưới `prefers-reduced-motion`, sách lật khi đó thành dải cuộn ngang thường.

### Hero ảnh tràn màn

Màn hình đầu là một ảnh portfolio cao 72vh, chữ đè lên với lớp phủ tối, ảnh trôi parallax chậm. Ảnh này là phần tử LCP nên tải eager với `fetchpriority="high"` và lấy thẳng bản 1600px.

**Ảnh hiện tại chưa đủ nét cho hero.** Toàn bộ ảnh seed lấy từ file HTML của khách, đã bị nén về cạnh dài 1000px. Ảnh dọc chỉ rộng khoảng 533px mà hero kéo lên 1265px, nên hơi mềm trên màn to. Khi studio gửi ảnh gốc, upload lại qua admin là hết. Đây là mục 9.3 trong PLAN.md.

### Form liên hệ và lead

Không có sale. Khách chọn thợ, web soạn sẵn tin nhắn, khách chép rồi nhắn thẳng cho thợ qua Zalo, Messenger hoặc Instagram. Mỗi thợ có kênh liên hệ riêng trong bốn cột `zalo`, `phone`, `facebook`, `instagram` của bảng `photographers`; cột nào trống thì rơi về liên hệ chung của studio trong `site_settings`, nên nút không bao giờ biến mất. Logic ghép nằm ở `src/lib/contacts.ts`, dùng chung cho cả trang thợ và form. Dữ liệu seed chưa có kênh riêng của thợ, chủ studio điền qua admin.

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
| `/admin/tho` | Thêm, sửa, ẩn, sắp thứ tự thợ; điền Zalo, Messenger, SĐT riêng; upload nhiều ảnh, chọn bìa, sắp thứ tự, xoá |
| `/admin/goi` | Hạng ekip và giá gói lẻ, giá gói nhóm theo số người, phụ phí từng tỉnh, chính sách, phụ phí buổi tối |
| `/admin/hero` | Chọn ảnh hero từ portfolio hoặc upload ảnh riêng |
| `/admin/lead` | Xem khách để lại thông tin, lọc theo trạng thái, ghi chú, đổi trạng thái |

Mọi thao tác lưu đều gọi `revalidatePath` cho trang khách nên đổi hiện gần như ngay. Upload đi qua server action, giới hạn 25 MB mỗi lần trong `next.config.ts`, server tự resize bằng sharp thành ba cỡ WebP.

**Chưa làm:** quản lý lịch trống của thợ trong admin (hiện mới có dữ liệu seed), sửa nội dung trang chủ và thông tin studio qua admin. Xem PLAN.md mục 7.
