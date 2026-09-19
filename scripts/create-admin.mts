import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

/**
 * Tạo hoặc cập nhật một tài khoản admin. Chạy một lần sau khi migrate:
 *
 *   npm run admin:create -- --email chu@nagihgraphy.com --password "mat khau manh" --role OWNER
 *
 * Trong container:
 *   docker compose --profile tools run --rm migrate npx tsx scripts/create-admin.mts --email ... --password ...
 *
 * Mật khẩu chỉ lưu dạng bcrypt hash. Chạy lại với cùng email thì đổi mật khẩu và role.
 */
function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? "") : "";
}

const email = arg("email").trim().toLowerCase();
const password = arg("password");
const role = (arg("role") || "OWNER").toUpperCase();
const name = arg("name") || email.split("@")[0];

if (!email || !password) {
  console.error("Cần --email và --password. Thêm --role OWNER|SALE|VIEWER nếu muốn, mặc định OWNER.");
  process.exit(1);
}
if (!["OWNER", "SALE", "VIEWER"].includes(role)) {
  console.error("Role phải là OWNER, SALE hoặc VIEWER.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Mật khẩu tối thiểu 8 ký tự.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Thiếu DATABASE_URL trong .env");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const passwordHash = await hash(password, 12);

const user = await db.adminUser.upsert({
  where: { email },
  update: { passwordHash, role: role as "OWNER" | "SALE" | "VIEWER", name, active: true },
  create: { email, passwordHash, role: role as "OWNER" | "SALE" | "VIEWER", name },
  select: { email: true, role: true, name: true },
});

console.log(`Đã lưu admin ${user.email} (${user.role}). Đăng nhập tại /admin/login.`);
await db.$disconnect();
