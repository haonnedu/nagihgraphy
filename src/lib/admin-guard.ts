import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AdminRole } from "@/generated/prisma/enums";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  /** chỉ có khi role là PHOTOGRAPHER */
  photographerId: string | null;
};

/** Đường dẫn duy nhất của thợ trong admin. */
export const PHOTOGRAPHER_HOME = "/admin/lich/toi";

/**
 * Gọi ở đầu mọi layout, page và server action của admin.
 * Chưa đăng nhập thì chuyển về trang login. Không dùng middleware để khỏi
 * kéo Prisma vào edge runtime.
 *
 * Mặc định CHẶN vai thợ và đẩy về trang lịch của họ, nên mọi trang admin
 * viết trước đây tự an toàn mà không phải sửa. Trang nào thợ được vào thì
 * truyền allowPhotographer.
 */
export async function requireAdmin(opts: { allowPhotographer?: boolean } = {}): Promise<AdminUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");
  const user: AdminUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
    photographerId: session.user.photographerId ?? null,
  };
  if (user.role === "PHOTOGRAPHER" && !opts.allowPhotographer) redirect(PHOTOGRAPHER_HOME);
  return user;
}

/** Nhân sự studio: OWNER, SALE, VIEWER. Thợ không phải nhân sự. */
export function isStaff(role: AdminRole): boolean {
  return role !== "PHOTOGRAPHER";
}

/** OWNER và SALE được sửa. VIEWER chỉ xem. Thợ không sửa gì ngoài lịch của mình. */
export function canEdit(role: AdminRole): boolean {
  return role === "OWNER" || role === "SALE";
}

/** Dùng trong server action: ném lỗi thay vì redirect để form hiển thị được. */
export async function requireEditor(): Promise<AdminUser> {
  const user = await requireAdmin();
  if (!canEdit(user.role)) throw new Error("Tài khoản này chỉ có quyền xem.");
  return user;
}

/**
 * Ai được sửa lịch của thợ nào. Thợ: chỉ chính mình, so bằng id trong phiên.
 * OWNER và SALE: mọi thợ. VIEWER: không.
 */
export function canEditSchedule(user: AdminUser, photographerId: string): boolean {
  if (user.role === "PHOTOGRAPHER") return user.photographerId === photographerId;
  return canEdit(user.role);
}

/** Server action của lịch: đăng nhập rồi kiểm tra quyền trên đúng thợ đó. */
export async function requireScheduleEditor(photographerId: string): Promise<AdminUser> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Phiên đăng nhập đã hết, tải lại trang.");
  const user: AdminUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
    photographerId: session.user.photographerId ?? null,
  };
  if (!canEditSchedule(user, photographerId)) throw new Error("Bạn không có quyền sửa lịch này.");
  return user;
}
