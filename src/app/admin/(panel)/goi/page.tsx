import { ActionButton, ActionForm, Field, inputClass } from "@/components/admin/form-bits";
import { db } from "@/lib/db";
import { requireAdmin, canEdit } from "@/lib/admin-guard";
import { money } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { deleteTier, deleteZone, saveEveningAddon, saveGroupPrices, savePolicies, saveTier, saveZone } from "./actions";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const user = await requireAdmin();
  const editable = canEdit(user.role);

  const [tiers, zones, policies, settings] = await Promise.all([
    db.tier.findMany({
      orderBy: { order: "asc" },
      include: {
        groupPrices: { orderBy: { people: "asc" } },
        _count: { select: { photographers: true } },
      },
    }),
    db.travelZone.findMany({ orderBy: { order: "asc" } }),
    db.policy.findMany({ orderBy: { order: "asc" } }),
    getSettings(),
  ]);

  const maxPeople = settings.studio.maxPeople;
  const peopleRange = Array.from({ length: maxPeople - 1 }, (_, i) => i + 2);

  return (
    <div className="max-w-[960px]">
      <h1 className="font-serif text-[26px] font-semibold leading-tight">Gói chụp và bảng giá</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Mọi con số ở đây là giá tham khảo hiện trên trang khách. Thợ vẫn báo giá cuối khi khách nhắn.
      </p>

      {/* ---------------------------------------------------------------- hạng ekip */}
      <section className="mt-7">
        <h2 className="font-serif text-lg font-semibold">Hạng ekip và giá gói lẻ</h2>
        <p className="mt-0.5 text-[13px] text-ink-2">
          Giá gói lẻ là giá 1 người 1 buổi. Ẩn khỏi bảng giá dùng cho hạng nội bộ như Take Care hay Intern.
        </p>

        <div className="mt-3 grid gap-3">
          {tiers.map((t) => (
            <div key={t.id} className="rounded-card border border-line bg-surface p-4">
              <ActionForm action={saveTier} submitLabel="Lưu hạng">
                <input type="hidden" name="id" value={t.id} />
                <div className="grid gap-3 sm:grid-cols-[1fr_160px_1fr]">
                  <Field label="Tên hạng">
                    <input name="name" defaultValue={t.name} required className={inputClass} />
                  </Field>
                  <Field label="Giá gói lẻ (đ)">
                    <input name="basePrice" type="number" min={0} step={10000} defaultValue={t.basePrice} className={inputClass} />
                  </Field>
                  <Field label="Ghi chú hiện cho khách">
                    <input name="note" defaultValue={t.note} maxLength={200} className={inputClass} />
                  </Field>
                </div>
                <label className="mt-2 inline-flex items-center gap-1.5 text-[13.5px]">
                  <input type="checkbox" name="hiddenInTable" defaultChecked={t.hiddenInTable} className="size-4 accent-blue" />
                  Ẩn khỏi bảng giá công khai
                </label>
              </ActionForm>

              <details className="mt-3 rounded-xl bg-sunk p-3">
                <summary className="cursor-pointer text-[13.5px] font-medium">
                  Giá gói nhóm theo số người · {t.groupPrices.length ? `${t.groupPrices.length} mức` : "chưa có, khách thấy “Thợ báo giá”"}
                </summary>
                <ActionForm action={saveGroupPrices} submitLabel="Lưu giá nhóm" className="mt-2">
                  <input type="hidden" name="tierId" value={t.id} />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {peopleRange.map((n) => (
                      <Field key={n} label={`${n} người (đ)`}>
                        <input
                          name={`people:${n}`}
                          type="number"
                          min={0}
                          step={10000}
                          defaultValue={t.groupPrices.find((g) => g.people === n)?.price ?? ""}
                          placeholder="để trống"
                          className={inputClass}
                        />
                      </Field>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[12px] text-ink-3">Giá cho cả nhóm, không phải mỗi người. Ô trống hoặc 0 nghĩa là chưa có bảng giá cho mức đó.</p>
                </ActionForm>
              </details>

              <div className="mt-3 flex items-center justify-between text-[12.5px] text-ink-3">
                <span>{t._count.photographers} thợ đang ở hạng này</span>
                {editable && t._count.photographers === 0 && (
                  <ActionButton action={deleteTier.bind(null, t.id)} confirm={`Xoá hạng ${t.name}?`} tone="danger">
                    Xoá hạng
                  </ActionButton>
                )}
              </div>
            </div>
          ))}

          {editable && (
            <div className="rounded-card border border-dashed border-line-2 p-4">
              <ActionForm action={saveTier} submitLabel="Thêm hạng">
                <input type="hidden" name="id" value="" />
                <div className="grid gap-3 sm:grid-cols-[1fr_160px_1fr]">
                  <Field label="Tên hạng mới">
                    <input name="name" required placeholder="Ekip 4" className={inputClass} />
                  </Field>
                  <Field label="Giá gói lẻ (đ)">
                    <input name="basePrice" type="number" min={0} step={10000} defaultValue={0} className={inputClass} />
                  </Field>
                  <Field label="Ghi chú">
                    <input name="note" className={inputClass} />
                  </Field>
                </div>
              </ActionForm>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- phụ phí tối */}
      <section className="mt-9 rounded-card border border-line bg-surface p-4">
        <h2 className="font-serif text-lg font-semibold">Chụp thêm buổi tối đến 20h</h2>
        <ActionForm action={saveEveningAddon} submitLabel="Lưu">
          <div className="mt-2 max-w-[240px]">
            <Field label="Phụ phí (đ)">
              <input name="eveningAddon" type="number" min={0} step={10000} defaultValue={settings.pricing.eveningAddon} className={inputClass} />
            </Field>
          </div>
        </ActionForm>
      </section>

      {/* ---------------------------------------------------------------- phụ phí tỉnh */}
      <section className="mt-9">
        <h2 className="font-serif text-lg font-semibold">Phụ phí di chuyển theo địa điểm</h2>
        <p className="mt-0.5 text-[13px] text-ink-2">
          Mức cho 1 thợ. Mức cao nhất để 0 nếu chỉ có một con số. Hiện tại {zones.length} địa điểm.
        </p>
        <div className="mt-3 grid gap-2.5">
          {zones.map((z) => (
            <div key={z.id} className="rounded-card border border-line bg-surface p-3.5">
              <ActionForm action={saveZone} submitLabel="Lưu">
                <input type="hidden" name="id" value={z.id} />
                <div className="grid gap-2.5 sm:grid-cols-[1.2fr_140px_140px_1.6fr]">
                  <Field label="Địa điểm">
                    <input name="name" defaultValue={z.name} required className={inputClass} />
                  </Field>
                  <Field label="Thấp nhất (đ)">
                    <input name="minFee" type="number" min={0} step={10000} defaultValue={z.minFee} className={inputClass} />
                  </Field>
                  <Field label="Cao nhất (đ)">
                    <input name="maxFee" type="number" min={0} step={10000} defaultValue={z.maxFee || ""} placeholder="0" className={inputClass} />
                  </Field>
                  <Field label="Ghi chú">
                    <input name="note" defaultValue={z.note} maxLength={300} className={inputClass} />
                  </Field>
                </div>
              </ActionForm>
              <div className="mt-2 flex items-center justify-between text-[12.5px] text-ink-3">
                <span>Hiện: {money(z.minFee)}{z.maxFee > z.minFee ? ` - ${money(z.maxFee)}` : ""}</span>
                {editable && (
                  <ActionButton action={deleteZone.bind(null, z.id)} confirm={`Xoá ${z.name}?`} tone="danger">
                    Xoá
                  </ActionButton>
                )}
              </div>
            </div>
          ))}
          {editable && (
            <div className="rounded-card border border-dashed border-line-2 p-3.5">
              <ActionForm action={saveZone} submitLabel="Thêm địa điểm">
                <input type="hidden" name="id" value="" />
                <div className="grid gap-2.5 sm:grid-cols-[1.2fr_140px_140px_1.6fr]">
                  <Field label="Địa điểm mới">
                    <input name="name" required placeholder="Hưng Yên" className={inputClass} />
                  </Field>
                  <Field label="Thấp nhất (đ)">
                    <input name="minFee" type="number" min={0} step={10000} className={inputClass} />
                  </Field>
                  <Field label="Cao nhất (đ)">
                    <input name="maxFee" type="number" min={0} step={10000} placeholder="0" className={inputClass} />
                  </Field>
                  <Field label="Ghi chú">
                    <input name="note" className={inputClass} />
                  </Field>
                </div>
              </ActionForm>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- chính sách */}
      <section className="mt-9 rounded-card border border-line bg-surface p-4">
        <h2 className="font-serif text-lg font-semibold">Chính sách đi tỉnh</h2>
        <p className="mt-0.5 text-[13px] text-ink-2">Mỗi dòng là một chính sách, hiện dưới bảng phụ phí.</p>
        <ActionForm action={savePolicies} submitLabel="Lưu chính sách">
          <textarea
            name="policies"
            rows={Math.max(4, policies.length + 1)}
            defaultValue={policies.map((p) => p.text).join("\n")}
            className={`${inputClass} mt-2 resize-y leading-relaxed`}
          />
        </ActionForm>
      </section>
    </div>
  );
}
