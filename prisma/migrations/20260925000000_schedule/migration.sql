-- Lịch thợ thay Google Sheet. Xem PLAN.md mục 11.

-- 1. Vai thợ và liên kết tài khoản với thợ
ALTER TYPE "AdminRole" ADD VALUE 'PHOTOGRAPHER';
ALTER TABLE "admin_users" ADD COLUMN "photographerId" TEXT;
CREATE UNIQUE INDEX "admin_users_photographerId_key" ON "admin_users"("photographerId");
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_photographerId_fkey"
  FOREIGN KEY ("photographerId") REFERENCES "photographers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "photographers" ADD COLUMN "realName" TEXT NOT NULL DEFAULT '';

-- 2. Trạng thái lịch 4 mức. Dữ liệu cũ: OPEN -> FREE, BUSY -> NAGIH, OFF -> BUSY.
CREATE TYPE "AvailabilityStatus_new" AS ENUM ('FREE', 'NAGIH', 'EXTERNAL', 'BUSY');
ALTER TABLE "availability" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "availability" ALTER COLUMN "status" TYPE "AvailabilityStatus_new"
  USING (CASE "status"::text WHEN 'OPEN' THEN 'FREE' WHEN 'BUSY' THEN 'NAGIH' ELSE 'BUSY' END)::"AvailabilityStatus_new";
DROP TYPE "AvailabilityStatus";
ALTER TYPE "AvailabilityStatus_new" RENAME TO "AvailabilityStatus";
ALTER TABLE "availability" ALTER COLUMN "status" SET DEFAULT 'FREE';
ALTER TABLE "availability" DROP COLUMN "note";

-- 3. Ghi chú theo ngày
CREATE TABLE "schedule_notes" (
    "id" TEXT NOT NULL,
    "photographerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "schedule_notes_photographerId_date_key" ON "schedule_notes"("photographerId", "date");
ALTER TABLE "schedule_notes" ADD CONSTRAINT "schedule_notes_photographerId_fkey"
  FOREIGN KEY ("photographerId") REFERENCES "photographers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
