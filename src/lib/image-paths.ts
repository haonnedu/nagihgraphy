/**
 * Chỉ tính đường dẫn ảnh, không đụng tới sharp hay filesystem.
 * Tách riêng khỏi images.ts để client component import được mà không kéo
 * sharp (module chỉ chạy được trên Node) vào bundle trình duyệt.
 */

/** Ba cỡ public. Ảnh gốc giữ riêng trong originals/, không serve ra ngoài. */
export const IMAGE_WIDTHS = [400, 800, 1600] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

/**
 * Dùng NEXT_PUBLIC_ để giá trị được nhúng vào bundle client. Bỏ trống thì
 * mặc định /uploads, khớp với route serve ảnh và cấu hình Traefik.
 */
export function publicUploadBase(): string {
  return process.env.NEXT_PUBLIC_UPLOAD_BASE || "/uploads";
}

/**
 * `stem` là đường dẫn tương đối không có hậu tố cỡ, VD:
 *   photographers/abc123/def456
 * Hàm này ghép thành URL công khai cho một cỡ cụ thể.
 */
export function photoSrc(stem: string, width: ImageWidth = 800): string {
  return `${publicUploadBase()}/${stem}-${width}.webp`;
}

export function photoSrcSet(stem: string): string {
  return IMAGE_WIDTHS.map((w) => `${photoSrc(stem, w)} ${w}w`).join(", ");
}
