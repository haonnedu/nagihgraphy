-- Chọn trường: vai QC, bảng trường, góc chụp, ảnh trường đã duyệt, ảnh Photo nộp chờ duyệt
-- và bảng đếm lượt xem/bấm Đặt. Xem docs/chon-truong.md.
-- DDL sinh bằng prisma migrate diff giữa schema trước và sau, chép nguyên.
--
-- ALTER TYPE ... ADD VALUE chạy được trong transaction từ Postgres 12, miễn là
-- không dùng giá trị mới ngay trong cùng transaction. Migration này không dùng 'QC'.

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('LIVE', 'SOON');

-- CreateEnum
CREATE TYPE "ShotKind" AS ENUM ('INDIVIDUAL', 'GROUP');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AdminRole" ADD VALUE 'QC';

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "intro" TEXT NOT NULL DEFAULT '',
    "coverPhotoId" TEXT,
    "status" "SchoolStatus" NOT NULL DEFAULT 'SOON',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_angles" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_angles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_photos" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "angleId" TEXT NOT NULL,
    "photographerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "kind" "ShotKind" NOT NULL DEFAULT 'INDIVIDUAL',
    "note" TEXT NOT NULL DEFAULT '',
    "path" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "consentAt" TIMESTAMP(3),
    "consentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_submissions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "angleId" TEXT,
    "angleText" TEXT NOT NULL DEFAULT '',
    "photographerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "kind" "ShotKind" NOT NULL DEFAULT 'INDIVIDUAL',
    "note" TEXT NOT NULL DEFAULT '',
    "path" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "consentById" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT NOT NULL DEFAULT '',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photographer_stats" (
    "photographerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "bookClicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "photographer_stats_pkey" PRIMARY KEY ("photographerId","date")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_slug_key" ON "schools"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "schools_coverPhotoId_key" ON "schools"("coverPhotoId");

-- CreateIndex
CREATE INDEX "schools_status_order_idx" ON "schools"("status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "school_angles_schoolId_name_key" ON "school_angles"("schoolId", "name");

-- CreateIndex
CREATE INDEX "school_photos_schoolId_sortOrder_idx" ON "school_photos"("schoolId", "sortOrder");

-- CreateIndex
CREATE INDEX "school_photos_angleId_idx" ON "school_photos"("angleId");

-- CreateIndex
CREATE INDEX "school_photos_photographerId_idx" ON "school_photos"("photographerId");

-- CreateIndex
CREATE INDEX "photo_submissions_status_createdAt_idx" ON "photo_submissions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "photo_submissions_photographerId_status_idx" ON "photo_submissions"("photographerId", "status");

-- CreateIndex
CREATE INDEX "photo_submissions_schoolId_idx" ON "photo_submissions"("schoolId");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "school_photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_angles" ADD CONSTRAINT "school_angles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_photos" ADD CONSTRAINT "school_photos_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_photos" ADD CONSTRAINT "school_photos_angleId_fkey" FOREIGN KEY ("angleId") REFERENCES "school_angles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_photos" ADD CONSTRAINT "school_photos_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "photographers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_photos" ADD CONSTRAINT "school_photos_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_photos" ADD CONSTRAINT "school_photos_consentById_fkey" FOREIGN KEY ("consentById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_submissions" ADD CONSTRAINT "photo_submissions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_submissions" ADD CONSTRAINT "photo_submissions_angleId_fkey" FOREIGN KEY ("angleId") REFERENCES "school_angles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_submissions" ADD CONSTRAINT "photo_submissions_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "photographers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_submissions" ADD CONSTRAINT "photo_submissions_consentById_fkey" FOREIGN KEY ("consentById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_submissions" ADD CONSTRAINT "photo_submissions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photographer_stats" ADD CONSTRAINT "photographer_stats_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "photographers"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Bảy trường của bản mẫu, nạp bằng migration để production cũng có.
-- Trạng thái SOON, chưa có góc; đủ 4 ảnh duyệt thì tự chuyển LIVE.
INSERT INTO "schools" ("id", "slug", "name", "short", "city", "intro", "status", "order", "createdAt", "updatedAt") VALUES
  ('school_tmu',  'dai-hoc-thuong-mai',         'Đại học Thương Mại',         'TMU',  'Hà Nội',  '', 'SOON', 1, now(), now()),
  ('school_neu',  'dai-hoc-kinh-te-quoc-dan',   'Đại học Kinh tế Quốc dân',   'NEU',  'Hà Nội',  '', 'SOON', 2, now(), now()),
  ('school_hust', 'dai-hoc-bach-khoa-ha-noi',   'Đại học Bách Khoa Hà Nội',   'HUST', 'Hà Nội',  '', 'SOON', 3, now(), now()),
  ('school_ftu',  'dai-hoc-ngoai-thuong',       'Đại học Ngoại Thương',       'FTU',  'Hà Nội',  '', 'SOON', 4, now(), now()),
  ('school_cva',  'thpt-chu-van-an',            'THPT Chu Văn An',            'CVA',  'Hà Nội',  '', 'SOON', 5, now(), now()),
  ('school_ulis', 'dai-hoc-ngoai-ngu',          'Đại học Ngoại Ngữ',          'ULIS', 'Hà Nội',  '', 'SOON', 6, now(), now()),
  ('school_uel',  'dai-hoc-kinh-te-luat',       'Đại học Kinh tế Luật',       'UEL',  'Sài Gòn', '', 'SOON', 7, now(), now())
ON CONFLICT ("slug") DO NOTHING;
