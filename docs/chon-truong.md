# Chọn trường — yêu cầu và thiết kế

Nguồn: tài liệu "Yêu cầu bổ sung: Chọn trường — nagihgraphy.com" của khách (31/10/2026) và bản mẫu "NAGIH Chọn Thợ" (tab "Chọn trường"). Phần 1 chép lại yêu cầu, phần 2 là các quyết định khi ghép vào code hiện tại.

Lưu ý chữ: tài liệu khách dùng chữ "thợ", nhưng mọi chữ hiện cho người dùng trên site đã đổi thành **"Photo"** (commit d3f5f71). Giữ quy ước đó. Không dùng chữ "sale" trong chữ cho khách.

---

## 1. Yêu cầu của khách

### Mục tiêu

Thêm một lối vào thứ hai cho khách: vào từ **trường của mình**, xem ảnh Photo NAGIH đã chụp ở đúng trường đó, ưng góc nào thì chọn luôn Photo đã chụp góc đó. Hiện khách chỉ có luồng "chọn Photo" rồi đoán xem Photo này chụp ở trường mình có đẹp không.

Ba thứ tính năng này giải quyết: bằng chứng cụ thể (ảnh thật tại trường mình), SEO (mỗi trường một trang, bắt từ khoá "chụp kỷ yếu Đại học Thương Mại"), động lực cho Photo (ảnh của ai lên web thì khách bấm vào ra tên người đó).

### Màn hình 1 — Danh sách trường

Lối vào: mục "Chọn trường" ngang hàng "Chọn Photo" trên menu chính, dùng chung header, font, màu, nút Đặt lịch. Phải vào được trên cả điện thoại và máy tính.

- **Lưới card trường**: ảnh bìa, mã trường (TMU, NEU…), tên đầy đủ, thành phố, số ảnh, số Photo đã chụp tại trường. Link "Xem góc đẹp →".
- **Ô tìm kiếm** theo tên trường, bỏ dấu vẫn ra (gõ "thuong mai" ra Đại học Thương Mại).
- **Lọc theo thành phố**: lấy từ dữ liệu, không hard-code.
- **Hai trạng thái trường**: `live` hiện ở lưới chính; `soon` ("Sắp có ảnh") dồn xuống khu riêng phía dưới, card không bấm vào được, chỉ có nút "Nhắn studio hỏi trước".
- Câu chốt cuối trang: "Chưa thấy trường của bạn? Nhắn NAGIH, bọn mình nhận chụp ở mọi trường, chỉ là chưa kịp đưa ảnh lên web." Không để khách hiểu nhầm NAGIH chỉ chụp mấy trường trong danh sách.

### Màn hình 2 — Trang một trường

URL riêng: `/truong/dai-hoc-thuong-mai`.

Trên cùng: tên trường, thành phố, đoạn giới thiệu ngắn do NAGIH viết, dòng thống kê `X ảnh · Y góc · Z Photo`.

Ba bộ lọc dạng chip, cộng dồn với nhau:

| Bộ lọc | Giá trị | Nguồn |
|---|---|---|
| Góc chụp | Sảnh V, Hàng cây… | Sinh tự động từ ảnh đã duyệt của trường |
| Năm chụp | 2026, 2025… | Trường `year` của ảnh, mới nhất trước |
| Kiểu chụp | Cá nhân / Nhóm | Trường `kind` của ảnh |

Dưới là lưới ảnh. Mỗi ô chỉ cần ảnh + dải chữ đè dưới: tên góc ở trên, tên Photo và năm ở dưới. Lọc không ra ảnh nào thì hiện nút xoá bộ lọc, không để trang trắng.

### Màn hình 3 — Popup ảnh (quan trọng nhất)

Bấm một ô ảnh thì mở popup (mobile là sheet trượt từ dưới lên), không chuyển trang. Từ trên xuống:

1. Ảnh lớn.
2. Ba chip: tên góc, năm chụp, cá nhân/nhóm.
3. Tên trường và ghi chú chụp của Photo nếu có (VD "Chụp ngược sáng buổi chiều, tầm 15h30 là đẹp nhất"). Đây là thứ đối thủ không có, đừng bỏ.
4. Thẻ Photo đã chụp góc này: avatar, tên, hạng (Ekip 1/2/3), giá khởi điểm, hai nút:
   - **Xem Photo** → trang Photo của luồng "Chọn Photo" đang có.
   - **Đặt** → form đặt lịch hiện tại, **điền sẵn tên Photo, tên trường và tên góc** vào tin nhắn soạn sẵn.
5. "Photo khác cũng chụp góc này (n)" → mở danh sách Photo còn lại từng chụp đúng góc đó, mỗi người có Xem Photo / Đặt.

