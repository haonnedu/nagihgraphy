-- Hạng ekip có thêm giá cả ngày cho 1 người. basePrice giữ nguyên nghĩa là giá nửa ngày (một buổi).
ALTER TABLE "tiers" ADD COLUMN "fullDayPrice" INTEGER NOT NULL DEFAULT 0;
