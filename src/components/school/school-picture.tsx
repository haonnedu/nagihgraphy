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
  onLoad,
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
  /** gọi khi ảnh tải xong, dùng cho card chạy vòng để không chuyển sang ảnh còn trống */
  onLoad?: () => void;
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
        onLoad={onLoad}
      />
    </picture>
  );
}

/** Ô giữ chỗ khi trường chưa có ảnh: hiện mã trường (TMU, NEU…). */
export function SchoolPlaceholder({ short, name, className }: { short: string; name: string; className?: string }) {
  return (
    <div
      className={`grid place-items-center overflow-hidden bg-blue-soft font-serif text-[clamp(22px,5vw,30px)] font-semibold tracking-wide text-blue/70 ${className ?? ""}`}
    >
      {short || name.charAt(0)}
    </div>
  );
}