Kỹ thuật: popup **không được tự đóng khi bôi đen chữ hoặc kéo chuột ra ngoài vùng**, chỉ đóng khi bấm đúng nền tối hoặc nút X. Bản web hiện tại đã gặp lỗi này một lần.

### Luồng Photo nộp ảnh

Photo tự nộp, không qua admin. Đăng nhập tài khoản riêng, vào khu vực của mình.

Trang của Photo có bốn số: ảnh đã lên web, ảnh đang chờ duyệt, lượt khách xem ảnh của mình, lượt khách bấm Đặt từ ảnh của mình. Hai số sau tạo động lực, đừng cắt.

Form nộp:

| Trường | Kiểu | Bắt buộc |
|---|---|---|
| Ảnh | Upload, 1–5 ảnh một lần | Có |
| Trường | Chọn từ danh sách | Có |
| Góc chụp | Chọn góc có sẵn, hoặc gõ góc mới | Có |
| Năm chụp | Số, mặc định năm hiện tại | Có |
| Kiểu chụp | Cá nhân / Nhóm | Có |
| Ghi chú chụp | Văn bản ngắn, gợi ý "giờ nào đẹp, cần xin phép ai" | Không |
| Cam kết | Tick "Khách trong ảnh đã đồng ý cho NAGIH đăng ảnh này" | Có |

Chặn từ phía server, không chỉ ẩn nút: tối đa **5 ảnh một lần nộp**; tối đa **10 ảnh đang chờ duyệt**, vượt thì báo "đợi QC duyệt bớt rồi nộp tiếp".

Photo thấy ảnh bị trả lại kèm lý do, sửa rồi nộp lại được. Photo không được sửa hay xoá ảnh đã lên web, muốn gỡ thì nhắn QC.

### Luồng QC duyệt ảnh

Ảnh Photo nộp **không lên web ngay**, phải qua duyệt.

Trang QC là một hàng đợi: mỗi thẻ gồm ảnh nhỏ, tên trường, tên góc Photo đề xuất, tên Photo, kiểu chụp, thời gian nộp, ghi chú. QC làm ba việc:

1. **Sửa tên góc** về đúng danh mục chuẩn của trường. Đây là việc sống còn: nếu mỗi Photo gõ một kiểu ("sảnh V", "Sảnh chữ V", "sân trước nhà V") thì bộ lọc góc ở màn hình 2 vỡ ngay. Ô nhập tên góc có gợi ý từ các góc đã có của trường.
2. **Duyệt** → ảnh lên trang trường ngay.
3. **Trả lại** → bắt buộc nhập lý do ngắn, ảnh quay về Photo kèm lý do.

Luật: **một Photo không chiếm quá 40% số ảnh của một trường**. Vượt thì vẫn cho duyệt nhưng cảnh báo QC.

Trường `soon` tự chuyển sang `live` khi đủ **4 ảnh đã duyệt**.

### Phân quyền

Bốn vai, mỗi người một tài khoản riêng.

| Vai | Được làm |
|---|---|
| Khách (không đăng nhập) | Xem danh sách trường, trang trường, popup ảnh, bấm Đặt |
| Photo | Nộp ảnh, xem thống kê của riêng mình, sửa ảnh bị trả lại |
| QC | Duyệt / trả ảnh, sửa tên góc, gỡ ảnh đã lên web, sửa danh mục góc |
| Admin | Toàn quyền QC + thêm/sửa/xoá trường, sửa giới thiệu trường, quản lý tài khoản |

Photo này không xem được thống kê hay ảnh chờ duyệt của Photo khác. Phân quyền kiểm tra ở server.

### Mô hình dữ liệu (theo khách)

Bốn bảng mới, nối vào bảng Photo đã có. Không tạo bản sao danh sách Photo.

- **schools**: id, slug, name, short, city, intro, cover_photo_id, status (`live` / `soon`)
- **angles**: id, school_id, name — danh mục góc chuẩn, QC quản
- **photos**: id, school_id, angle_id, photographer_id, year, kind, note, file_url, sort_order, approved_at, approved_by
- **submissions**: id, school_id, angle_id hoặc angle_text, photographer_id, year, kind, note, file_url, consent, status (`cho` / `duyet` / `tra`), reject_reason, created_at

Thống kê lượt xem và lượt bấm Đặt: lưu đếm theo photographer_id, một bảng đếm đơn giản.

### Ảnh và hiệu năng

