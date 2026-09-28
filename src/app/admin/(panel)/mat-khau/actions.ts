"use server";

import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export type ActionState = { error: string; ok?: string };

/** Tự đổi mật khẩu, mọi vai kể cả thợ. Phải nhập đúng mật khẩu hiện tại. */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin({ allowPhotographer: true });
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8) return { error: "Mật khẩu mới cần ít nhất 8 ký tự." };
  if (next !== confirm) return { error: "Hai ô mật khẩu mới chưa giống nhau." };

  const row = await db.adminUser.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await compare(current, row.passwordHash))) return { error: "Mật khẩu hiện tại chưa đúng." };

  await db.adminUser.update({ where: { id: user.id }, data: { passwordHash: await hash(next, 10) } });
  await db.auditLog.create({ data: { actorId: user.id, entity: "admin_user", entityId: user.email, action: "changePassword" } });
  return { error: "", ok: "Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới." };
}
