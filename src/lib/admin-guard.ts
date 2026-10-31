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

/**
 * Lỗi phiên hoặc quyền do các hàm require… ném trong server action. Chữ tiếng
 * Việt, đưa thẳng ra form được; lỗi khác (DB…) thì action chỉ ghi log.
 */
export class GuardError extends Error {}

/** Đường dẫn duy nhất của thợ trong admin. */
export const PHOTOGRAPHER_HOME = "/admin/lich/toi";

/** Trang đầu của QC. QC vào trang admin khác thì bị đẩy về đây. */
export const QC_HOME = "/admin/duyet-anh";

/** Đọc phiên đăng nhập thành AdminUser, null nếu chưa đăng nhập. */
async function sessionUser(): Promise<AdminUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
    photographerId: session.user.photographerId ?? null,
  };
}

/**
 * Gọi ở đầu mọi layout, page và server action của admin.
 * Chưa đăng nhập thì chuyển về trang login. Không dùng middleware để khỏi
 * kéo Prisma vào edge runtime.
 *
 * Mặc định CHẶN vai thợ và vai QC, đẩy về trang đầu của họ, nên mọi trang
 * admin viết trước đây tự an toàn mà không phải sửa. Trang nào thợ được vào
 * thì truyền allowPhotographer, trang nào QC được vào thì truyền allowQc.
 * QC chỉ được vào /admin/duyet-anh, /admin/truong/** và /admin/mat-khau.
 */
export async function requireAdmin(
  opts: { allowPhotographer?: boolean; allowQc?: boolean } = {},
): Promise<AdminUser> {
  const user = await sessionUser();
  if (!user) redirect("/admin/login");
  if (user.role === "PHOTOGRAPHER" && !opts.allowPhotographer) redirect(PHOTOGRAPHER_HOME);
  if (user.role === "QC" && !opts.allowQc) redirect(QC_HOME);
  return user;
}

/**
 * Nhân sự studio dùng menu quản trị đầy đủ: OWNER, SALE, VIEWER.
 * Thợ và QC có menu riêng, ít mục hơn.
 */
export function isStaff(role: AdminRole): boolean {
  return role === "OWNER" || role === "SALE" || role === "VIEWER";
}

/** Ai được duyệt, trả, gỡ ảnh trường và sửa danh mục góc: OWNER, SALE, QC. */
export function canReview(role: AdminRole): boolean {
  return role === "OWNER" || role === "SALE" || role === "QC";
}

/** Thêm, sửa, xoá trường và sửa giới thiệu trường: chỉ OWNER. */
export function canManageSchools(role: AdminRole): boolean {
  return role === "OWNER";
}

/** Server action duyệt ảnh trường: ném lỗi thay vì redirect để form hiện được. */
export async function requireReviewer(): Promise<AdminUser> {
  const user = await sessionUser();
  if (!user) throw new GuardError("Phiên đăng nhập đã hết, tải lại trang.");
  if (!canReview(user.role)) throw new GuardError("Tài khoản này không được duyệt ảnh trường.");
  return user;
}

/** Server action thêm, sửa, xoá trường: chỉ OWNER. Ném lỗi thay vì redirect. */
export async function requireSchoolManager(): Promise<AdminUser> {
  const user = await sessionUser();
  if (!user) throw new GuardError("Phiên đăng nhập đã hết, tải lại trang.");
  if (!canManageSchools(user.role)) throw new GuardError("Chỉ chủ studio được thêm, sửa hoặc xoá trường.");
  return user;
}

/**
 * Server action của Photo (nộp ảnh trường…): phải là tài khoản Photo có gắn
 * thợ. Id thợ lấy từ phiên, không bao giờ từ form.
 */
export async function requirePhotographer(): Promise<AdminUser & { photographerId: string }> {
  const user = await sessionUser();
  if (!user) throw new GuardError("Phiên đăng nhập đã hết, tải lại trang.");
  if (user.role !== "PHOTOGRAPHER" || !user.photographerId) throw new GuardError("Chỉ tài khoản Photo được làm việc này.");
  return { ...user, photographerId: user.photographerId };
}

/** OWNER và SALE được sửa. VIEWER chỉ xem. Thợ không sửa gì ngoài lịch của mình. */
export function canEdit(role: AdminRole): boolean {
  return role === "OWNER" || role === "SALE";
}

/** Dùng trong server action: ném lỗi thay vì redirect để form hiển thị được. */
export async function requireEditor(): Promise<AdminUser> {
  const user = await requireAdmin();
  if (!canEdit(user.role)) throw new GuardError("Tài khoản này chỉ có quyền xem.");
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

/**
 * Ai được sửa hồ sơ ngoài site và ảnh của thợ nào. Thợ: chỉ chính mình.
 * OWNER và SALE: mọi thợ. VIEWER: không. Cùng luật với lịch.
 */
export async function requireProfileEditor(photographerId: string): Promise<AdminUser> {
  return requireScheduleEditor(photographerId);
}

/** Server action của lịch: đăng nhập rồi kiểm tra quyền trên đúng thợ đó. */
export async function requireScheduleEditor(photographerId: string): Promise<AdminUser> {
  const user = await sessionUser();
  if (!user) throw new GuardError("Phiên đăng nhập đã hết, tải lại trang.");
  if (!canEditSchedule(user, photographerId)) throw new GuardError("Bạn không có quyền sửa lịch này.");
  return user;
}
