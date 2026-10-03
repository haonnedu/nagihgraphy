-- Ghi chú tách riêng buổi sáng và buổi chiều, theo ý khách 2026-10-03.
ALTER TABLE "schedule_notes" RENAME COLUMN "note" TO "noteMorning";
ALTER TABLE "schedule_notes" ADD COLUMN "noteAfternoon" TEXT NOT NULL DEFAULT '';
