import "server-only";
import { db } from "@/lib/db";
import { todayVN } from "@/lib/availability";
import { monthKeys, nextWeekKeys, type DayCell, type MonthCells } from "@/lib/schedule";

/**
 * Truy vấn lịch cho admin. Ngày lưu kiểu DATE ở UTC nửa đêm, khoá là YYYY-MM-DD.
 * Xem PLAN.md mục 11.
 */

function keyOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeOfMonth(year: number, month: number) {
  const keys = monthKeys(year, month);
  return {
    keys,
    gte: new Date(`${keys[0]}T00:00:00Z`),
    lte: new Date(`${keys[keys.length - 1]}T00:00:00Z`),
  };
}

/** Lịch một tháng của một thợ, chỉ những ngày có dữ liệu. */
export async function loadMonth(photographerId: string, year: number, month: number): Promise<MonthCells> {
  const { gte, lte } = rangeOfMonth(year, month);
  const all = await loadMonthFor([photographerId], gte, lte);
  return all.get(photographerId) ?? {};
}

async function loadMonthFor(ids: string[], gte: Date, lte: Date): Promise<Map<string, MonthCells>> {
  const out = new Map<string, MonthCells>();
  if (!ids.length) return out;
  const [slots, notes] = await Promise.all([
    db.availability.findMany({
      where: { photographerId: { in: ids }, date: { gte, lte } },
      select: { photographerId: true, date: true, half: true, status: true },
    }),
    db.scheduleNote.findMany({
      where: { photographerId: { in: ids }, date: { gte, lte } },
      select: { photographerId: true, date: true, note: true },
    }),
  ]);
  const cell = (pid: string, key: string): DayCell => {
    let m = out.get(pid);
    if (!m) {
      m = {};
      out.set(pid, m);
    }
    return (m[key] ??= { morning: null, afternoon: null, note: "" });
  };
  for (const s of slots) {
    const c = cell(s.photographerId, keyOf(s.date));
    if (s.half === "MORNING") c.morning = s.status;
    else c.afternoon = s.status;
  }
  for (const n of notes) cell(n.photographerId, keyOf(n.date)).note = n.note;
  return out;
}

export type ScheduleFilter = { tier?: string; q?: string };

export type SchedulePhotographer = {
  id: string;
  slug: string;
  name: string;
  realName: string;
  tierName: string;
  tierSlug: string;
  hasAccount: boolean;
};

/** Thợ đang hiện ngoài site, lọc theo hạng và tìm không dấu theo biệt danh hoặc tên thật. */
export async function listSchedulePhotographers(filter: ScheduleFilter = {}): Promise<SchedulePhotographer[]> {
  const rows = await db.photographer.findMany({
    where: { published: true, ...(filter.tier ? { tier: { slug: filter.tier } } : {}) },
    orderBy: [{ tier: { order: "asc" } }, { order: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      realName: true,
      tier: { select: { name: true, slug: true } },
      user: { select: { id: true } },
    },
  });
  const q = normalize(filter.q ?? "");
  return rows
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      realName: p.realName,
      tierName: p.tier.name,
      tierSlug: p.tier.slug,
      hasAccount: Boolean(p.user),
    }))
    .filter((p) => !q || normalize(`${p.name} ${p.realName}`).includes(q));
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** Lịch cả tháng của nhiều thợ, cho lưới quản lý và xuất Excel. */
export async function loadMonthAll(
  year: number,
  month: number,
  filter: ScheduleFilter = {},
): Promise<{ photographers: SchedulePhotographer[]; cells: Map<string, MonthCells>; keys: string[] }> {
  const photographers = await listSchedulePhotographers(filter);
  const { keys, gte, lte } = rangeOfMonth(year, month);
  const cells = await loadMonthFor(
    photographers.map((p) => p.id),
    gte,
    lte,
  );
  return { photographers, cells, keys };
}

/** Lịch một ngày của nhiều thợ, cho tab theo ngày. */
export async function loadDayAll(
  dateKey: string,
  filter: ScheduleFilter = {},
): Promise<{ photographers: SchedulePhotographer[]; cells: Map<string, DayCell> }> {
  const photographers = await listSchedulePhotographers(filter);
  const date = new Date(`${dateKey}T00:00:00Z`);
  const all = await loadMonthFor(
    photographers.map((p) => p.id),
    date,
    date,
  );
  const cells = new Map<string, DayCell>();
  for (const [pid, m] of all) {
    const c = m[dateKey];
    if (c) cells.set(pid, c);
  }
  return { photographers, cells };
}

/**
 * Thợ chưa điền đủ 7 ngày kế tiếp: có ít nhất một buổi chưa có dòng.
 * Dùng cho dải cảnh báo ở màn quản lý và ô ở tổng quan.
 */
export async function photographersMissingNextWeek(): Promise<{ id: string; name: string; missing: number }[]> {
  const keys = nextWeekKeys(todayVN());
  const photographers = await db.photographer.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });
  if (!photographers.length) return [];
  const rows = await db.availability.groupBy({
    by: ["photographerId"],
    where: {
      photographerId: { in: photographers.map((p) => p.id) },
      date: { gte: new Date(`${keys[0]}T00:00:00Z`), lte: new Date(`${keys[keys.length - 1]}T00:00:00Z`) },
    },
    _count: { _all: true },
  });
  const filled = new Map(rows.map((r) => [r.photographerId, r._count._all]));
  const total = keys.length * 2;
  return photographers
    .map((p) => ({ id: p.id, name: p.name, missing: total - (filled.get(p.id) ?? 0) }))
    .filter((p) => p.missing > 0);
}
