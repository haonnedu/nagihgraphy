import { ActionButton, ActionForm, Field, inputClass } from "@/components/admin/form-bits";
import { Photo } from "@/components/photo";
import { db } from "@/lib/db";
import { requireAdmin, canEdit } from "@/lib/admin-guard";
import { getSettings } from "@/lib/settings";
import { clearHero, setHeroFromPhoto, uploadHero } from "./actions";

export const dynamic = "force-dynamic";

export default async function HeroPage() {
  const user = await requireAdmin();
  const editable = canEdit(user.role);

  const [settings, photos] = await Promise.all([
    getSettings(),
    db.photo.findMany({
      orderBy: [{ photographer: { order: "asc" } }, { order: "asc" }],
      select: { id: true, path: true, width: true, height: true, photographer: { select: { name: true, published: true } } },
    }),
  ]);

  const current = settings.hero.stem;
  const fallback = photos.find((p) => p.photographer.published) ?? null;
  const shownStem = current || fallback?.path || "";

  return (
    <div className="max-w-[960px]">
      <h1 className="font-serif text-[26px] font-semibold leading-tight">Ảnh hero trang chủ</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Ảnh tràn màn ở đầu trang chủ, chữ đè lên. Nên chọn ảnh ngang hoặc ảnh có nhiều nền, rộng từ 1600px trở lên.
      </p>

      <section className="mt-5 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Đang dùng</h2>
        {shownStem ? (
          <div className="mt-2 overflow-hidden rounded-xl bg-sunk">
            <Photo path={shownStem} alt="" sizes="900px" fallbackWidth={1600} className="aspect-[16/9] w-full object-cover" />
          </div>
        ) : (
          <p className="mt-2 text-[13.5px] text-ink-2">Chưa có ảnh nào. Upload ảnh cho một thợ hoặc upload ảnh hero riêng.</p>
        )}
        <p className="mt-2 text-[13px] text-ink-2">
          {current
            ? current.startsWith("brand/")
              ? "Ảnh upload riêng cho hero."
              : "Đang lấy từ ảnh portfolio."
            : "Chưa chọn, trang chủ tự lấy ảnh portfolio đầu tiên. Ảnh trên là ảnh đang hiện."}
        </p>
        {editable && current && (
          <div className="mt-3">
            <ActionButton action={clearHero} confirm="Bỏ chọn ảnh hero? Trang chủ sẽ lấy ảnh portfolio đầu tiên." tone="ghost">
              Bỏ chọn
            </ActionButton>
          </div>
        )}
      </section>

      {editable && (
        <section className="mt-5 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Upload ảnh hero riêng</h2>
          <ActionForm action={uploadHero} submitLabel="Đặt làm hero" resetOnOk className="mt-2 grid gap-3">
            <Field label="Ảnh" hint="JPEG hoặc PNG, dưới 20 MB. Server tự resize.">
              <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required className={inputClass} />
            </Field>
            <Field label="Mô tả ngắn cho người khiếm thị (tuỳ chọn)">
              <input name="alt" maxLength={120} placeholder="Nhóm bạn chụp kỷ yếu ở sân trường" className={inputClass} />
            </Field>
          </ActionForm>
        </section>
      )}

      <section className="mt-5">
        <h2 className="font-serif text-lg font-semibold">Hoặc chọn từ ảnh portfolio</h2>
        <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
          {photos.map((ph) => {
            const active = ph.path === current;
            return (
              <li key={ph.id} className={`overflow-hidden rounded-lg border bg-sunk ${active ? "border-blue ring-2 ring-blue-soft" : "border-line"}`}>
                <Photo path={ph.path} alt="" sizes="160px" fallbackWidth={400} className="aspect-3/4 w-full object-cover" />
                <div className="flex items-center justify-between gap-1 p-1.5 text-[11px]">
                  <span className="truncate text-ink-2">
                    {ph.photographer.name} · {ph.width}px
                  </span>
                  {editable && !active && <ActionButton action={setHeroFromPhoto.bind(null, ph.id)}>Dùng</ActionButton>}
                  {active && <span className="font-semibold text-blue">Đang dùng</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
