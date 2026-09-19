-- Không có sale: khách nhắn thẳng cho thợ, nên mỗi thợ có kênh liên hệ riêng.
-- Trống thì trang khách dùng liên hệ chung của studio.
ALTER TABLE "photographers"
  ADD COLUMN "zalo"      TEXT NOT NULL DEFAULT '',
  ADD COLUMN "phone"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN "facebook"  TEXT NOT NULL DEFAULT '',
  ADD COLUMN "instagram" TEXT NOT NULL DEFAULT '';
