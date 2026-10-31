"use server";

import { redirect } from "next/navigation";
import { requireReviewer, requireSchoolManager } from "@/lib/admin-guard";
import {
  createAngle,
  createSchool,
  deleteAngle,
  deleteSchool,
  mergeAngles,
  removeSchoolPhoto,
  renameAngle,
  schoolActionError,
  setCover,
  updateSchool,
  type SchoolInput,
} from "@/lib/school-service";
import type { ActionState } from "@/components/admin/form-bits";

/**
 * Server action của khu trường và góc chụp. Mỗi action tự kiểm tra vai
 * (requireSchoolManager cho thông tin trường, requireReviewer cho góc và ảnh),
 * service kiểm tra lại lần nữa, ghi audit log và làm mới trang.
 */

/** Chỉ đưa ra chữ của lỗi nghiệp vụ và lỗi quyền; lỗi khác (DB…) chỉ ghi log. */
const messageOf = schoolActionError;

function readSchool(formData: FormData): SchoolInput {
  const status = String(formData.get("status") ?? "SOON");
  const statusWas = formData.get("statusWas");
  return {
    name: String(formData.get("name") ?? ""),
    short: String(formData.get("short") ?? ""),
    city: String(formData.get("city") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    intro: String(formData.get("intro") ?? ""),
    status: status === "LIVE" ? "LIVE" : "SOON",
    // Form sửa gửi kèm trạng thái lúc mở trang; không đổi thì service giữ giá trị trong DB.
    ...(statusWas === "LIVE" || statusWas === "SOON" ? { statusWas } : {}),
    // Trường mới không có ô thứ tự: để undefined thì service xếp cuối.
    ...(formData.has("order") ? { order: String(formData.get("order") ?? "") } : {}),
  };
}

// ---------------------------------------------------------------- trường (chỉ OWNER)

/** Thêm trường xong thì chuyển sang trang chi tiết để thêm góc. */
export async function createSchoolAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireSchoolManager();
    ({ id } = await createSchool(user, readSchool(formData)));
  } catch (err) {
    return { error: messageOf(err, "Chưa thêm được trường.") };
  }
  // redirect ném lỗi riêng của Next, để ngoài try.
  redirect(`/admin/truong/${id}?created=1`);
}

export async function updateSchoolAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireSchoolManager();
    const { slug } = await updateSchool(user, String(formData.get("id") ?? ""), readSchool(formData));
    return { error: "", ok: `Đã lưu. Trang khách: /truong/${slug}` };
  } catch (err) {
    return { error: messageOf(err, "Chưa lưu được.") };
  }
}

export async function deleteSchoolAction(schoolId: string): Promise<ActionState> {
  try {
    const user = await requireSchoolManager();
    await deleteSchool(user, String(schoolId ?? ""));
  } catch (err) {
    return { error: messageOf(err, "Chưa xoá được trường.") };
  }
  redirect("/admin/truong?deleted=1");
}

// ---------------------------------------------------------------- góc chụp (QC, SALE, OWNER)

export async function createAngleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireReviewer();
    await createAngle(user, String(formData.get("schoolId") ?? ""), String(formData.get("name") ?? ""));
    return { error: "", ok: "Đã thêm góc." };
  } catch (err) {
    return { error: messageOf(err, "Chưa thêm được góc.") };
  }
}

export async function renameAngleAction(angleId: string, name: string): Promise<ActionState> {
  try {
    const user = await requireReviewer();
    await renameAngle(user, String(angleId ?? ""), String(name ?? ""));
    return { error: "", ok: "Đã đổi tên góc." };
  } catch (err) {
    return { error: messageOf(err, "Chưa đổi được tên góc.") };
  }
}

export async function mergeAngleAction(fromId: string, intoId: string): Promise<ActionState> {
  try {
    const user = await requireReviewer();
    const { moved } = await mergeAngles(user, String(fromId ?? ""), String(intoId ?? ""));
    return { error: "", ok: `Đã gộp, chuyển ${moved} ảnh sang góc mới.` };
  } catch (err) {
    return { error: messageOf(err, "Chưa gộp được góc.") };
  }
}

export async function deleteAngleAction(angleId: string): Promise<ActionState> {
  try {
    const user = await requireReviewer();
    await deleteAngle(user, String(angleId ?? ""));
    return { error: "", ok: "Đã xoá góc." };
  } catch (err) {
    return { error: messageOf(err, "Chưa xoá được góc.") };
  }
}

// ---------------------------------------------------------------- ảnh đã lên web (QC, SALE, OWNER)

/** Gỡ một bấm, theo yêu cầu bản quyền ảnh khách. Không hoàn tác được. */
export async function removePhotoAction(photoId: string): Promise<ActionState> {
  try {
    const user = await requireReviewer();
    await removeSchoolPhoto(user, String(photoId ?? ""));
    return { error: "", ok: "Đã gỡ ảnh khỏi trang trường và xoá file. Muốn đăng lại thì Photo phải nộp lại." };
  } catch (err) {
    return { error: messageOf(err, "Chưa gỡ được ảnh.") };
  }
}

export async function setCoverAction(schoolId: string, photoId: string): Promise<ActionState> {
  try {
    const user = await requireReviewer();
    await setCover(user, String(schoolId ?? ""), String(photoId ?? ""));
    return { error: "", ok: "Đã đổi ảnh bìa." };
  } catch (err) {
    return { error: messageOf(err, "Chưa đổi được ảnh bìa.") };
  }
}
