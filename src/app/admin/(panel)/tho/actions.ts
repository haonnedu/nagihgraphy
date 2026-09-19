"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/admin-guard";
import { assertAcceptableUpload, deleteImage, photographerDir, processImage } from "@/lib/images";
import { revalidatePublic } from "@/lib/revalidate-public";
import { slugify } from "@/lib/slug";

export type ActionState = { error: string; ok?: string };

const photographerSchema = z.object({
  id: z.string().default(""),
  name: z.string().trim().min(1, "Thiếu tên thợ").max(60),
  tierId: z.string().min(1, "Chọn hạng ekip"),
  city: z.string().trim().min(1, "Thiếu khu vực").max(40),
  style: z.string().trim().max(160).default(""),
  bio: z.string().trim().max(1000).default(""),
  rating: z.coerce.number().min(0).max(5).default(0),
  sessions: z.coerce.number().int().min(0).default(0),
  priceOverride: z.coerce.number().int().min(0).default(0),
  driveUrl: z.string().trim().max(300).default(""),
  zalo: z.string().trim().max(30).default(""),
  phone: z.string().trim().max(30).default(""),
  facebook: z.string().trim().max(300).default(""),
  instagram: z.string().trim().max(300).default(""),
  published: z.coerce.boolean().default(false),
  isSample: z.coerce.boolean().default(false),
  tagIds: z.array(z.string()).default([]),
  /** featureId -> IN | EXTRA | NO */
  features: z.record(z.string(), z.enum(["IN", "EXTRA", "NO"])).default({}),
});

function readForm(formData: FormData) {
  const features: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("feature:")) features[k.slice(8)] = String(v);
  }
  return photographerSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    tierId: formData.get("tierId"),
    city: formData.get("city"),
    style: formData.get("style"),
    bio: formData.get("bio"),
    rating: formData.get("rating"),
    sessions: formData.get("sessions"),
    priceOverride: formData.get("priceOverride") || 0,
    driveUrl: formData.get("driveUrl"),
    zalo: formData.get("zalo"),
    phone: formData.get("phone"),
    facebook: formData.get("facebook"),
    instagram: formData.get("instagram"),
    published: formData.get("published") === "on",
    isSample: formData.get("isSample") === "on",
    tagIds: formData.getAll("tagIds").map(String),
    features,
  });
}

async function uniqueSlugFor(name: string, excludeId: string): Promise<string> {
  const base = slugify(name) || "tho";
  let slug = base;
  for (let n = 2; ; n += 1) {
    const clash = await db.photographer.findFirst({ where: { slug, NOT: { id: excludeId || undefined } }, select: { id: true } });
    if (!clash) return slug;
    slug = `${base}-${n}`;
  }
}

/** Tạo mới hoặc cập nhật thợ. Tạo mới xong thì chuyển sang trang sửa để upload ảnh. */
export async function savePhotographer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireEditor();
  const parsed = readForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ" };
  const d = parsed.data;

  const data = {
    name: d.name,
    tierId: d.tierId,
    city: d.city,
    style: d.style,
    bio: d.bio,
    rating: d.rating,
    sessions: d.sessions,
    priceOverride: d.priceOverride,
    driveUrl: d.driveUrl,
    zalo: d.zalo,
    phone: d.phone,
    facebook: d.facebook,
    instagram: d.instagram,
    published: d.published,
    isSample: d.isSample,
  };

  let id = d.id;
  let slug: string;

  if (id) {
    const existing = await db.photographer.findUnique({ where: { id }, select: { slug: true, name: true } });
    if (!existing) return { error: "Không tìm thấy thợ này" };
    // Đổi tên thì đổi slug theo, để link /tho/<slug> đọc được.
    slug = existing.name === d.name ? existing.slug : await uniqueSlugFor(d.name, id);
    await db.photographer.update({ where: { id }, data: { ...data, slug } });
    if (existing.slug !== slug) revalidatePublic(existing.slug);
  } else {
    slug = await uniqueSlugFor(d.name, "");
    const last = await db.photographer.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    const created = await db.photographer.create({
      data: { ...data, slug, order: (last?.order ?? -1) + 1 },
      select: { id: true },
    });
    id = created.id;
  }

  await db.photographerTag.deleteMany({ where: { photographerId: id } });
  if (d.tagIds.length) {
    await db.photographerTag.createMany({ data: d.tagIds.map((tagId) => ({ photographerId: id, tagId })) });
  }

  await db.photographerFeature.deleteMany({ where: { photographerId: id } });
  const featureRows = Object.entries(d.features).map(([featureId, status]) => ({ photographerId: id, featureId, status }));
  if (featureRows.length) await db.photographerFeature.createMany({ data: featureRows });

  revalidatePublic(slug);
  if (!d.id) redirect(`/admin/tho/${id}?created=1`);
  return { error: "", ok: "Đã lưu" };
}

