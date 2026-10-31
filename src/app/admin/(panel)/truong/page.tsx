import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Field, inputClass } from "@/components/admin/form-bits";
import { Photo } from "@/components/photo";
import { requireAdmin, canManageSchools } from "@/lib/admin-guard";
import { listSchoolsAdmin } from "@/lib/school-queries";
import { createSchoolAction } from "./actions";

export const metadata: Metadata = { title: "Trường và góc chụp" };
export const dynamic = "force-dynamic";

/** Danh sách trường. Ai vào admin được cũng xem; chỉ OWNER thấy form thêm trường. */
export default async function AdminSchoolsPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAdmin({ allowQc: true });
  const manage = canManageSchools(user.role);
  const [rows, sp] = await Promise.all([listSchoolsAdmin(), props.searchParams]);
  const live = rows.filter((s) => s.status === "LIVE").length;

  return (
    <div className="max-w-[960px]">
      <h1 className="font-serif text-[26px] font-semibold leading-tight">Trường và góc chụp</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        {rows.length} trường, {live} đang hiện. Trường “Sắp có ảnh” tự chuyển sang hiện chính khi đủ 4 ảnh đã duyệt.
      </p>

      {sp.deleted && (
        <p className="mt-3 rounded-xl border border-in-line bg-in-bg px-3.5 py-2.5 text-[13.5px] text-in-ink">
          Đã xoá trường cùng toàn bộ góc và ảnh.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-5 rounded-card border border-dashed border-line-2 px-4 py-8 text-center text-ink-2">
          Chưa có trường nào.{manage && " Thêm trường ở form phía dưới."}
        </p>
      ) : (
        <ul className="mt-5 grid gap-2.5">
          {rows.map((s) => (
            <li
              key={s.id}
              className="grid grid-cols-[56px_1fr] items-center gap-3 rounded-card border border-line bg-surface p-2.5 sm:grid-cols-[56px_1fr_auto]"
            >
              <div className="aspect-square w-14 overflow-hidden rounded-lg bg-sunk">
                {s.cover ? (
                  <Photo path={s.cover.stem} alt="" sizes="56px" fallbackWidth={400} className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-[11px] font-semibold text-ink-3">{s.short || "—"}</div>
                )}
              </div>

              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5">
                  {s.short && (
                    <span className="rounded-md bg-blue-soft px-1.5 py-0.5 text-[11px] font-semibold text-blue-deep">{s.short}</span>
                  )}
                  <Link href={`/admin/truong/${s.id}`} className="font-semibold hover:text-blue">
                    {s.name}
                  </Link>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      s.status === "LIVE" ? "border-in-line bg-in-bg text-in-ink" : "border-none-line bg-none-bg text-none-ink"
                    }`}
                  >
                    {s.status === "LIVE" ? "Đang hiện" : "Sắp có ảnh"}
                  </span>
                </p>
                <p className="truncate text-[12.5px] text-ink-2">
                  {s.city || "chưa ghi thành phố"} · {s.photoCount} ảnh · {s.angleCount} góc
                  {s.pendingCount > 0 && (
                    <>
                      {" · "}
                      <span className="font-medium text-extra-ink">{s.pendingCount} chờ duyệt</span>
                    </>
                  )}
                </p>
              </div>

              <Link
                href={`/admin/truong/${s.id}`}
                className="col-span-2 justify-self-start rounded-[10px] border border-line-2 px-3 py-2 text-[13.5px] font-medium hover:border-ink-3 sm:col-span-1 sm:justify-self-end"
              >
                Chi tiết
              </Link>
            </li>
          ))}
        </ul>
      )}

      {manage && (
        <section className="mt-6 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Thêm trường</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            Đường dẫn trang khách sinh tự động từ tên, sửa được sau ở trang chi tiết. Trường mới đứng cuối danh sách.
          </p>
          <ActionForm action={createSchoolAction} submitLabel="Thêm trường" className="mt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tên trường">
                <input name="name" required maxLength={120} placeholder="Đại học Thương Mại" className={inputClass} />
              </Field>
              <Field label="Mã trường" hint="Viết tắt hiện trên card, VD TMU, NEU">
                <input name="short" maxLength={16} placeholder="TMU" className={inputClass} />
              </Field>
              <Field label="Thành phố" hint="Dùng cho bộ lọc thành phố trên trang khách">
                <input name="city" maxLength={40} placeholder="Hà Nội" className={inputClass} />
              </Field>
              <Field label="Trạng thái">
                <select name="status" defaultValue="SOON" className={inputClass}>
                  <option value="SOON">Sắp có ảnh</option>
                  <option value="LIVE">Đang hiện</option>
                </select>
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Giới thiệu ngắn" hint="Hiện ở đầu trang trường. Tối đa 1200 ký tự.">
                <textarea name="intro" rows={3} maxLength={1200} className={inputClass} />
              </Field>
            </div>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
