"use server";

import { randomInt } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, type AdminUser } from "@/lib/admin-guard";
import type { AdminRole } from "@/generated/prisma/enums";

export type ActionState = { error: string; ok?: string };

/**
 * Quản lý tài khoản đăng nhập admin, chủ yếu để tạo tài khoản cho thợ.
 * OWNER làm được mọi thứ. SALE chỉ tạo, khoá, cấp lại mật khẩu cho tài khoản thợ.
 * Mật khẩu tạm sinh ở server, chỉ hiện một lần trong thông báo, lưu dạng bcrypt.
 * Xem PLAN.md mục 11.
 */

const ROLES = ["OWNER", "SALE", "VIEWER", "PHOTOGRAPHER"] as const;

/** Mật khẩu tạm 10 ký tự, bỏ các ký tự dễ nhầm như 0 O l 1 I. */
function tempPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

function canManage(actor: AdminUser, targetRole: AdminRole): boolean {
  if (actor.role === "OWNER") return true;
  return actor.role === "SALE" && targetRole === "PHOTOGRAPHER";
}

async function requireManager(): Promise<AdminUser> {
  const user = await requireAdmin();
  if (user.role !== "OWNER" && user.role !== "SALE") throw new Error("Tài khoản này không được quản lý tài khoản.");
  return user;
}

const createSchema = z.object({
  role: z.enum(ROLES),
  email: z.string().trim().toLowerCase().email("Email chưa đúng").max(120),
  name: z.string().trim().max(80).default(""),
  photographerId: z.string().trim().default(""),
});

export async function createAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireManager();
    const parsed = createSchema.safeParse({
      role: formData.get("role"),
      email: formData.get("email"),
      name: formData.get("name"),
      photographerId: formData.get("photographerId"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ" };
    const d = parsed.data;
    if (!canManage(actor, d.role)) return { error: "Bạn chỉ tạo được tài khoản thợ." };

    let photographerId: string | null = null;
    let name = d.name;
    if (d.role === "PHOTOGRAPHER") {
      if (!d.photographerId) return { error: "Chọn thợ cho tài khoản này." };
      const ph = await db.photographer.findUnique({
        where: { id: d.photographerId },
        select: { id: true, name: true, user: { select: { email: true } } },
      });
      if (!ph) return { error: "Không tìm thấy thợ." };
      if (ph.user) return { error: `${ph.name} đã có tài khoản ${ph.user.email}.` };
      photographerId = ph.id;
      name ||= ph.name;
    }
    if (await db.adminUser.findUnique({ where: { email: d.email }, select: { id: true } })) {
      return { error: "Email này đã có tài khoản." };
    }

    const password = tempPassword();
    await db.adminUser.create({
      data: { email: d.email, name, role: d.role, photographerId, passwordHash: await hash(password, 10) },
    });
    await db.auditLog.create({
      data: { actorId: actor.id, entity: "admin_user", entityId: d.email, action: "create", diff: { role: d.role, photographerId } },
    });
    return {
      error: "",
      ok: `Đã tạo ${d.email}. Mật khẩu tạm: ${password} . Gửi cho người dùng, họ đổi ở mục Đổi mật khẩu sau khi đăng nhập.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Chưa tạo được." };
  }
}

async function loadTarget(id: string) {
  return db.adminUser.findUnique({ where: { id }, select: { id: true, email: true, role: true, active: true } });
}

export async function setActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireManager();
    const id = String(formData.get("id") ?? "");
    const active = formData.get("active") === "1";
    const target = await loadTarget(id);
    if (!target) return { error: "Không tìm thấy tài khoản." };
    if (target.id === actor.id) return { error: "Không tự khoá tài khoản của mình." };
    if (!canManage(actor, target.role)) return { error: "Bạn chỉ khoá hoặc mở được tài khoản thợ." };
    await db.adminUser.update({ where: { id }, data: { active } });
    await db.auditLog.create({
      data: { actorId: actor.id, entity: "admin_user", entityId: target.email, action: active ? "unlock" : "lock" },
    });
    return { error: "", ok: active ? `Đã mở khoá ${target.email}.` : `Đã khoá ${target.email}, không đăng nhập được nữa.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Chưa đổi được." };
  }
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireManager();
    const id = String(formData.get("id") ?? "");
    const target = await loadTarget(id);
    if (!target) return { error: "Không tìm thấy tài khoản." };
    if (!canManage(actor, target.role)) return { error: "Bạn chỉ cấp lại mật khẩu cho tài khoản thợ." };
    const password = tempPassword();
    await db.adminUser.update({ where: { id }, data: { passwordHash: await hash(password, 10) } });
    await db.auditLog.create({
      data: { actorId: actor.id, entity: "admin_user", entityId: target.email, action: "resetPassword" },
    });
    return { error: "", ok: `Mật khẩu tạm mới của ${target.email}: ${password} . Chỉ hiện một lần.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Chưa cấp lại được." };
  }
}
