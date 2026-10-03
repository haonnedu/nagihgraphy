import "server-only";
import { db } from "@/lib/db";
import { NOTE_MAX } from "@/lib/schedule";

/**
 * Khi sale chốt một lead (trạng thái CONFIRMED) có thợ và ngày chụp, tự ghi
 * buổi đó của thợ thành Lịch NAGIH. Chỉ ghi đè ô đang Rảnh hoặc chưa điền;
 * ô đã là NAGIH, Ngoài hay Bận thì để nguyên và báo lại để sale tự xử lý.
 * Cả ngày ghi hai buổi; nửa ngày ghi buổi đầu tiên còn trống, sáng trước chiều.
 * Xem PLAN.md mục 11.
 */
export async function bookLeadOnSchedule(
  leadId: string,
  actorId: string,
): Promise<{ written: string[]; skipped: string[] } | null> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { code: true, photographerId: true, shootDate: true, shootType: true, customerName: true },
  });
  if (!lead?.photographerId || !lead.shootDate) return null;
  const photographerId = lead.photographerId;
  const date = lead.shootDate;

  const existing = await db.availability.findMany({
    where: { photographerId, date },
    select: { half: true, status: true },
  });
  const current = (half: "MORNING" | "AFTERNOON") => existing.find((e) => e.half === half)?.status ?? null;
  const writable = (half: "MORNING" | "AFTERNOON") => {
    const s = current(half);
    return s === null || s === "FREE";
  };

  let halves: ("MORNING" | "AFTERNOON")[];
  if (lead.shootType === "FULL_DAY") {
    halves = ["MORNING", "AFTERNOON"];
  } else {
    const first = (["MORNING", "AFTERNOON"] as const).find(writable);
    halves = first ? [first] : ["MORNING"];
  }

  const written: string[] = [];
  const skipped: string[] = [];
  for (const half of halves) {
    const name = half === "MORNING" ? "sáng" : "chiều";
    if (!writable(half)) {
      skipped.push(name);
      continue;
    }
    await db.availability.upsert({
      where: { photographerId_date_half: { photographerId, date, half } },
      update: { status: "NAGIH" },
      create: { photographerId, date, half, status: "NAGIH" },
    });
    written.push(name);
  }

  if (written.length) {
    // Ghi chú vào đúng buổi vừa ghi, không đè ghi chú Photo đã tự viết.
    const note = `Khách ${lead.customerName} · ${lead.code}`.slice(0, NOTE_MAX);
    const cur = await db.scheduleNote.findUnique({
      where: { photographerId_date: { photographerId, date } },
      select: { noteMorning: true, noteAfternoon: true },
    });
    const next = {
      noteMorning: written.includes("sáng") && !cur?.noteMorning ? note : (cur?.noteMorning ?? ""),
      noteAfternoon: written.includes("chiều") && !cur?.noteAfternoon ? note : (cur?.noteAfternoon ?? ""),
    };
    await db.scheduleNote.upsert({
      where: { photographerId_date: { photographerId, date } },
      update: next,
      create: { photographerId, date, ...next },
    });
    await db.auditLog.create({
      data: {
        actorId,
        entity: "schedule",
        entityId: `${photographerId}:${date.toISOString().slice(0, 10)}`,
        action: "leadConfirmed",
        diff: { lead: lead.code, written, skipped },
      },
    });
  }
  return { written, skipped };
}
