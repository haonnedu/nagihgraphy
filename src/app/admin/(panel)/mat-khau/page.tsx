import { ActionForm, Field, inputClass } from "@/components/admin/form-bits";
import { requireAdmin } from "@/lib/admin-guard";
import { changePassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requireAdmin({ allowPhotographer: true });

  return (
    <div className="max-w-[440px]">
      <h1 className="font-serif text-[26px] font-semibold leading-tight">Đổi mật khẩu</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">Tài khoản {user.email}. Đổi ngay nếu bạn vừa nhận mật khẩu tạm.</p>

      <ActionForm action={changePassword} submitLabel="Đổi mật khẩu" resetOnOk className="mt-5 grid gap-3 rounded-card border border-line bg-surface p-4">
        <Field label="Mật khẩu hiện tại">
          <input name="current" type="password" required autoComplete="current-password" className={inputClass} />
        </Field>
        <Field label="Mật khẩu mới" hint="Ít nhất 8 ký tự">
          <input name="next" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </Field>
        <Field label="Nhập lại mật khẩu mới">
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </Field>
      </ActionForm>
    </div>
  );
}
