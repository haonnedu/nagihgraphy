import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

/**
 * Postgres chạy ngay trong Node bằng PGlite, phơi ra cổng TCP theo đúng
 * giao thức Postgres. Dùng để phát triển và kiểm thử trên máy không có
 * Docker hay Postgres cài sẵn. KHÔNG dùng cho production.
 *
 *   npm run db:local
 *   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/postgres"
 *
 * Dữ liệu nằm trong .pglite/, đã gitignore. Xoá thư mục đó là reset sạch.
 */
const PORT = Number(process.env.LOCAL_DB_PORT || 55432);
const DATA_DIR = path.join(process.cwd(), ".pglite");

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const pg = await PGlite.create({ dataDir: DATA_DIR });
  const server = new PGLiteSocketServer({
    db: pg,
    port: PORT,
    host: "127.0.0.1",
    maxConnections: 120,
    idleTimeout: 0,
  });
  await server.start();

  console.log(`PGlite đang nghe ở 127.0.0.1:${PORT}`);
  console.log(`DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres"`);
  console.log("Ctrl+C để dừng.");

  const stop = async () => {
    await server.stop();
    await pg.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