- Lưu ảnh ngoài database, DB chỉ giữ đường dẫn.
- Tự resize khi upload thành ít nhất thumbnail (~600px) và bản lớn (~1600px). Photo sẽ nộp file gốc 8–10 MB.
- WebP kèm fallback JPEG.
- Lazy load toàn bộ ảnh dưới màn hình đầu tiên.
- Nhận file HEIC từ iPhone và tự chuyển sang JPEG.
- Trang trường đầy ảnh phải mở dưới 3 giây trên 4G điện thoại.

### SEO

- URL riêng mỗi trường `/truong/dai-hoc-thuong-mai`, không dùng `#` hay `?id=`.
- Title và meta description riêng, mẫu: *Chụp kỷ yếu Đại học Thương Mại — ảnh thật, bảng giá và Photo đã chụp tại trường | NAGIH GRAPHY*.
- Alt text tự sinh: "Sảnh V tại Đại học Thương Mại".
- Sitemap tự cập nhật khi thêm trường.
- Không bắt buộc: schema `ImageObject` cho ảnh, `LocalBusiness` cho studio.

### Bản quyền ảnh khách

- Form nộp bắt buộc tick cam kết. Lưu cả người tick và thời điểm tick.
- QC và admin gỡ ảnh trong một nút bấm.
- Cuối mỗi trang trường: ảnh đăng khi khách đồng ý, muốn gỡ ảnh của mình thì nhắn NAGIH, bọn mình gỡ trong ngày.

### Ngoài phạm vi giai đoạn 1

Lọc Photo còn lịch trống ngay trên trang trường, bình luận/đánh giá ảnh, chia sẻ từng ảnh ra mạng xã hội, so sánh nhiều trường, thông báo tự động cho Photo khi ảnh được duyệt.

### Checklist nghiệm thu

- [ ] Từ trang chủ vào được mục Chọn trường trên cả điện thoại và máy tính
- [ ] Tìm "thuong mai" không dấu vẫn ra Đại học Thương Mại
- [ ] Lọc góc + năm + kiểu chụp cùng lúc ra đúng kết quả
- [ ] Bấm Đặt từ popup ảnh → tin nhắn soạn sẵn có đủ tên Photo, tên trường, tên góc
- [ ] Bôi đen chữ trong popup không làm popup tự đóng
- [ ] Photo nộp ảnh HEIC từ iPhone lên được
- [ ] Nộp ảnh thứ 6 trong một lần bị chặn
- [ ] Ảnh chưa duyệt không xuất hiện ở trang trường
- [ ] QC trả ảnh → Photo thấy lý do và nộp lại được
- [ ] Photo A không xem được khu vực của Photo B
- [ ] Trường đủ 4 ảnh duyệt thì tự chuyển từ "Sắp có" sang hiển thị chính
- [ ] Trang trường đầy ảnh mở dưới 3 giây trên 4G
- [ ] Mỗi trường có URL và title riêng

---

## 2. Quyết định khi ghép vào code hiện tại

### Vai và quyền

| Vai khách | Vai trong `AdminRole` | Ghi chú |
|---|---|---|
| Admin | `OWNER` | Thêm/sửa/xoá trường, sửa giới thiệu, tạo tài khoản QC |
| QC | `QC` (mới) | Chỉ vào được khu duyệt ảnh và danh mục góc/ảnh của trường, mọi trang admin khác chuyển về trang duyệt |
| — | `SALE` | Được duyệt như QC (đã chốt với chủ dự án 31/10/2026), không thêm/xoá trường |
| — | `VIEWER` | Chỉ xem |
| Photo | `PHOTOGRAPHER` | Thêm trang "Ảnh trường của tôi" bên cạnh lịch và hồ sơ |

Id Photo luôn lấy từ phiên đăng nhập (`user.photographerId`), không lấy từ URL hay form, giống trang lịch.

### Đường dẫn

| Đường dẫn | Ai | Nội dung |
|---|---|---|
| `/truong` | Khách | Màn hình 1 |
| `/truong/[slug]` | Khách | Màn hình 2 + popup (màn hình 3). Bộ lọc nằm trong URL: `?goc=<angleId>&nam=2026&kieu=ca-nhan\|nhom`. Mở thẳng một ảnh bằng `?anh=<photoId>` |
| `/lien-he?tho=<slug>&truong=<slug>&goc=<angleId>` | Khách | Form đặt lịch, điền sẵn Photo, trường, góc |
| `/admin/anh-truong` | Photo | Bốn số thống kê, form nộp, danh sách ảnh đã nộp và ảnh bị trả lại |
| `/admin/duyet-anh` | QC, SALE, OWNER | Hàng đợi duyệt |
| `/admin/truong` | QC, SALE, OWNER (VIEWER xem) | Danh sách trường. Chỉ OWNER thấy nút thêm trường |
| `/admin/truong/[id]` | như trên | Thông tin trường (chỉ OWNER sửa/xoá), danh mục góc (QC sửa/gộp/xoá), ảnh đã lên web (QC gỡ, đặt làm bìa) |

