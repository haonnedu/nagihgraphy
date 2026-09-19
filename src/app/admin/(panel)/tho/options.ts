import "server-only";
import { db } from "@/lib/db";
import type { FormOptions } from "./photographer-form";

/** Hạng, tag, dịch vụ cho form thợ. Dùng chung cho trang sửa và trang thêm. */
export async function loadFormOptions(): Promise<FormOptions> {
  const [tiers, tags, features] = await Promise.all([
    db.tier.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, basePrice: true } }),
    db.tag.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    db.feature.findMany({ orderBy: { order: "asc" }, select: { id: true, label: true } }),
  ]);
  return { tiers, tags, features };
}
