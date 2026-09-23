"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/admin-guard";
import { revalidatePublic } from "@/lib/revalidate-public";
import { slugify } from "@/lib/slug";

export type ActionState = { error: string; ok?: string };

const money = z.coerce.number().int().min(0);

// ---------------------------------------------------------------- hạng ekip

const tierSchema = z.object({
  id: z.string().default(""),
  name: z.string().trim().min(1, "Thiếu tên hạng").max(40),
  basePrice: money.default(0),
  fullDayPrice: money.default(0),
  note: z.string().trim().max(200).default(""),
  hiddenInTable: z.coerce.boolean().default(false),
});

export async function saveTier(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireEditor();
  const parsed = tierSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    basePrice: formData.get("basePrice") || 0,
    fullDayPrice: formData.get("fullDayPrice") || 0,
    note: formData.get("note"),
    hiddenInTable: formData.get("hiddenInTable") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ" };
  const d = parsed.data;

  if (d.id) {
    await db.tier.update({ where: { id: d.id }, data: { name: d.name, basePrice: d.basePrice, fullDayPrice: d.fullDayPrice, note: d.note, hiddenInTable: d.hiddenInTable } });
  } else {
    const last = await db.tier.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    let slug = slugify(d.name) || "hang";
    if (await db.tier.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    await db.tier.create({ data: { slug, name: d.name, basePrice: d.basePrice, fullDayPrice: d.fullDayPrice, note: d.note, hiddenInTable: d.hiddenInTable, order: (last?.order ?? -1) + 1 } });
  }
  revalidatePublic();
  return { error: "", ok: "Đã lưu hạng" };
}

export async function deleteTier(id: string): Promise<ActionState> {
  await requireEditor();
  const used = await db.photographer.count({ where: { tierId: id } });
  if (used > 0) return { error: `Còn ${used} thợ đang ở hạng này, chuyển họ sang hạng khác trước.` };
  await db.tier.delete({ where: { id } });
  revalidatePublic();
  return { error: "", ok: "Đã xoá hạng" };
}

/**
 * Giá gói nhóm của một hạng: nhận cả bảng người -> giá trong một form.
 * Ô để trống hoặc 0 thì xoá dòng đó, để "Thợ báo giá" hiện ra ở trang khách.
 */
export async function saveGroupPrices(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireEditor();
  const tierId = String(formData.get("tierId") ?? "");
  if (!(await db.tier.findUnique({ where: { id: tierId } }))) return { error: "Không tìm thấy hạng" };

  const rows: { people: number; price: number }[] = [];
  for (const [k, v] of formData.entries()) {
    const m = /^people:(\d+)$/.exec(k);
    if (!m) continue;
    const people = Number(m[1]);
    const price = Number(String(v).replace(/\D/g, "")) || 0;
    if (people >= 2 && people <= 20) rows.push({ people, price });
  }

  await db.$transaction([
    db.groupPrice.deleteMany({ where: { tierId } }),
    ...rows.filter((r) => r.price > 0).map((r) => db.groupPrice.create({ data: { tierId, people: r.people, price: r.price } })),
  ]);
  revalidatePublic();
  return { error: "", ok: "Đã lưu giá nhóm" };
}

// ---------------------------------------------------------------- phụ phí tỉnh

const zoneSchema = z.object({
  id: z.string().default(""),
  name: z.string().trim().min(1, "Thiếu tên địa điểm").max(80),
  minFee: money.default(0),
  maxFee: money.default(0),
  note: z.string().trim().max(300).default(""),
});

export async function saveZone(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireEditor();
  const parsed = zoneSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    minFee: formData.get("minFee") || 0,
    maxFee: formData.get("maxFee") || 0,
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ" };
  const d = parsed.data;
  if (d.maxFee && d.maxFee < d.minFee) return { error: "Mức cao nhất phải lớn hơn mức thấp nhất" };

  if (d.id) {
    await db.travelZone.update({ where: { id: d.id }, data: { name: d.name, minFee: d.minFee, maxFee: d.maxFee, note: d.note } });
  } else {
    const last = await db.travelZone.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    let slug = slugify(d.name) || "tinh";
    if (await db.travelZone.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    await db.travelZone.create({ data: { slug, name: d.name, minFee: d.minFee, maxFee: d.maxFee, note: d.note, order: (last?.order ?? -1) + 1 } });
  }
  revalidatePublic();
  return { error: "", ok: "Đã lưu địa điểm" };
}

export async function deleteZone(id: string): Promise<void> {
  await requireEditor();
  await db.travelZone.delete({ where: { id } }); // lead trỏ tới sẽ về null theo SetNull
  revalidatePublic();
}

// ---------------------------------------------------------------- chính sách và phụ phí tối

/** Mỗi dòng trong textarea là một chính sách; dòng trống bị bỏ. */
export async function savePolicies(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireEditor();
  const lines = String(formData.get("policies") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
  await db.$transaction([
    db.policy.deleteMany({}),
    ...lines.map((text, order) => db.policy.create({ data: { text, order } })),
  ]);
  revalidatePublic();
  return { error: "", ok: `Đã lưu ${lines.length} dòng chính sách` };
}

export async function saveEveningAddon(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireEditor();
  const fee = money.safeParse(String(formData.get("eveningAddon") ?? "").replace(/\D/g, "") || 0);
  if (!fee.success) return { error: "Phụ phí phải là số" };
  await db.siteSetting.upsert({
    where: { key: "pricing" },
    update: { value: { eveningAddon: fee.data } },
    create: { key: "pricing", value: { eveningAddon: fee.data } },
  });
  revalidatePublic();
  return { error: "", ok: "Đã lưu phụ phí buổi tối" };
}