### Dữ liệu

Bảng ảnh portfolio đã tên `Photo`, nên ảnh trường đặt tên `SchoolPhoto` (bảng `school_photos`). Bốn bảng của khách + một bảng đếm:

- `School` → `schools`
- `SchoolAngle` → `school_angles`
- `SchoolPhoto` → `school_photos`
- `PhotoSubmission` → `photo_submissions`
- `PhotographerStat` → `photographer_stats`, một hàng mỗi Photo mỗi ngày: `views`, `bookClicks`

Bảy trường của bản mẫu được nạp sẵn bằng migration (không phải seed, để production cũng có), trạng thái `SOON`, chưa có góc.

### Ảnh

- Ảnh chờ duyệt nằm dưới `pending/`, route `/uploads` chỉ trả ảnh `pending/` cho người đã đăng nhập admin. Duyệt xong thì chuyển file sang `schools/<schoolId>/`.
- Dùng lại pipeline sharp hiện có (3 cỡ WebP 400/800/1600), thêm một bản JPEG 800 làm fallback cho ảnh trường.
- HEIC và ảnh 8–10 MB: trình duyệt của Photo chuyển HEIC sang JPEG và thu về cạnh dài tối đa 2560px trước khi gửi. Server 2 GB RAM, không giải mã HEIC ở server (sharp bản dựng sẵn không có HEVC).
- Server xử lý từng ảnh một (`sharp.concurrency(1)` đã có).

### Đặt lịch

Nút Đặt trong popup mở `/lien-he?tho=…&truong=…&goc=…`. Tin nhắn soạn sẵn thêm dòng `- Ảnh tham khảo: góc <góc> tại <trường>`, ô địa điểm cụ thể điền sẵn tên trường. Nút Đặt và việc mở popup đều gửi một sự kiện đếm vào `photographer_stats`.

---

## 3. Hợp đồng kỹ thuật (cho người làm giao diện)

Phần nền đã xong: schema, migration, guard, xử lý ảnh, luật nghiệp vụ, truy vấn, endpoint đếm. Người làm giao diện **chỉ gọi** các hàm dưới đây, không tự viết truy vấn ghi hay tự kiểm tra luật. Mọi hàm ghi tự kiểm tra lại vai từ `user`, nên server action chỉ cần lấy `user` từ guard rồi chuyển vào.

### 3.1 Sở hữu file

| Ai | File |
|---|---|
| Phần nền (đã xong, giai đoạn này không sửa thêm) | `prisma/**`, `src/lib/**`, `src/auth.ts`, `src/types/**`, `src/app/uploads/[...path]/route.ts`, `src/app/api/truong/**`, `src/app/admin/(panel)/layout.tsx`, `src/app/admin/(panel)/tai-khoan/**`, `next.config.ts`. Đã sửa thêm vài dòng ở `src/app/admin/(panel)/page.tsx` và `mat-khau/*` cho vai QC |
| Giao diện khách | `src/app/(site)/truong/**`, `src/components/truong/**` (gợi ý), mục "Chọn trường" trên menu, `src/app/sitemap.ts`, nối `/lien-he?truong=&goc=` vào form |
| Giao diện Photo | `src/app/admin/(panel)/anh-truong/**` |
| Giao diện QC | `src/app/admin/(panel)/duyet-anh/**`, `src/app/admin/(panel)/truong/**` |

Cần thêm hàm ở `src/lib` thì nhắn người làm phần nền, đừng sửa trực tiếp.

### 3.2 Dữ liệu (Prisma, kiểu enum ở `@/generated/prisma/enums`)

- `AdminRole` thêm `QC`.
- `SchoolStatus = "LIVE" | "SOON"`, `ShotKind = "INDIVIDUAL" | "GROUP"`, `SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED"`.
- Bảng: `School` (`schools`), `SchoolAngle` (`school_angles`, unique `[schoolId, name]`), `SchoolPhoto` (`school_photos`), `PhotoSubmission` (`photo_submissions`), `PhotographerStat` (`photographer_stats`, khoá `[photographerId, date]`).
- Xoá trường xoá luôn góc, ảnh, bài nộp (và file). Xoá góc đang có ảnh bị chặn (`RESTRICT`), phải gộp.
- Migration `prisma/migrations/20261031000000_chon_truong` nạp sẵn 7 trường `SOON`, id `school_tmu`, `school_neu`, `school_hust`, `school_ftu`, `school_cva`, `school_ulis`, `school_uel`.
- `path` của ảnh là **stem** giống `Photo.path`: `pending/<photographerId>/<hex>` khi chờ duyệt, `schools/<schoolId>/<hex>` khi đã duyệt.

