"use server";

import { requireReviewer } from "@/lib/admin-guard";
import { approveSubmission, rejectSubmission, schoolActionError } from "@/lib/school-service";
import type { ActionState } from "@/components/admin/form-bits";

/** Kết quả duyệt: thêm cảnh báo 40% để hàng đợi hiện thành thông báo sau khi thẻ biến mất. */
export type ApproveState = ActionState & { warning?: string };

/** Chỉ đưa ra chữ của lỗi nghiệp vụ và lỗi quyền; lỗi khác (DB…) chỉ ghi log. */
const messageOf = schoolActionError;

/**
 * Duyệt một ảnh với tên góc QC đã chốt. Không tự so tên ở đây: service tự tìm
 * góc trùng (không dấu, không hoa thường) và chỉ tạo góc mới khi chưa có.
 */
export async function approveAction(submissionId: string, angleName: string): Promise<ApproveState> {
  try {
    // Kiểm tra vai ngay ở action, service kiểm tra lại lần nữa.
    const user = await requireReviewer();
    const res = await approveSubmission(user, String(submissionId ?? ""), { newAngleName: String(angleName ?? "") });
    const ok = res.wentLive ? "Đã duyệt. Trường vừa đủ ảnh, đã chuyển sang hiện chính." : "Đã duyệt, ảnh đã lên trang trường.";
    return { error: "", ok, ...(res.warning ? { warning: res.warning } : {}) };
  } catch (err) {
    return { error: messageOf(err, "Chưa duyệt được, thử lại.") };
  }
}

/** Trả ảnh về Photo kèm lý do bắt buộc. */
export async function rejectAction(submissionId: string, reason: string): Promise<ActionState> {
  try {
    const user = await requireReviewer();
    await rejectSubmission(user, String(submissionId ?? ""), String(reason ?? ""));
    return { error: "", ok: "Đã trả ảnh về cho Photo kèm lý do." };
  } catch (err) {
    return { error: messageOf(err, "Chưa trả lại được, thử lại.") };
  }
}
