/**
 * Chuẩn bị ảnh ở trình duyệt trước khi Photo nộp ảnh trường.
 *
 * - HEIC/HEIF (iPhone) chuyển sang JPEG bằng heic2any, chỉ tải thư viện khi
 *   thật sự gặp file HEIC (thư viện nặng, ~1 MB). Server không giải mã HEIC.
 * - Ảnh nào có cạnh dài quá 2560px thì thu nhỏ rồi nén lại JPEG 0.9, để 5 ảnh
 *   gốc 8–10 MB gửi một lần vẫn dưới giới hạn 25 MB của server action.
 * - Ảnh JPEG đã nhỏ (≤ 2560px, ≤ 2,5 MB) giữ nguyên, khỏi nén hai lần.
 *
 * Gọi tuần tự từng ảnh một: điện thoại giải mã 5 ảnh 12 MP cùng lúc dễ hết RAM.
 */

/** Cạnh dài tối đa sau khi thu nhỏ. Server vẫn tự resize về 1600/800/400. */
export const PREP_MAX_EDGE = 2560;
/** JPEG nhỏ hơn mức này và không quá cạnh dài thì gửi nguyên file. */
const KEEP_AS_IS_BYTES = 2.5 * 1024 * 1024;
const JPEG_QUALITY = 0.9;

export class PrepError extends Error {}

/** Có trình duyệt (Chrome trên Windows) trả type rỗng cho file HEIC, nên xét cả đuôi file. */
export function isHeic(file: File): boolean {
  return /^image\/hei[cf](-sequence)?$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/** Đổi đuôi file thành .jpg, giữ tên để Photo còn nhận ra ảnh nào. */
function jpgName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "anh";
  return `${base}.jpg`;
}

async function heicToJpeg(file: File): Promise<Blob> {
  try {
    // heic2any đụng tới window ngay khi nạp, nên chỉ import lúc chạy ở trình duyệt.
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const blob = Array.isArray(out) ? out[0] : out;
    if (!blob) throw new Error("empty");
    return blob;
  } catch {
    throw new PrepError(
      `Không chuyển được ảnh HEIC "${file.name}" sang JPEG. Thử chọn lại, hoặc trên iPhone vào Cài đặt › Camera › Định dạng, chọn "Tương thích nhất".`,
    );
  }
}

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

/**
 * Giải mã ảnh, xoay theo EXIF. createImageBitmap với imageOrientation là
 * đường chính; trình duyệt cũ không nhận tuỳ chọn đó thì dùng thẻ <img>
 * (trình duyệt hiện nay tự xoay <img> theo EXIF).
 */
async function decode(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // rơi xuống cách dùng <img>
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

async function encodeJpeg(src: Decoded, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src.source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("toBlob null");
    return blob;
  } finally {
    // Safari giữ bộ nhớ canvas tới khi GC; đặt về 0 để nhả ngay.
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Trả về File sẵn sàng gửi lên server: JPEG/PNG/WebP, cạnh dài ≤ 2560px.
 * Ném PrepError với câu tiếng Việt nếu không đọc được ảnh.
 */
export async function prepareImage(file: File): Promise<File> {
  const heic = isHeic(file);
  if (!heic && file.type && !file.type.startsWith("image/")) {
    throw new PrepError(`"${file.name}" không phải file ảnh.`);
  }

  const blob: Blob = heic ? await heicToJpeg(file) : file;
  const type = heic ? "image/jpeg" : file.type;

  let decoded: Decoded;
  try {
    decoded = await decode(blob);
  } catch {
    throw new PrepError(`Không đọc được ảnh "${file.name}". Thử chọn lại hoặc gửi ảnh JPEG.`);
  }

  try {
    const { width, height } = decoded;
    const longEdge = Math.max(width, height);
    if (longEdge <= PREP_MAX_EDGE && type === "image/jpeg" && blob.size <= KEEP_AS_IS_BYTES) {
      return heic ? new File([blob], jpgName(file.name), { type: "image/jpeg" }) : file;
    }
    const scale = Math.min(1, PREP_MAX_EDGE / longEdge);
    const out = await encodeJpeg(decoded, Math.round(width * scale), Math.round(height * scale));
    return new File([out], jpgName(file.name), { type: "image/jpeg" });
  } catch (err) {
    if (err instanceof PrepError) throw err;
    throw new PrepError(`Không thu nhỏ được ảnh "${file.name}". Thử chọn lại hoặc gửi ảnh nhỏ hơn.`);
  } finally {
    decoded.close();
  }
}
