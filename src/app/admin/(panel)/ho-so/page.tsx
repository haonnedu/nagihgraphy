import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field, inputClass } from "@/components/admin/form-bits";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { money } from "@/lib/pricing";
import { loadFormOptions } from "../tho/options";
import { PhotoManager } from "../tho/photo-manager";
import { saveOwnProfile } from "./actions";

export const dynamic = "force-dynamic";

const FEATURE_STATUS = [
  ["IN", "Có sẵn trong gói"],
  ["EXTRA", "Có, tính thêm phí"],
  ["NO", "Không có"],
] as const;

/**
 * Hồ sơ ngoài site của chính Photo đang đăng nhập. Id lấy từ phiên.
 * Nhân sự studio mở trang này thì chuyển sang danh sách Photo.
 */
export default async function OwnProfilePage() {
  const user = await requireAdmin({ allowPhotographer: true });
  if (!user.photographerId) redirect("/admin/tho");

  const [p, options] = await Promise.all([
    db.photographer.findUnique({
      where: { id: user.photographerId },
      include: {
        tier: { select: { name: true, basePrice: true, fullDayPrice: true } },
        photos: { orderBy: { order: "asc" }, select: { id: true, path: true, width: true, height: true } },
        tags: { select: { tagId: true } },
        features: { select: { featureId: true, status: true } },
      },
    }),
    loadFormOptions(),
  ]);
  if (!p) redirect("/admin/login");

  const tagIds = p.tags.map((t) => t.tagId);
  const features = Object.fromEntries(p.features.map((f) => [f.featureId, f.status]));

  return (
    <div className="max-w-[880px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold leading-tight">Hồ sơ của {p.name}</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Đây là những gì khách thấy ở trang của bạn. Lưu là đổi ngay ngoài site.
          </p>
        </div>
        <Link href={`/tho/${p.slug}`} target="_blank" className="text-[13px] text-ink-2 hover:text-blue">
          Xem trang của bạn ↗
        </Link>
      </div>

      {!p.published && (
        <p className="mt-3 rounded-xl border border-extra-line bg-extra-bg px-3.5 py-2.5 text-[13px] text-extra-ink">
          Trang của bạn đang ẩn ngoài site. Studio bật lại trong mục Photo.
        </p>
      )}

      <p className="mt-3 rounded-xl border border-line bg-sunk px-3.5 py-2.5 text-[13px] text-ink-2">
        Studio quyết định: biệt danh <b className="font-semibold">{p.name}</b>, hạng <b className="font-semibold">{p.tier.name}</b>, giá từ{" "}
        <b className="font-semibold">{money(p.priceOverride > 0 ? p.priceOverride : p.tier.basePrice)}</b>, điểm và số buổi. Cần đổi thì nhắn
        studio.
      </p>

      <div className="mt-5 grid gap-5">
        <PhotoManager photographerId={p.id} photos={p.photos} />

        <ActionForm action={saveOwnProfile} submitLabel="Lưu hồ sơ" className="grid gap-5">
          <section className="grid gap-3 rounded-card border border-line bg-surface p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Về bạn</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tên thật" hint="Chỉ hiện trong admin và lịch">
                <input name="realName" defaultValue={p.realName} maxLength={80} className={inputClass} />
              </Field>
              <Field label="Khu vực">
                <input name="city" defaultValue={p.city} required maxLength={40} placeholder="Hà Nội" className={inputClass} />
              </Field>
            </div>
            <Field label="Câu mô tả phong cách" hint="Hiện ngay dưới tên bạn ngoài site">
              <input name="style" defaultValue={p.style} maxLength={160} placeholder="Tone pastel, nhẹ nhàng" className={inputClass} />
            </Field>
            <Field label="Giới thiệu dài (tuỳ chọn)">
              <textarea name="bio" defaultValue={p.bio} rows={3} maxLength={1000} className={`${inputClass} resize-y`} />
            </Field>
            <Field label="Link Google Drive album đầy đủ" hint='Nhớ bật "Bất kỳ ai có đường liên kết" trên Drive'>
              <input name="driveUrl" type="url" defaultValue={p.driveUrl} placeholder="https://drive.google.com/…" className={inputClass} />
            </Field>
          </section>

          <section className="grid gap-3 rounded-card border border-line bg-surface p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Nhận chụp</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {options.tags.map((t) => (
                <label key={t.id} className="inline-flex items-center gap-1.5 text-[13.5px]">
                  <input type="checkbox" name="tagIds" value={t.id} defaultChecked={tagIds.includes(t.id)} className="size-4 accent-blue" />
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
                <select name={`feature:${f.id}`} defaultValue={features[f.id] ?? "NO"} className={inputClass}>
                  {FEATURE_STATUS.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </section>
        </ActionForm>
      </div>
    </div>
  );
}
