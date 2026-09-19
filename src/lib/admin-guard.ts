import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AdminRole } from "@/generated/prisma/enums";

export type AdminUser = { id: string; email: string; name: string; role: AdminRole };

/**
 * Gọi ở đầu mọi layout, page và server action của admin.
 * Chưa đăng nhập thì chuyển về trang login. Không dùng middleware để khỏi
 * kéo Prisma vào edge runtime.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
  };
}

/** OWNER và SALE được sửa. VIEWER chỉ xem. */
export function canEdit(role: AdminRole): boolean {
  return role === "OWNER" || role === "SALE";
}

/** Dùng trong server action: ném lỗi thay vì redirect để form hiển thị được. */
export async function requireEditor(): Promise<AdminUser> {
  const user = await requireAdmin();
  if (!canEdit(user.role)) throw new Error("Tài khoản này chỉ có quyền xem.");
  return user;
}
