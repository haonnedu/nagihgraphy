import type { AvailabilityStatus, Half } from "@/generated/prisma/enums";

/**
 * Một thợ nhận tối đa 2 buổi mỗi ngày: sáng và chiều.
 * Chụp cả ngày chiếm cả hai ô. Lịch chỉ để hiển thị, khách không tự chiếm chỗ.
 * Xem PLAN.md mục 4.
 */

export type HalfSlot = { half: Half; status: AvailabilityStatus };

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayVN(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-09-17" -> "17/09/2026" */
export function formatDateVN(key: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export type DayStatus = "FULL_DAY" | "MORNING_ONLY" | "AFTERNOON_ONLY" | "NONE";

export function dayStatus(slots: HalfSlot[]): DayStatus {
  const open = (half: Half) => slots.some((s) => s.half === half && s.status === "OPEN");
  const morning = open("MORNING");
  const afternoon = open("AFTERNOON");
  if (morning && afternoon) return "FULL_DAY";
  if (morning) return "MORNING_ONLY";
  if (afternoon) return "AFTERNOON_ONLY";
  return "NONE";
}

const DAY_LABELS: Record<DayStatus, string> = {
  FULL_DAY: "Còn cả ngày",
  MORNING_ONLY: "Còn buổi sáng",
  AFTERNOON_ONLY: "Còn buổi chiều",
  NONE: "Nhắn để hỏi lịch",
};

export function dayStatusLabel(status: DayStatus): string {
  return DAY_LABELS[status];
}

/**
 * Nhãn ngắn hiện trên card danh sách. Ưu tiên nói về hôm nay, vì đó là
 * thông tin khách quan tâm nhất; nếu hôm nay hết thì chỉ ngày trống gần nhất.
 */
export function shortAvailabilityLabel(
  todaySlots: HalfSlot[],
  nextOpenDate: string | null,
): { text: string; open: boolean } {
  const today = dayStatus(todaySlots);
  if (today !== "NONE") {
    return {
      text: today === "FULL_DAY" ? "Còn lịch hôm nay" : `${dayStatusLabel(today)} hôm nay`,
      open: true,
    };
  }
  if (nextOpenDate) {
    return { text: `Trống từ ${formatDateVN(nextOpenDate)}`, open: true };
  }
  return { text: "Nhắn để hỏi lịch", open: false };
}
