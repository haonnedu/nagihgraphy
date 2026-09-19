import { photoSrc, photoSrcSet, type ImageWidth } from "@/lib/image-paths";

type Props = {
  path: string;
  alt: string;
  width?: number;
  height?: number;
  /** giá trị cho thuộc tính sizes, quyết định trình duyệt chọn cỡ nào */
  sizes?: string;
  fallbackWidth?: ImageWidth;
  className?: string;
  priority?: boolean;
};

/**
 * Ảnh đã được sharp resize sẵn thành ba cỡ WebP lúc upload, nên không dùng
 * next/image mà dùng thẻ img với srcset. Giữ width/height để tránh nhảy layout.
 */
export function Photo({
  path,
  alt,
  width,
  height,
  sizes = "(min-width: 1000px) 280px, (min-width: 720px) 33vw, 50vw",
  fallbackWidth = 800,
  className,
  priority = false,
}: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ảnh đã resize sẵn 3 cỡ WebP lúc upload, xem src/lib/images.ts
    <img
      src={photoSrc(path, fallbackWidth)}
      srcSet={photoSrcSet(path)}
      sizes={sizes}
      alt={alt}
      width={width || undefined}
      height={height || undefined}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
      className={className}
    />
  );
}

/** Ô giữ chỗ khi thợ chưa có ảnh nào. */
export function PhotoPlaceholder({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={`grid place-items-center bg-sunk font-serif text-3xl text-ink-3 ${className ?? ""}`}
    >
      {(name || "?").charAt(0)}
    </div>
  );
}
