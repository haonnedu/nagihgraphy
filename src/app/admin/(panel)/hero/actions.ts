"use server";

import { db } from "@/lib/db";
import { requireEditor } from "@/lib/admin-guard";
import { revalidatePublic } from "@/lib/revalidate-public";

export type ActionState = { error: string; ok?: string };

const MAX_STATS = 4;

function text(formData: FormData, name: string, max: number): string {
  return String(formData.get(name) ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
}

/** Lưu toàn bộ chữ ở đầu trang chủ vào site_settings khoá "hero". */
export async function saveHero(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireEditor();

  const headline = text(formData, "headline", 120);
  if (!headline) return { error: "Tiêu đề không được trống" };

  // Viên số liệu: chỉ giữ hàng có đủ cả số lẫn nhãn, hàng thiếu một bên là bỏ.
  const stats: { value: string; label: string }[] = [];
  for (let i = 0; i < MAX_STATS; i++) {
    const value = text(formData, `stat_value_${i}`, 24);
    const label = text(formData, `stat_label_${i}`, 40);
    if (value && label) stats.push({ value, label });
  }

  const value = {
    eyebrow: text(formData, "eyebrow", 80),
    headline,
    lead: text(formData, "lead", 400),
    stats,
    primaryLabel: text(formData, "primaryLabel", 40),
    secondaryLabel: text(formData, "secondaryLabel", 40),
  };

  await db.siteSetting.upsert({
    where: { key: "hero" },
    update: { value },
    create: { key: "hero", value },
  });
  revalidatePublic();
  return { error: "", ok: "Đã lưu, trang chủ đổi ngay" };
}
