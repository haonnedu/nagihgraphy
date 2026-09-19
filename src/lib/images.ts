// Không dùng "server-only" ở đây vì prisma/seed.ts chạy bằng tsx ngoài Next
// cũng cần file này. Client đã được bảo vệ bằng cách chỉ import image-paths.ts.
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { IMAGE_WIDTHS } from "@/lib/image-paths";

/**
 * Xử lý ảnh bằng sharp. Chỉ chạy trên server.
 * Phần tính đường dẫn nằm ở image-paths.ts để client dùng chung được.
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export function photographerDir(photographerId: string): string {
  return path.posix.join("photographers", photographerId);
}

export type ProcessedImage = {
  /** đường dẫn tương đối không hậu tố, lưu vào Photo.path */
  stem: string;
  width: number;
  height: number;
};

/**
 * Nhận buffer ảnh, ghi bản gốc và ba bản WebP vào UPLOAD_DIR.
 * Trả về stem để lưu database. Ảnh nhỏ hơn một cỡ thì không phóng to.
 *
 * `dir` là thư mục tương đối, VD "photographers/<id>" hoặc "brand".
 */
export async function processImage(
  input: Buffer,
  opts: { dir: string; id?: string },
): Promise<ProcessedImage> {
  const id = opts.id || randomBytes(8).toString("hex");
  const root = uploadDir();
  const stem = path.posix.join(opts.dir, id);

  const meta = await sharp(input, { failOn: "error" }).rotate().metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Không đọc được kích thước ảnh.");
  }

  await mkdir(path.join(root, opts.dir), { recursive: true });
  await mkdir(path.join(root, "originals", opts.dir), { recursive: true });

  const originalExt = meta.format === "png" ? "png" : meta.format === "webp" ? "webp" : "jpg";
  await writeFile(path.join(root, "originals", opts.dir, `${id}.${originalExt}`), input);

  for (const width of IMAGE_WIDTHS) {
    const buf = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await writeFile(path.join(root, `${stem}-${width}.webp`), buf);
  }

  return { stem, width: meta.width, height: meta.height };
}

export function assertAcceptableUpload(file: { type: string; size: number }): void {
  if (!ACCEPTED.has(file.type)) {
    throw new Error("Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ảnh quá nặng, tối đa 20 MB.");
  }
}

/** Xoá toàn bộ file của một ảnh khi admin gỡ ảnh khỏi thợ. */
export async function deleteImage(stem: string): Promise<void> {
  const root = uploadDir();
  const dir = path.posix.dirname(stem);
  const id = path.posix.basename(stem);
  await Promise.all([
    ...IMAGE_WIDTHS.map((w) => rm(path.join(root, `${stem}-${w}.webp`), { force: true })),
    ...["jpg", "png", "webp"].map((ext) =>
      rm(path.join(root, "originals", dir, `${id}.${ext}`), { force: true }),
    ),
  ]);
}