### 3.3 Guard (`@/lib/admin-guard`)

```ts
export const QC_HOME = "/admin/duyet-anh";
requireAdmin(opts?: { allowPhotographer?: boolean; allowQc?: boolean }): Promise<AdminUser>
  // mặc định chặn PHOTOGRAPHER (→ /admin/lich/toi) và QC (→ QC_HOME)
isStaff(role): boolean            // chỉ OWNER, SALE, VIEWER (QC và Photo có menu riêng)
canReview(role): boolean          // OWNER, SALE, QC: duyệt, trả, gỡ ảnh, sửa góc, đặt bìa
canManageSchools(role): boolean   // OWNER: thêm, sửa, xoá trường
requireReviewer(): Promise<AdminUser>        // server action, ném Error nếu không đủ quyền
requireSchoolManager(): Promise<AdminUser>   // server action, chỉ OWNER
requirePhotographer(): Promise<AdminUser & { photographerId: string }>  // server action của Photo
```

Cách dùng ở trang:

- `/admin/duyet-anh`: `requireAdmin({ allowQc: true })`; VIEWER không có `canReview` thì hiện "chỉ xem" hoặc `redirect("/admin")`.
- `/admin/truong/**`: `requireAdmin({ allowQc: true })`. VIEWER xem được; nút sửa góc, gỡ ảnh, đặt bìa chỉ hiện khi `canReview`; form thông tin trường và nút thêm/xoá trường chỉ khi `canManageSchools`.
- `/admin/anh-truong`: `requireAdmin({ allowPhotographer: true })`, rồi nếu `user.role !== "PHOTOGRAPHER" || !user.photographerId` thì `redirect("/admin")`. Id thợ luôn là `user.photographerId`.

Ẩn nút chỉ là phụ; server action vẫn phải đi qua `requireReviewer` / `requireSchoolManager` / `requirePhotographer`, và service kiểm tra lại lần nữa.

Menu (layout) đã có ba mục mới và badge số ảnh chờ duyệt. Sau đăng nhập ai cũng về `/admin`; trang này giờ gọi `requireAdmin()` nên QC tự về `/admin/duyet-anh`, Photo về lịch.

### 3.4 Hằng số và hàm thuần (`@/lib/school-shared`, client dùng được)

```ts
MAX_FILES_PER_SUBMIT = 5; MAX_PENDING_PER_PHOTOGRAPHER = 10; LIVE_THRESHOLD = 4;
MAX_SHARE = 0.4; SHARE_RULE_MIN_PHOTOS = 3; ANGLE_NAME_MAX = 60; NOTE_MAX = 300;
REJECT_REASON_MIN = 3; REJECT_REASON_MAX = 300; MIN_YEAR = 2000;
KIND_LABEL: Record<ShotKind, string>              // "Cá nhân" | "Nhóm"
KIND_PARAM: Record<ShotKind, "ca-nhan" | "nhom">  // giá trị ?kieu=
kindFromParam(v: string | null | undefined): ShotKind | null
normalizeAngleName(s: string): string             // gộp khoảng trắng, trim
angleKey(s: string): string                       // bỏ dấu + thường hoá, để so trùng tên góc
schoolPhotoAlt(angleName, schoolName): string     // "Sảnh V tại Đại học Thương Mại"
shareText(name, mineAfter, totalAfter): string | null
shareWarningFrom(name, mineBefore, totalBefore): string | null
```

Luật 40%: chỉ cảnh báo khi trường có từ `SHARE_RULE_MIN_PHOTOS` (3) ảnh trở lên sau khi duyệt, vì ảnh đầu tiên của trường nào cũng là 100%.

### 3.5 Luật nghiệp vụ (`@/lib/school-service`, chỉ server)

Mọi hàm ném `SchoolError` (lớp con của `Error`) với chữ tiếng Việt cho người dùng đọc. Mẫu server action:

