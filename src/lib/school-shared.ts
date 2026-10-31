import { normalizeForSearch } from "@/lib/slug";
import type { ShotKind } from "@/generated/prisma/enums";

/**
 * Hằng số và hàm thuần của Chọn trường, không import server, để cả client
 * component (form nộp, bộ lọc, popup) và server cùng dùng.
 * Luật thật vẫn chặn ở school-service.ts; số ở đây chỉ để giao diện báo trước.
 */

/** Tối đa ảnh một lần nộp. */
export const MAX_FILES_PER_SUBMIT = 5;
/** Tối đa ảnh đang chờ duyệt của một Photo. */
export const MAX_PENDING_PER_PHOTOGRAPHER = 10;
/** Trường "Sắp có" tự chuyển sang hiện chính khi đủ số ảnh duyệt này. */
export const LIVE_THRESHOLD = 4;
/** Một Photo không nên chiếm quá tỉ lệ này số ảnh của một trường. */
export const MAX_SHARE = 0.4;
/**
 * Trường còn quá ít ảnh thì ai cũng vượt 40% (ảnh đầu tiên là 100%), cảnh báo
 * lúc đó chỉ gây nhiễu. Chỉ cảnh báo khi trường có từ chừng này ảnh trở lên.
 */
export const SHARE_RULE_MIN_PHOTOS = 3;
export const ANGLE_NAME_MAX = 60;
export const NOTE_MAX = 300;
export const REJECT_REASON_MIN = 3;
export const REJECT_REASON_MAX = 300;
export const MIN_YEAR = 2000;

/** Nhãn kiểu chụp hiện cho người dùng. */
export const KIND_LABEL: Record<ShotKind, string> = {
  INDIVIDUAL: "Cá nhân",
  GROUP: "Nhóm",
};

/** Giá trị ?kieu= trên URL trang trường. */
export const KIND_PARAM: Record<ShotKind, "ca-nhan" | "nhom"> = {
  INDIVIDUAL: "ca-nhan",
  GROUP: "nhom",
};

export function kindFromParam(value: string | null | undefined): ShotKind | null {
  if (value === "ca-nhan") return "INDIVIDUAL";
  if (value === "nhom") return "GROUP";
  return null;
}

/** Bỏ khoảng trắng thừa ở tên góc: "  Sảnh   V " → "Sảnh V". */
export function normalizeAngleName(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** Khoá so trùng tên góc: bỏ dấu, thường hoá. "Sảnh V" và "sanh v" trùng nhau. */
export function angleKey(input: string): string {
  return normalizeForSearch(input);
}

/** Alt text tự sinh cho ảnh trường: "Sảnh V tại Đại học Thương Mại". */
export function schoolPhotoAlt(angleName: string, schoolName: string): string {
  return `${angleName} tại ${schoolName}`;
}

/**
 * Câu cảnh báo luật 40%, null khi không vượt. `mine` và `total` là số ảnh
 * SAU khi tính cả ảnh đang xét.
 */
export function shareText(name: string, mine: number, total: number): string | null {
  if (total < SHARE_RULE_MIN_PHOTOS || mine / total <= MAX_SHARE) return null;
  return `${name} chiếm ${mine}/${total} ảnh (${Math.round((mine / total) * 100)}%) của trường này, quá ${Math.round(MAX_SHARE * 100)}%.`;
}

/** Cảnh báo nếu duyệt thêm một ảnh, từ số đếm TRƯỚC khi duyệt. */
export function shareWarningFrom(name: string, mineBefore: number, totalBefore: number): string | null {
  return shareText(name, mineBefore + 1, totalBefore + 1);
}
