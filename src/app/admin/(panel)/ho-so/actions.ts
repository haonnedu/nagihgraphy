"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { revalidatePublic } from "@/lib/revalidate-public";

export type ActionState = { error: string; ok?: string };

/**
 * Photo tự sửa hồ sơ ngoài site của chính mình. Id lấy từ phiên đăng nhập,
 * không nhận từ form. Chỉ các trường "về bản thân": tên thật, khu vực, câu
 * phong cách, giới thiệu, link Drive, tag nhận chụp, dịch vụ đi kèm.
 * Hạng, giá, điểm, số buổi, ẩn hiện vẫn do studio quyết trong /admin/tho.
 */
const schema = z.object({
  realName: z.string().trim().max(80).default(""),
  city: z.string().trim().min(1, "Thiếu khu vực").max(40),
  style: z.string().trim().max(160).default(""),
  bio: z.string().trim().max(1000).default(""),
  driveUrl: z.string().trim().max(300).default(""),
  tagIds: z.array(z.string()).default([]),
  features: z.record(z.string(), z.enum(["IN", "EXTRA", "NO"])).default({}),
});

export async function saveOwnProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin({ allowPhotographer: true });
  const photographerId = user.photographerId;
  if (!photographerId) return { error: "Tài khoản này không gắn với Photo nào." };

  const features: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("feature:")) features[k.slice(8)] = String(v);
  }
  const parsed = schema.safeParse({
    realName: formData.get("realName"),
    city: formData.get("city"),
    style: formData.get("style"),
    bio: formData.get("bio"),
    driveUrl: formData.get("driveUrl"),
    tagIds: formData.getAll("tagIds").map(String),
    features,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ" };
  const d = parsed.data;
  if (d.driveUrl && !/^https:\/\/[^\s"<>]+$/i.test(d.driveUrl)) return { error: "Link Drive phải bắt đầu bằng https://" };

  const [tags, featureRows] = await Promise.all([
    db.tag.findMany({ select: { id: true } }),
    db.feature.findMany({ select: { id: true } }),
  ]);
  const tagOk = new Set(tags.map((t) => t.id));
  const featureOk = new Set(featureRows.map((f) => f.id));

  const p = await db.photographer.update({
    where: { id: photographerId },
    data: {
      realName: d.realName,
      city: d.city,
      style: d.style,
      bio: d.bio,
      driveUrl: d.driveUrl,
      tags: {
        deleteMany: {},
        create: d.tagIds.filter((id) => tagOk.has(id)).map((tagId) => ({ tagId })),
      },
      features: {
        deleteMany: {},
        create: Object.entries(d.features)
          .filter(([id]) => featureOk.has(id))
          .map(([featureId, status]) => ({ featureId, status })),
      },
    },
    select: { slug: true },
  });
  await db.auditLog.create({
    data: { actorId: user.id, entity: "photographer", entityId: photographerId, action: "saveOwnProfile" },
  });
  revalidatePublic(p.slug);
  return { error: "", ok: "Đã lưu, trang của bạn ngoài site đổi ngay." };
}
