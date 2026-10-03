"use server";

import { db } from "@/lib/db";
import { requireScheduleEditor } from "@/lib/admin-guard";
import { revalidatePublic } from "@/lib/revalidate-public";
import { isStatus, monthKeys, NOTE_MAX, type DayCell, type SlotValue } from "@/lib/schedule";

/**
 * Server action của lịch thợ. Quyền kiểm tra trên đúng thợ đang sửa:
 * thợ chỉ được sửa chính mình theo id trong phiên, OWNER và SALE sửa mọi thợ.
 * Mỗi lần ghi để lại một dòng audit_logs có người sửa, thời điểm và diff.
 * Xem PLAN.md mục 11.
 */

export type ScheduleResult = { ok: true } | { ok: false; error: string };

export type DayInput = {
  photographerId: string;
  date: string;
  morning: SlotValue;
  afternoon: SlotValue;
  noteMorning: string;
  noteAfternoon: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(key: string): Date | null {
  if (!DATE_RE.test(key)) return null;
  const d = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== key ? null : d;
}

function slotValue(v: unknown): SlotValue | undefined {
  if (v === null || v === "") return null;
  return isStatus(v) ? v : undefined;
}

async function readDay(photographerId: string, date: Date): Promise<DayCell> {
  const [slots, note] = await Promise.all([
    db.availability.findMany({ where: { photographerId, date }, select: { half: true, status: true } }),
    db.scheduleNote.findUnique({
      where: { photographerId_date: { photographerId, date } },
      select: { noteMorning: true, noteAfternoon: true },
    }),
  ]);
  return {
    morning: slots.find((s) => s.half === "MORNING")?.status ?? null,
    afternoon: slots.find((s) => s.half === "AFTERNOON")?.status ?? null,
    noteMorning: note?.noteMorning ?? "",
    noteAfternoon: note?.noteAfternoon ?? "",
  };
}

async function writeDay(photographerId: string, date: Date, cell: DayCell): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const [half, value] of [
      ["MORNING", cell.morning],
      ["AFTERNOON", cell.afternoon],
    ] as const) {
      if (value === null) {
        await tx.availability.deleteMany({ where: { photographerId, date, half } });
      } else {
        await tx.availability.upsert({
          where: { photographerId_date_half: { photographerId, date, half } },
          update: { status: value },
          create: { photographerId, date, half, status: value },
        });
      }
    }
    if (cell.noteMorning || cell.noteAfternoon) {
      const notes = { noteMorning: cell.noteMorning, noteAfternoon: cell.noteAfternoon };
      await tx.scheduleNote.upsert({
        where: { photographerId_date: { photographerId, date } },
        update: notes,
        create: { photographerId, date, ...notes },
      });
    } else {
      await tx.scheduleNote.deleteMany({ where: { photographerId, date } });
    }
  });
}

function fail(err: unknown): ScheduleResult {
  return { ok: false, error: err instanceof Error ? err.message : "Chưa lưu được, thử lại." };
}

/** Lưu hai buổi và ghi chú của một ngày. */
export async function saveDay(input: DayInput): Promise<ScheduleResult> {
  try {
    const user = await requireScheduleEditor(String(input.photographerId ?? ""));
    const date = parseDate(String(input.date ?? ""));
    if (!date) return { ok: false, error: "Ngày không hợp lệ." };
    const morning = slotValue(input.morning);
    const afternoon = slotValue(input.afternoon);
    if (morning === undefined || afternoon === undefined) return { ok: false, error: "Trạng thái không hợp lệ." };
    const clean = (v: unknown) =>
      String(v ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, NOTE_MAX);
    const noteMorning = clean(input.noteMorning);
    const noteAfternoon = clean(input.noteAfternoon);

    const before = await readDay(input.photographerId, date);
    const after: DayCell = { morning, afternoon, noteMorning, noteAfternoon };
    await writeDay(input.photographerId, date, after);
    await db.auditLog.create({
      data: {
        actorId: user.id,
        entity: "schedule",
        entityId: `${input.photographerId}:${input.date}`,
        action: "saveDay",
        diff: { before, after },
      },
    });
    revalidatePublic();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Điền Rảnh vào mọi buổi CHƯA ĐIỀN trong tháng, không đụng buổi đã có trạng thái. */
export async function fillMonthFree(photographerId: string, year: number, month: number): Promise<ScheduleResult> {
  try {
    const user = await requireScheduleEditor(String(photographerId ?? ""));
    const keys = monthKeys(Number(year), Number(month));
    if (!keys.length) return { ok: false, error: "Tháng không hợp lệ." };
    const dates = keys.map((k) => new Date(`${k}T00:00:00Z`));
    const existing = await db.availability.findMany({
      where: { photographerId, date: { in: dates } },
      select: { date: true, half: true },
    });
    const have = new Set(existing.map((e) => `${e.date.toISOString().slice(0, 10)}:${e.half}`));
    const data = [];
    for (const k of keys) {
      for (const half of ["MORNING", "AFTERNOON"] as const) {
        if (!have.has(`${k}:${half}`)) {
          data.push({ photographerId, date: new Date(`${k}T00:00:00Z`), half, status: "FREE" as const });
        }
      }
    }
    if (data.length) await db.availability.createMany({ data });
    await db.auditLog.create({
      data: {
        actorId: user.id,
        entity: "schedule",
        entityId: `${photographerId}:${keys[0].slice(0, 7)}`,
        action: "fillMonthFree",
        diff: { added: data.length },
      },
    });
    revalidatePublic();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Xoá toàn bộ lịch và ghi chú của tháng, về trạng thái chưa điền. */
export async function clearMonth(photographerId: string, year: number, month: number): Promise<ScheduleResult> {
  try {
    const user = await requireScheduleEditor(String(photographerId ?? ""));
    const keys = monthKeys(Number(year), Number(month));
    if (!keys.length) return { ok: false, error: "Tháng không hợp lệ." };
    const gte = new Date(`${keys[0]}T00:00:00Z`);
    const lte = new Date(`${keys[keys.length - 1]}T00:00:00Z`);
    const [slots, notes] = await db.$transaction([
      db.availability.deleteMany({ where: { photographerId, date: { gte, lte } } }),
      db.scheduleNote.deleteMany({ where: { photographerId, date: { gte, lte } } }),
    ]);
    await db.auditLog.create({
      data: {
        actorId: user.id,
        entity: "schedule",
        entityId: `${photographerId}:${keys[0].slice(0, 7)}`,
        action: "clearMonth",
        diff: { removedSlots: slots.count, removedNotes: notes.count },
      },
    });
    revalidatePublic();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
