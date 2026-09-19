"use server";

import { db } from "@/lib/db";
import { requireEditor } from "@/lib/admin-guard";
import { assertAcceptableUpload, deleteImage, processImage } from "@/lib/images";
import { revalidatePublic } from "@/lib/revalidate-public";

export type ActionState = { error: string; ok?: string };

async function writeHero(stem: string, alt: string): Promise<void> {
  await db.siteSetting.upsert({
    where: { key: "hero" },
    update: { value: { stem, alt } },
    create: { key: "hero", value: { stem, alt } },
  });
  revalidatePublic();
}

/** Chọn một ảnh portfolio có sẵn làm hero. Không copy file, chỉ trỏ tới stem. */
export async function setHeroFromPhoto(photoId: string): Promise<ActionState> {
  await requireEditor();
  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { path: true, photographer: { select: { name: true } } },
  });
  if (!photo) return { error: "Không tìm thấy ảnh" };
  await writeHero(photo.path, `Ảnh của ${photo.photographer.name}`);
  return { error: "", ok: "Đã đặt làm ảnh hero" };
}

/**
 * Upload ảnh riêng cho hero, lưu ở brand/hero-<ts>. Ảnh hero cũ do upload
 * (không phải ảnh portfolio) thì xoá file để không rác đĩa.
 */
export async function uploadHero(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireEditor();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Chưa chọn ảnh" };
  try {
    assertAcceptableUpload(file);
  } catch (err) {
    return { error: (err as Error).message };
  }

  const current = await db.siteSetting.findUnique({ where: { key: "hero" } });
  const oldStem = (current?.value as { stem?: string } | null)?.stem ?? "";

  const buf = Buffer.from(await file.arrayBuffer());
  const processed = await processImage(buf, { dir: "brand", id: `hero-${Date.now().toString(36)}` });
  if (processed.width < 1200) {
    // vẫn nhận, nhưng nói rõ vì hero kéo ngang cả màn
    await writeHero(processed.stem, String(formData.get("alt") ?? "").trim().slice(0, 120));
    if (oldStem.startsWith("brand/hero-")) await deleteImage(oldStem).catch(() => {});
    return { error: "", ok: `Đã đặt hero. Ảnh chỉ rộng ${processed.width}px, trên màn to sẽ hơi mềm, nên dùng ảnh từ 1600px.` };
  }

  await writeHero(processed.stem, String(formData.get("alt") ?? "").trim().slice(0, 120));
  if (oldStem.startsWith("brand/hero-")) await deleteImage(oldStem).catch(() => {});
  return { error: "", ok: "Đã đặt ảnh hero mới" };
}

/** Bỏ chọn: trang chủ quay về lấy ảnh portfolio đầu tiên. */
export async function clearHero(): Promise<void> {
  await requireEditor();
  const current = await db.siteSetting.findUnique({ where: { key: "hero" } });
  const oldStem = (current?.value as { stem?: string } | null)?.stem ?? "";
  await writeHero("", "");
  if (oldStem.startsWith("brand/hero-")) await deleteImage(oldStem).catch(() => {});
}
