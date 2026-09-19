import { ActionForm, Field, inputClass } from "@/components/admin/form-bits";
import { savePhotographer } from "./actions";

export type FormOptions = {
  tiers: { id: string; name: string; basePrice: number }[];
  tags: { id: string; name: string }[];
  features: { id: string; label: string }[];
};

export type PhotographerFormValue = {
  id: string;
  name: string;
  tierId: string;
  city: string;
  style: string;
  bio: string;
  rating: number;
  sessions: number;
  priceOverride: number;
  driveUrl: string;
  zalo: string;
  phone: string;
  facebook: string;
  instagram: string;
  published: boolean;
  isSample: boolean;
  tagIds: string[];
  features: Record<string, string>;
};

const FEATURE_STATUS = [
  ["IN", "Có sẵn trong gói"],
  ["EXTRA", "Có, tính thêm phí"],
  ["NO", "Không có"],
] as const;

/**
 * Server component: chỉ dựng JSX, còn state của form nằm trong ActionForm.
 * Dùng chung cho tạo mới và sửa.
 */
export function PhotographerForm({ value, options }: { value: PhotographerFormValue; options: FormOptions }) {
  return (
    <ActionForm action={savePhotographer} submitLabel={value.id ? "Lưu thay đổi" : "Tạo thợ"}>
      <input type="hidden" name="id" value={value.id} />

      <div className="grid gap-4">
        <section className="grid gap-3 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Thông tin</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên hiển thị">
              <input name="name" defaultValue={value.name} required maxLength={60} className={inputClass} />
            </Field>
            <Field label="Hạng ekip">
              <select name="tierId" defaultValue={value.tierId} className={inputClass}>
                {options.tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.basePrice.toLocaleString("vi-VN")}đ
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Khu vực">
              <input name="city" defaultValue={value.city} required maxLength={40} placeholder="Hà Nội" className={inputClass} />
            </Field>
            <Field label="Giá riêng (đ)" hint="Để trống thì theo giá hạng">
              <input name="priceOverride" type="number" min={0} step={1000} defaultValue={value.priceOverride || ""} className={inputClass} />
            </Field>
            <Field label="Điểm đánh giá (0–5)">
              <input name="rating" type="number" min={0} max={5} step={0.1} defaultValue={value.rating} className={inputClass} />
            </Field>
            <Field label="Số buổi đã chụp">
              <input name="sessions" type="number" min={0} step={1} defaultValue={value.sessions} className={inputClass} />
            </Field>
          </div>
          <Field label="Câu mô tả phong cách">
            <input name="style" defaultValue={value.style} maxLength={160} placeholder="Tone pastel, nhẹ nhàng" className={inputClass} />
          </Field>
          <Field label="Giới thiệu dài (tuỳ chọn)">
            <textarea name="bio" defaultValue={value.bio} rows={3} maxLength={1000} className={`${inputClass} resize-y`} />
          </Field>
          <Field label="Link Google Drive album đầy đủ" hint='Nhớ bật "Bất kỳ ai có đường liên kết" trên Drive'>
            <input name="driveUrl" type="url" defaultValue={value.driveUrl} placeholder="https://drive.google.com/…" className={inputClass} />
          </Field>
        </section>

        <section className="grid gap-3 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Kênh liên hệ của thợ</h2>
          <p className="text-[13px] text-ink-2">
            Khách bấm nút liên hệ trên trang thợ sẽ nhắn thẳng vào đây. Ô nào trống thì dùng kênh chung của studio.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Zalo (số điện thoại)">
              <input name="zalo" defaultValue={value.zalo} inputMode="tel" placeholder="0961 120 879" className={inputClass} />
            </Field>
            <Field label="Số gọi điện">
              <input name="phone" defaultValue={value.phone} inputMode="tel" placeholder="0961 120 879" className={inputClass} />
            </Field>
            <Field label="Facebook / Messenger" hint="Link trang cá nhân hoặc m.me/…">
              <input name="facebook" type="url" defaultValue={value.facebook} placeholder="https://www.facebook.com/…" className={inputClass} />
            </Field>
            <Field label="Instagram">
              <input name="instagram" type="url" defaultValue={value.instagram} placeholder="https://www.instagram.com/…" className={inputClass} />
            </Field>
          </div>
        </section>

        <section className="grid gap-3 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Nhận chụp</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {options.tags.map((t) => (
              <label key={t.id} className="inline-flex items-center gap-1.5 text-[13.5px]">
                <input type="checkbox" name="tagIds" value={t.id} defaultChecked={value.tagIds.includes(t.id)} className="size-4 accent-blue" />
                {t.name}
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-2 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Dịch vụ đi kèm</h2>
          {options.features.map((f) => (
            <div key={f.id} className="grid grid-cols-[1fr_180px] items-center gap-2 text-[13.5px]">
              <span>{f.label}</span>
              <select name={`feature:${f.id}`} defaultValue={value.features[f.id] ?? "NO"} className={inputClass}>
                {FEATURE_STATUS.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </section>

        <section className="flex flex-wrap gap-x-5 gap-y-2 rounded-card border border-line bg-surface p-4 text-[13.5px]">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" name="published" defaultChecked={value.published} className="size-4 accent-blue" />
            Hiện trên trang khách
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" name="isSample" defaultChecked={value.isSample} className="size-4 accent-blue" />
            Đánh dấu là dữ liệu mẫu
          </label>
        </section>
      </div>
    </ActionForm>
  );
}
