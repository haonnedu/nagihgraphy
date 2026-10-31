import { photoJpegSrc, photoSrcSet } from "@/lib/image-paths";

/**
 * Ảnh trường: WebP 3 cỡ qua <source>, JPEG 800 làm fallback cho trình duyệt
 * không đọc WebP. Giữ width/height để trình duyệt chừa chỗ trước, không nhảy
 * layout. Ảnh dưới màn hình đầu thì lazy.
 */
export function SchoolPicture({
  stem,
  width,
  height,
  alt,
  sizes,
  eager = false,
  priority = false,
  className,
}: {
  stem: string;
  width: number;
  height: number;
  alt: string;
  /** giá trị sizes, quyết định trình duyệt chọn cỡ nào trong srcset */
  sizes: string;
  /** ảnh ở màn hình đầu: tải ngay, không lazy */
  eager?: boolean;
  /**
   * ảnh nhiều khả năng là LCP: fetchPriority high. Chỉ 1–2 ảnh một trang,
   * đánh dấu nhiều thì gợi ý ưu tiên mất tác dụng.
   */
  priority?: boolean;
  /** class cho thẻ img */
  className?: string;
}) {
  return (
    <picture>
      <source type="image/webp" srcSet={photoSrcSet(stem)} sizes={sizes} />
      <img
        src={photoJpegSrc(stem)}
        alt={alt}
        width={width || undefined}
        height={height || undefined}
        loading={eager || priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className={className}
      />
    </picture>
  );
}

/** Ô giữ chỗ khi trường chưa có ảnh: hiện mã trường (TMU, NEU…). */
export function SchoolPlaceholder({
  short,
  name,
  className,
  small = false,
}: {
  short: string;
  name: string;
  className?: string;
  /** ô vuông nhỏ ở khu "Sắp có ảnh": chữ nhỏ để mã 4 ký tự như HUST, ULIS không tràn */
  small?: boolean;
}) {
  const size = small ? "text-[17px] tracking-normal" : "text-[clamp(22px,5vw,30px)] tracking-wide";
  return (
    <div
      className={`grid place-items-center overflow-hidden bg-blue-soft font-serif font-semibold text-blue/70 ${size} ${className ?? ""}`}
    >
      {short || name.charAt(0)}
    </div>
  );
}