export async function togglePublished(id: string): Promise<void> {
  await requireEditor();
  const p = await db.photographer.findUnique({ where: { id }, select: { published: true, slug: true } });
  if (!p) return;
  await db.photographer.update({ where: { id }, data: { published: !p.published } });
  revalidatePublic(p.slug);
}

export async function movePhotographer(id: string, direction: "up" | "down"): Promise<void> {
  await requireEditor();
  const all = await db.photographer.findMany({ orderBy: { order: "asc" }, select: { id: true } });
  const i = all.findIndex((p) => p.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((p, order) => db.photographer.update({ where: { id: p.id }, data: { order } })));
  revalidatePublic();
}

/** Nhận nhiều file từ input multiple, resize bằng sharp, thêm vào cuối danh sách ảnh. */
export async function uploadPhotos(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireEditor();
  const photographerId = String(formData.get("photographerId") ?? "");
  const p = await db.photographer.findUnique({ where: { id: photographerId }, select: { id: true, slug: true, name: true } });
  if (!p) return { error: "Không tìm thấy thợ" };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Chưa chọn ảnh nào" };

  const last = await db.photo.findFirst({ where: { photographerId }, orderBy: { order: "desc" }, select: { order: true } });
  let order = (last?.order ?? -1) + 1;
  let added = 0;

  for (const file of files) {
    try {
      assertAcceptableUpload(file);
      const buf = Buffer.from(await file.arrayBuffer());
      const processed = await processImage(buf, { dir: photographerDir(p.id) });
      await db.photo.create({
        data: {
          photographerId,
          path: processed.stem,
          width: processed.width,
          height: processed.height,
          alt: `Ảnh portfolio của ${p.name}`,
          order: order++,
        },
      });
      added += 1;
    } catch (err) {
      return { error: `${file.name}: ${(err as Error).message}`, ok: added ? `Đã thêm ${added} ảnh trước đó` : undefined };
    }
  }

  revalidatePublic(p.slug);
  return { error: "", ok: `Đã thêm ${added} ảnh` };
}

export async function deletePhoto(photoId: string): Promise<void> {
  await requireEditor();
  const photo = await db.photo.findUnique({ where: { id: photoId }, include: { photographer: { select: { slug: true } } } });
  if (!photo) return;
  await db.photo.delete({ where: { id: photoId } });
  await deleteImage(photo.path).catch(() => {});
  revalidatePublic(photo.photographer.slug);
}

export async function movePhoto(photoId: string, direction: "up" | "down"): Promise<void> {
  await requireEditor();
  const photo = await db.photo.findUnique({ where: { id: photoId }, select: { photographerId: true } });
  if (!photo) return;
  const all = await db.photo.findMany({ where: { photographerId: photo.photographerId }, orderBy: { order: "asc" }, select: { id: true } });
  const i = all.findIndex((x) => x.id === photoId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((x, order) => db.photo.update({ where: { id: x.id }, data: { order } })));
  const p = await db.photographer.findUnique({ where: { id: photo.photographerId }, select: { slug: true } });
  revalidatePublic(p?.slug);
}

/** Ảnh bìa là ảnh có order 0. */
export async function setCover(photoId: string): Promise<void> {
  await requireEditor();
  const photo = await db.photo.findUnique({ where: { id: photoId }, select: { photographerId: true } });
  if (!photo) return;
  const all = await db.photo.findMany({ where: { photographerId: photo.photographerId }, orderBy: { order: "asc" }, select: { id: true } });
  const rest = all.filter((x) => x.id !== photoId);
  const ordered = [{ id: photoId }, ...rest];
  await db.$transaction(ordered.map((x, order) => db.photo.update({ where: { id: x.id }, data: { order } })));
  const p = await db.photographer.findUnique({ where: { id: photo.photographerId }, select: { slug: true } });
  revalidatePublic(p?.slug);
}

export async function deletePhotographer(id: string): Promise<void> {
  await requireEditor();
  const p = await db.photographer.findUnique({ where: { id }, include: { photos: { select: { path: true } } } });
  if (!p) return;
  await db.photographer.delete({ where: { id } }); // photos, tags, features xoá theo cascade
  await Promise.all(p.photos.map((ph) => deleteImage(ph.path).catch(() => {})));
  revalidatePublic(p.slug);
  redirect("/admin/tho");
}