```ts
export async function submitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requirePhotographer();
    const { count } = await submitPhotos(user, {
      schoolId: String(formData.get("schoolId") ?? ""),
      angleId: String(formData.get("angleId") ?? ""),
      angleText: String(formData.get("angleText") ?? ""),
      year: String(formData.get("year") ?? ""),
      kind: String(formData.get("kind") ?? ""),
      note: String(formData.get("note") ?? ""),
      consent: formData.get("consent") === "on",
      files: formData.getAll("files").filter((f): f is File => f instanceof File),
    });
    return { error: "", ok: `Đã nộp ${count} ảnh, chờ QC duyệt.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Chưa nộp được." };
  }
}
```

Mọi hàm ghi đã tự ghi `audit_logs`, tự gọi `revalidateSchools()` khi trang khách đổi, và `revalidatePath("/admin", "layout")` để badge và các trang admin đổi. Server action không cần revalidate thêm.

```ts
type SubmissionFields = {
  schoolId: string;
  angleId?: string | null;     // góc chọn từ danh mục; có thì bỏ qua angleText
  angleText?: string | null;   // góc tự gõ; trùng không dấu với góc có sẵn thì tự dùng góc đó
  year: number | string;       // 2000 … năm nay + 1
  kind: ShotKind | string;     // "INDIVIDUAL" | "GROUP"
  note?: string | null;        // tối đa 300 ký tự
  consent: boolean;            // bắt buộc true; lưu consentAt = now, consentById = user.id
};
```

**Photo** (user phải là PHOTOGRAPHER có `photographerId`):

- `submitPhotos(user, input: SubmissionFields & { files: File[] }): Promise<{ count: number }>`
  1–5 file (file rỗng bị bỏ qua), JPEG/PNG/WebP/AVIF ≤ 20 MB. HEIC bị từ chối với câu "Ảnh HEIC cần được chuyển sang JPEG trước khi gửi, hãy tải lại trang và thử lại." Ảnh chờ duyệt hiện có + số file mới ≤ 10, vượt thì "Bạn đang có N ảnh chờ duyệt, tối đa 10. Đợi QC duyệt bớt rồi nộp tiếp." Xử lý tuần tự từng file vào `pending/<photographerId>/` (3 WebP + JPEG 800), mỗi file một bài nộp `PENDING`. Lỗi giữa chừng thì xoá file đã ghi, không tạo bài nào.
- `resubmitRejected(user, submissionId, fields: SubmissionFields, file?: File | null): Promise<void>`
  Chỉ bài `REJECTED` của chính mình → `PENDING`, xoá lý do trả. Có `file` thì thay ảnh (file cũ bị xoá). Tính vào giới hạn 10.
- `withdrawSubmission(user, submissionId): Promise<void>`
  Rút bài `PENDING` hoặc `REJECTED` của mình, xoá file. Bài `APPROVED` không rút được ("muốn gỡ thì nhắn QC").

Bài của Photo khác luôn báo "Không tìm thấy ảnh này", không lộ là có.

**QC / SALE / OWNER** (`canReview`):

- `approveSubmission(user, submissionId, input: { angleId?: string | null; newAngleName?: string | null }): Promise<{ photoId: string; wentLive: boolean; warning?: string }>`
  Phải có `angleId` (góc của đúng trường) hoặc `newAngleName` (trùng không dấu với góc có sẵn thì dùng góc đó, không thì tạo góc mới). Tạo `SchoolPhoto` cuối danh sách, chuyển file sang `schools/<schoolId>/`, bài nộp thành `APPROVED` và `path` của bài nộp trỏ sang chỗ mới. Trường chưa có bìa thì ảnh này làm bìa. Trường `SOON` đủ 4 ảnh thì thành `LIVE` (`wentLive: true`). `warning` khi Photo này chiếm quá 40% sau khi duyệt. Hai QC bấm cùng lúc: người sau nhận lỗi "vừa được người khác xử lý".
- `rejectSubmission(user, submissionId, reason: string): Promise<void>` — lý do 3–300 ký tự, bắt buộc.
- `shareWarning(schoolId, photographerId): Promise<string | null>` — cảnh báo 40% nếu duyệt thêm một ảnh. Hàng đợi đã có sẵn `warning` trong `listPendingSubmissions()`, thường không cần gọi.
- `removeSchoolPhoto(user, photoId): Promise<void>` — gỡ một bấm: xoá ảnh, file và bài nộp đã duyệt tương ứng. Đang là bìa thì ảnh kế tiếp làm bìa. Trường hết ảnh thì về `SOON`.
- `setCover(user, schoolId, photoId): Promise<void>` — ảnh phải thuộc trường.
- `createAngle(user, schoolId, name): Promise<{ id: string }>` — trùng không dấu thì báo lỗi.
- `renameAngle(user, angleId, name): Promise<void>` — trùng góc khác thì bảo gộp.
- `mergeAngles(user, fromId, intoId): Promise<{ moved: number }>` — cùng trường; chuyển ảnh và bài nộp sang `intoId`, xoá `fromId`.
- `deleteAngle(user, angleId): Promise<void>` — chỉ khi không có ảnh đã duyệt; bài nộp đang trỏ vào thì giữ tên góc dạng chữ (`angleText`).

**OWNER** (`canManageSchools`):

```ts
type SchoolInput = { name: string; short?: string; city?: string; slug?: string; intro?: string;
                     status?: "LIVE" | "SOON"; order?: number | string };
