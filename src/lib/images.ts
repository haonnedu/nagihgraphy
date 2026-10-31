// Không dùng "server-only" ở đây vì prisma/seed.ts chạy bằng tsx ngoài Next
// cũng cần file này. Client đã được bảo vệ bằng cách chỉ import image-paths.ts.
import { randomBytes } from "node:crypto";
import { access, mkdir, writeFile, rm, rename, copyFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Server 2 GB RAM: không giữ cache libvips và xử lý từng ảnh một, để một đợt
// upload nhiều ảnh điện thoại 6000px không đẩy bộ nhớ vượt trần container.
sharp.cache(false);
sharp.concurrency(1);
import { IMAGE_WIDTHS, JPEG_FALLBACK_WIDTH } from "@/lib/image-paths";

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

/** Ảnh trường Photo vừa nộp, chưa duyệt. Route /uploads chỉ trả cho người đăng nhập. */
export function pendingDir(photographerId: string): string {
  return path.posix.join("pending", photographerId);
}

/** Ảnh trường đã duyệt, công khai. */
export function schoolDir(schoolId: string): string {
  return path.posix.join("schools", schoolId);
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
 * `jpegFallback` ghi thêm `${stem}-800.jpg` cho trình duyệt cũ không đọc WebP
 * (ảnh trường dùng, portfolio thì không cần).
 */
export async function processImage(
  input: Buffer,
  opts: { dir: string; id?: string; jpegFallback?: boolean },
): Promise<ProcessedImage> {
  const id = opts.id || randomBytes(8).toString("hex");
  const root = uploadDir();
  const stem = path.posix.join(opts.dir, id);

  // metadata() trả kích thước TRƯỚC khi xoay theo EXIF (kể cả gọi .rotate()),
  // nên lấy autoOrient: ảnh dọc chụp điện thoại (Orientation 5–8) mới đúng chiều
  // với bản WebP đã xoay.
  const meta = await sharp(input, { failOn: "error" }).metadata();
  const width = meta.autoOrient?.width ?? meta.width;
  const height = meta.autoOrient?.height ?? meta.height;
  if (!width || !height) {
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

  if (opts.jpegFallback) {
    const buf = await sharp(input)
      .rotate()
      .resize({ width: JPEG_FALLBACK_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    await writeFile(path.join(root, `${stem}-${JPEG_FALLBACK_WIDTH}.jpg`), buf);
  }

  return { stem, width, height };
}

export function assertAcceptableUpload(file: { type: string; size: number; name?: string }): void {
  // Server không giải mã HEIC (sharp dựng sẵn không có HEVC); trình duyệt của Photo
  // phải chuyển sang JPEG trước. Tới được đây nghĩa là bước chuyển ở client đã hỏng.
  if (/^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name ?? "")) {
    throw new Error("Ảnh HEIC cần được chuyển sang JPEG trước khi gửi, hãy tải lại trang và thử lại.");
  }
  if (!ACCEPTED.has(file.type)) {
    throw new Error("Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ảnh quá nặng, tối đa 20 MB.");
  }
}

const ORIGINAL_EXTS = ["jpg", "png", "webp"] as const;

/** Mọi file của một stem, tương đối với UPLOAD_DIR: 3 WebP, JPEG fallback, bản gốc. */
function filesOfStem(stem: string): string[] {
  const dir = path.posix.dirname(stem);
  const id = path.posix.basename(stem);
  return [
    ...IMAGE_WIDTHS.map((w) => `${stem}-${w}.webp`),
    `${stem}-${JPEG_FALLBACK_WIDTH}.jpg`,
    ...ORIGINAL_EXTS.map((ext) => path.posix.join("originals", dir, `${id}.${ext}`)),
  ];
}

/** Xoá toàn bộ file của một ảnh khi admin gỡ ảnh khỏi thợ, kể cả JPEG fallback. */
export async function deleteImage(stem: string): Promise<void> {
  const root = uploadDir();
  await Promise.all(filesOfStem(stem).map((f) => rm(path.join(root, f), { force: true })));
}

/**
 * Chuyển mọi file của một stem sang thư mục khác, giữ nguyên id. Dùng khi
 * duyệt ảnh trường: pending/<photographerId>/<id> → schools/<schoolId>/<id>.
 * File phụ nào không có (VD ảnh không có bản fallback) thì bỏ qua, nhưng
 * thiếu bản WebP nào thì ném lỗi trước khi chuyển gì, để bên gọi hoàn lại DB
 * thay vì tạo ảnh trỏ vào file không tồn tại. Trả về stem mới.
 */
export async function moveImage(stem: string, toDir: string): Promise<string> {
  const root = uploadDir();
  const id = path.posix.basename(stem);
  const next = path.posix.join(toDir, id);
  if (next === stem) return stem;
  await mkdir(path.join(root, toDir), { recursive: true });
  await mkdir(path.join(root, "originals", toDir), { recursive: true });

  const from = filesOfStem(stem);
  const to = filesOfStem(next);

  // filesOfStem đặt các bản WebP lên đầu danh sách: đó là file bắt buộc.
  for (const f of from.slice(0, IMAGE_WIDTHS.length)) {
    try {
      await access(path.join(root, f));
    } catch {
      throw new Error(`Thiếu file ảnh ${f}`);
    }
  }
  for (let i = 0; i < from.length; i++) {
    const src = path.join(root, from[i]);
    const dst = path.join(root, to[i]);
    try {
      await rename(src, dst);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") continue;
      // Khác ổ đĩa (EXDEV) thì chép rồi xoá.
      if (code === "EXDEV") {
        await copyFile(src, dst);
        await rm(src, { force: true });
        continue;
      }
      throw err;
    }
  }
  return next;
}
