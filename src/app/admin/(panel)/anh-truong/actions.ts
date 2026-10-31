"use server";

import { requirePhotographer } from "@/lib/admin-guard";
import {
  resubmitRejected,
  schoolActionError,
  submitPhotos,
  withdrawSubmission,
  type SubmissionFields,
} from "@/lib/school-service";

export type ActionState = { error: string; ok?: string };

/**
 * Server action của trang "Ảnh trường của tôi". Id Photo luôn lấy từ phiên
 * qua requirePhotographer, không bao giờ từ form. Luật (5 ảnh một lần, 10 ảnh
 * chờ duyệt, cam kết, góc thuộc đúng trường…) nằm ở school-service, service
 * cũng tự ghi audit log và làm mới trang.
 */

/** Phần thông tin chung của form nộp và form sửa nộp lại. */
function fieldsFrom(formData: FormData): SubmissionFields {
  return {
    schoolId: String(formData.get("schoolId") ?? ""),
    angleId: String(formData.get("angleId") ?? ""),
    angleText: String(formData.get("angleText") ?? ""),
    year: String(formData.get("year") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    note: String(formData.get("note") ?? ""),
    consent: formData.get("consent") === "on",
  };
}

/** Chỉ đưa ra chữ của SchoolError và lỗi phiên; lỗi khác (DB, sharp) chỉ ghi log. */
function errorState(err: unknown, fallback: string): ActionState {
  return { error: schoolActionError(err, fallback) };
}

async function photographer() {
  try {
    return { user: await requirePhotographer() };
  } catch (err) {
    return { error: schoolActionError(err, "Phiên đăng nhập đã hết, tải lại trang.") };
  }
}

export async function submitSchoolPhotos(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error } = await photographer();
  if (!user) return { error: error ?? "" };
  try {
    const { count } = await submitPhotos(user, {
      ...fieldsFrom(formData),
      files: formData.getAll("files").filter((f): f is File => f instanceof File),
    });
    return { error: "", ok: `Đã gửi ${count} ảnh, chờ QC duyệt.` };
  } catch (err) {
    return errorState(err, "Chưa gửi được ảnh, thử lại sau ít phút.");
  }
}

/** Sửa bài bị trả lại rồi nộp lại. Id bài nộp được bind ở server, service kiểm tra chủ. */
export async function resubmitSchoolPhoto(
  submissionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, error } = await photographer();
  if (!user) return { error: error ?? "" };
  const file = formData.get("file");
  try {
    await resubmitRejected(user, submissionId, fieldsFrom(formData), file instanceof File ? file : null);
    return { error: "", ok: "Đã nộp lại, chờ QC duyệt." };
  } catch (err) {
    return errorState(err, "Chưa nộp lại được, thử lại sau ít phút.");
  }
}

/** Rút bài đang chờ duyệt hoặc bị trả lại của chính mình. Ảnh đã lên web không rút được. */
export async function withdrawSchoolPhoto(submissionId: string): Promise<ActionState> {
  const { user, error } = await photographer();
  if (!user) return { error: error ?? "" };
  try {
    await withdrawSubmission(user, submissionId);
    return { error: "", ok: "Đã rút ảnh." };
  } catch (err) {
    return errorState(err, "Chưa rút được ảnh, thử lại sau ít phút.");
  }
}