```

- `createSchool(user, input): Promise<{ id: string; slug: string }>` — slug trống thì sinh từ tên, trùng thì thêm `-2`; `order` trống thì đứng cuối.
- `updateSchool(user, schoolId, input): Promise<{ slug: string }>`
- `deleteSchool(user, schoolId): Promise<void>` — xoá cả góc, ảnh, bài nộp và file.

**Thống kê**: `recordStat(photographerId, type: "view" | "book"): Promise<void>`. Giao diện không gọi trực tiếp, đi qua endpoint ở 3.8.

### 3.6 Truy vấn (`@/lib/school-queries`, chỉ server)

Trang khách (không cần đăng nhập; chỉ ảnh đã duyệt của Photo đang `published`, bài nộp không bao giờ có mặt):

```ts
listSchoolsPublic(): Promise<{ live: PublicSchoolCard[]; soon: PublicSchoolCard[]; cities: string[] }>
type PublicSchoolCard = { id; slug; name; short; city; status: SchoolStatus;
  cover: { stem; width; height } | null; photoCount: number; photographerCount: number };

getSchoolPublic(slug): Promise<PublicSchoolDetail | null>
type PublicSchoolDetail = {
  id; slug; name; short; city; intro; status; cover: { stem; width; height } | null;
  photos: { id; stem; width; height; angle: { id; name }; photographerSlug: string;
            year: number; kind: ShotKind; note: string }[];        // theo thứ tự QC xếp
  photographers: Record<string /* slug */, { slug; name; tierName; priceFrom: number; avatar: string | null }>;
  angles: { id; name; count }[];   // nhiều ảnh trước
  years: number[];                 // mới nhất trước
  kinds: ShotKind[];
  stats: { photos; angles; photographers };   // "X ảnh · Y góc · Z Photo"
  updatedAt: Date;
};
listSchoolSlugs(): Promise<string[]>                                     // generateStaticParams
listSchoolsForSitemap(): Promise<{ slug: string; lastModified: Date }[]> // chỉ trường LIVE
```

`priceFrom` hiện bằng `money()` của `@/lib/pricing` (0 → "Liên hệ"). `avatar` là stem, dùng `photoSrc(avatar, 400)`. Trường `SOON` vẫn trả về từ `getSchoolPublic`; trang tự quyết (gợi ý: `notFound()` nếu `status === "SOON"` và `photos.length === 0`).

"Photo khác cũng chụp góc này (n)": lọc `photos` theo `angle.id`, lấy tập `photographerSlug` khác Photo của ảnh đang mở.

Form nộp và gợi ý góc:

```ts
listSchoolOptions(): Promise<{ id; name; short; city; angles: { id; name }[] }[]>  // mọi trường
```

Khu Photo:

```ts
getPhotographerSchoolDashboard(photographerId): Promise<{
  approved: number; pending: number; views: number; bookClicks: number; maxPending: number;
  submissions: { id; status: SubmissionStatus; stem; width; height;
    school: { id; name; short; slug }; angleId: string | null; angleName: string; angleText: string;
    year; kind; note; rejectReason: string; createdAt: Date; reviewedAt: Date | null }[];
    // PENDING + REJECTED (tất cả, mới sửa trước) rồi APPROVED gần nhất (tối đa 30)
}>
```

Luôn truyền `user.photographerId` lấy từ phiên.

Khu QC:

```ts
listPendingSubmissions(): Promise<{
  items: { id; stem; width; height; school: { id; name; short; slug };
    photographer: { id; name; slug }; angle: { id; name } | null; angleText: string;
    suggestedAngleId: string | null;   // góc chuẩn khớp chữ Photo gõ, để điền sẵn
    year; kind; note; createdAt: Date; warning: string | null }[];   // cũ nhất trước
  anglesBySchool: Record<string /* schoolId */, { id; name }[]>;   // gợi ý ô tên góc
}>
listSchoolsAdmin(): Promise<{ id; slug; name; short; city; status; order;
  cover: { stem; width; height } | null; photoCount; pendingCount; angleCount }[]>
