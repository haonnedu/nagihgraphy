/**
 * Lịch thợ: kiểu dữ liệu và hàm thuần dùng chung cho client và server.
 * Không import server ở đây. Truy vấn nằm ở schedule-queries.ts.
 * Xem PLAN.md mục 11.
 */

import type { AvailabilityStatus } from "@/generated/prisma/enums";

export const STATUSES = ["FREE", "NAGIH", "EXTERNAL", "BUSY"] as const;
export type SlotStatus = AvailabilityStatus;
/** null = chưa điền */
export type SlotValue = SlotStatus | null;

export type DayCell = { morning: SlotValue; afternoon: SlotValue; note: string };
export type MonthCells = Record<string, DayCell>;

export const STATUS_LABEL: Record<SlotStatus, string> = {
  FREE: "Rảnh",
  NAGIH: "Lịch NAGIH",
  EXTERNAL: "Lịch ngoài",
  BUSY: "Bận, không nhận",
};

export const STATUS_SHORT: Record<SlotStatus, string> = {
  FREE: "Rảnh",
  NAGIH: "NAGIH",
  EXTERNAL: "Ngoài",
  BUSY: "Bận",
};

/** Màu vạch và ô theo trạng thái, bám bản mẫu: xanh lá, xanh dương, cam, xám; chưa điền là ô trắng viền mờ. */
export const STATUS_CLASS: Record<SlotStatus, string> = {
  FREE: "bg-in-bg border-in-line",
  NAGIH: "bg-blue-soft border-[#b9d7ee]",
  EXTERNAL: "bg-extra-bg border-extra-line",
  BUSY: "bg-none-bg border-none-line",
};
export const UNSET_CLASS = "bg-surface border-line";

export function slotClass(v: SlotValue): string {
  return v ? STATUS_CLASS[v] : UNSET_CLASS;
}

export function isStatus(v: unknown): v is SlotStatus {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

export const NOTE_MAX = 80;

/** Số ngày trong tháng, month 1..12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Mọi khoá ngày của một tháng. */
export function monthKeys(year: number, month: number): string[] {
  const n = daysInMonth(year, month);
  return Array.from({ length: n }, (_, i) => dateKey(year, month, i + 1));
}

/** "2026-09" -> { year, month }; sai dạng thì trả tháng hiện tại theo giờ Việt Nam. */
export function parseMonth(s: string | undefined, todayKey: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(s ?? "");
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12 && year >= 2020 && year <= 2100) return { year, month };
  }
  return { year: Number(todayKey.slice(0, 4)), month: Number(todayKey.slice(5, 7)) };
}

export function monthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** Thứ trong tuần theo kiểu Việt Nam, 0 = Thứ Hai ... 6 = Chủ Nhật. */
export function weekdayVN(key: string): number {
  const d = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = CN
  return (d + 6) % 7;
}

export const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export type MonthCounts = { free: number; nagih: number; external: number; busy: number; unfilled: number };

/** Đếm số buổi theo trạng thái trong tháng. Mỗi ngày 2 buổi. */
export function countMonth(cells: MonthCells, keys: string[]): MonthCounts {
  const c: MonthCounts = { free: 0, nagih: 0, external: 0, busy: 0, unfilled: 0 };
  for (const k of keys) {
    const cell = cells[k];
    for (const v of [cell?.morning ?? null, cell?.afternoon ?? null]) {
      if (v === "FREE") c.free++;
      else if (v === "NAGIH") c.nagih++;
      else if (v === "EXTERNAL") c.external++;
      else if (v === "BUSY") c.busy++;
      else c.unfilled++;
    }
  }
  return c;
}

export type DayGroup = "FULL" | "MORNING" | "AFTERNOON" | "NONE";

/** Nhóm trong tab theo ngày: trống cả ngày, chỉ sáng, chỉ chiều, đã kín hoặc chưa điền. */
export function dayGroup(cell: DayCell | undefined): DayGroup {
  const m = cell?.morning === "FREE";
  const a = cell?.afternoon === "FREE";
  if (m && a) return "FULL";
  if (m) return "MORNING";
  if (a) return "AFTERNOON";
  return "NONE";
}

export const DAY_GROUP_LABEL: Record<DayGroup, string> = {
  FULL: "Trống cả ngày",
  MORNING: "Chỉ trống buổi sáng",
  AFTERNOON: "Chỉ trống buổi chiều",
  NONE: "Đã kín hoặc chưa điền",
};

/** Khoá ngày của 7 ngày kế tiếp kể từ ngày mai. */
export function nextWeekKeys(todayKey: string): string[] {
  const base = new Date(`${todayKey}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i + 1);
    return d.toISOString().slice(0, 10);
  });
}
