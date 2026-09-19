import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 nối database qua driver adapter, không đọc url từ schema nữa.
 * Giữ một instance duy nhất để hot reload trong dev không mở thêm connection pool.
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Thiếu DATABASE_URL. Sao chép .env.example thành .env rồi điền vào.");
  }
  const max = Number(process.env.DATABASE_POOL_MAX) || 10;
  const adapter = new PrismaPg({
    connectionString,
    max,
    // PGlite (npm run db:local) rớt kết nối nếu pool tự đóng khi rảnh,
    // nên giữ kết nối mở. Với Postgres thật thì đây cũng là lựa chọn hợp lý
    // vì số kết nối đã bị chặn trần bởi `max`.
    idleTimeoutMillis: 0,
    allowExitOnIdle: false,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