getSchoolAdmin(id): Promise<{ id; slug; name; short; city; intro; status; order; coverPhotoId;
  angles: { id; name; photoCount; pendingCount }[];
  photos: { id; stem; width; height; angle: { id; name };
    photographer: { id; name; slug; published }; year; kind; note; sortOrder;
    approvedAt: Date; approvedBy: string; consentAt: Date | null; consentBy: string; isCover: boolean }[];
} | null>
```

### 3.7 Ảnh

- `@/lib/image-paths` (client dùng được): `photoSrc(stem, 400 | 800 | 1600)`, `photoSrcSet(stem)`, mới thêm `photoJpegSrc(stem)` (bản `-800.jpg`) và `JPEG_FALLBACK_WIDTH = 800`. Ảnh trường có JPEG fallback, ảnh portfolio thì không. Mẫu:
  ```tsx
  <picture>
    <source type="image/webp" srcSet={photoSrcSet(stem)} sizes="(min-width: 768px) 33vw, 50vw" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photoJpegSrc(stem)} alt={schoolPhotoAlt(angle.name, school.name)} width={width} height={height} loading="lazy" decoding="async" />
  </picture>
  ```
- Ảnh chờ duyệt (`pending/…`) xem bằng `photoSrc` như thường, nhưng route `/uploads` chỉ trả cho người đã đăng nhập admin (Photo chỉ thấy thư mục của mình), kèm `Cache-Control: private, no-store`. Người không đăng nhập nhận 404. Bài bị trả lại vẫn nằm ở `pending/`; bài đã duyệt có `stem` ở `schools/`, công khai.
- `@/lib/images` (chỉ server): `processImage(buf, { dir, id?, jpegFallback? })`, `pendingDir(photographerId)`, `schoolDir(schoolId)`, `moveImage(stem, toDir): Promise<string>`, `deleteImage(stem)` (xoá cả JPEG fallback), `assertAcceptableUpload(file)` (từ chối HEIC). Giao diện không cần gọi trực tiếp, service đã gọi.
- HEIC và ảnh nặng: form nộp của Photo phải chuyển HEIC sang JPEG và thu cạnh dài về tối đa 2560px **ở trình duyệt** trước khi gửi (gợi ý: `heic2any` bản UMD qua jsDelivr cho HEIC, `createImageBitmap` + canvas cho ảnh khác). Server action nhận tối đa 25 MB một lần (`next.config.ts`), nên 5 ảnh phải được nén trước, mỗi ảnh khoảng ≤ 4 MB.

### 3.8 Endpoint đếm `POST /api/truong/su-kien`

- Body JSON `{ "photoId": string, "type": "view" | "book" }`; `photoId` là id `SchoolPhoto`.
- Luôn trả `204`, không bao giờ báo lỗi. Bỏ qua nếu khác origin (phải có header `Origin` cùng host), UA là bot, body sai, ảnh không tồn tại hoặc Photo đang ẩn.
- Gửi `view` khi mở popup ảnh, `book` khi bấm Đặt (trong popup hoặc trong danh sách "Photo khác", kèm id ảnh đang mở). Dùng:
  ```ts
  navigator.sendBeacon("/api/truong/su-kien", JSON.stringify({ photoId, type }));
  ```
  hoặc `fetch("/api/truong/su-kien", { method: "POST", body, keepalive: true })`. Đếm theo ngày giờ Việt Nam vào `photographer_stats`.

### 3.9 Tin nhắn soạn sẵn (`@/lib/lead-message`)

`LeadDraft` thêm hai trường tuỳ chọn:

```ts
school?: { name: string } | null;
angle?: string;
```

Có `school` thì ngay dưới dòng Photo thêm `- Ảnh tham khảo: góc <angle> tại <school>`, hoặc `- Trường: <school>` nếu không có góc. Hàm vẫn thuần. Trang `/lien-he` cần đọc `?truong=<slug>&goc=<angleId>`, tra tên trường và tên góc ở server, truyền vào form, điền sẵn ô địa điểm cụ thể bằng tên trường và đưa `school`/`angle` vào draft. `POST /api/leads` nhận thêm `schoolSlug` và `angleId` (`lead-schema.ts`), tra lại tên ở server (góc phải thuộc đúng trường), đưa dòng trường vào tin báo Telegram và ghi vào ghi chú của sự kiện NEW trong lịch sử lead. Bảng `leads` chưa có cột trường riêng.

### 3.10 Làm mới trang khách

`revalidateSchools(slug?)` ở `@/lib/revalidate-public` làm mới `/`, `/truong`, `/sitemap.xml` và `/truong/<slug>` (hoặc mọi trang trường). `revalidatePublic()` giờ cũng làm mới `/truong` vì trang trường hiện tên, giá, avatar của Photo. Service đã tự gọi; trang `/truong` và `/truong/[slug]` chỉ cần đặt `revalidate` giống các trang khách khác.
