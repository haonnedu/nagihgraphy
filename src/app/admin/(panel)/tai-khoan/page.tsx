import { ActionForm, Field, inputClass } from "@/components/admin/form-bits";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { createAccount, resetPassword, setActive } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Chủ studio",
  SALE: "Sale",
  VIEWER: "Chỉ xem",
  PHOTOGRAPHER: "Photo",
};

/** Danh sách tài khoản và form tạo tài khoản thợ. Xem PLAN.md mục 11. */
export default async function AccountsPage() {
  const user = await requireAdmin();
  const manager = user.role === "OWNER" || user.role === "SALE";

  const [users, photographers] = await Promise.all([
    db.adminUser.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        photographer: { select: { id: true, name: true } },
      },
    }),
    db.photographer.findMany({
      where: { user: null },
      orderBy: [{ tier: { order: "asc" } }, { order: "asc" }],
      select: { id: true, name: true, realName: true, tier: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="max-w-[880px]">
      <h1 className="font-serif text-[26px] font-semibold leading-tight">Tài khoản</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Mỗi Photo một tài khoản, chỉ thấy lịch của chính mình. Photo nghỉ thì khoá, lịch cũ vẫn giữ. Mật khẩu tạm chỉ hiện một lần ngay
        sau khi tạo hoặc cấp lại.
      </p>

      {manager ? (
        <section className="mt-5 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Tạo tài khoản</h2>
          <ActionForm action={createAccount} submitLabel="Tạo và lấy mật khẩu tạm" resetOnOk className="mt-3 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Loại tài khoản">
                <select name="role" defaultValue="PHOTOGRAPHER" className={inputClass}>
                  <option value="PHOTOGRAPHER">Photo</option>
                  {user.role === "OWNER" && (
                    <>
                      <option value="SALE">Sale</option>
                      <option value="VIEWER">Chỉ xem</option>
                      <option value="OWNER">Chủ studio</option>
                    </>
                  )}
                </select>
              </Field>
              <Field label="Photo (bắt buộc với tài khoản Photo)" hint={photographers.length ? undefined : "Mọi Photo đều đã có tài khoản."}>
                <select name="photographerId" defaultValue="" className={inputClass}>
                  <option value="">Chọn Photo…</option>
                  {photographers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.realName ? ` · ${p.realName}` : ""} · {p.tier.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Email đăng nhập" hint="Không cần email thật, chỉ cần không trùng. Web không gửi thư.">
                <input name="email" type="email" required placeholder="tiger@nagihgraphy.com" className={inputClass} />
              </Field>
              <Field label="Tên hiển thị" hint="Trống thì lấy tên Photo">
                <input name="name" maxLength={80} className={inputClass} />
              </Field>
            </div>
          </ActionForm>
        </section>
      ) : (
        <p className="mt-4 rounded-xl border border-line bg-sunk px-3.5 py-3 text-[13.5px] text-ink-2">Tài khoản của bạn chỉ xem.</p>
      )}

      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold">
          {users.length} tài khoản
        </h2>
        <ul className="mt-3 grid gap-2">
          {users.map((u) => {
            const own = u.id === user.id;
            const canTouch = manager && !own && (user.role === "OWNER" || u.role === "PHOTOGRAPHER");
            return (
              <li key={u.id} className={`rounded-card border border-line bg-surface p-3.5 ${u.active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {u.name || u.email}
                      {own && <span className="ml-1.5 text-[11px] font-medium text-ink-3">(bạn)</span>}
                    </p>
                    <p className="truncate text-[12.5px] text-ink-2">{u.email}</p>
                    <p className="text-[12px] text-ink-3">
                      {ROLE_LABEL[u.role] ?? u.role}
                      {u.photographer && ` · Photo ${u.photographer.name}`}
                      {!u.active && " · đã khoá"}
                    </p>
                  </div>
                  {canTouch && (
                    <div className="flex flex-wrap items-center gap-2">
                      <ActionForm action={resetPassword} submitLabel="Cấp lại mật khẩu" className="inline">
                        <input type="hidden" name="id" value={u.id} />
                      </ActionForm>
                      <ActionForm action={setActive} submitLabel={u.active ? "Khoá" : "Mở khoá"} className="inline">
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="active" value={u.active ? "0" : "1"} />
                      </ActionForm>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
