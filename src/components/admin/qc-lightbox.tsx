"use client";

import { useEffect, useRef, useState, type PointerEvent, type MouseEvent } from "react";
import { Photo } from "@/components/photo";
import { photoSrc, photoSrcSet } from "@/lib/image-paths";

/**
 * Ảnh nhỏ bấm vào thì mở ảnh lớn trong lớp phủ. Dùng cho hàng đợi duyệt và
 * lưới ảnh trường trong admin. Ảnh chờ duyệt chỉ có WebP, nên không dùng
 * bản JPEG fallback ở đây.
 */
export function QcZoomImage({
  stem,
  alt,
  width,
  height,
  sizes = "160px",
  className = "",
}: {
  stem: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Xem ảnh lớn: ${alt}`}
        className={`block overflow-hidden bg-sunk focus-visible:outline-2 focus-visible:outline-blue ${className}`}
      >
        <Photo path={stem} alt={alt} width={width} height={height} sizes={sizes} fallbackWidth={400} className="size-full object-cover" />
      </button>
      {open && <QcLightbox stem={stem} alt={alt} width={width} height={height} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * Lớp phủ ảnh lớn. Chỉ đóng khi cả lúc nhấn chuột (pointerdown) và lúc thả
 * (click) đều rơi đúng vào nền tối, hoặc bấm X, hoặc Escape. Bôi đen chữ rồi
 * kéo chuột ra nền tối không làm lớp phủ tự đóng.
 */
export function QcLightbox({
  stem,
  alt,
  width,
  height,
  onClose,
}: {
  stem: string;
  alt: string;
  width: number;
  height: number;
  onClose: () => void;
}) {
  const downOnBackdrop = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Giữ hàm đóng mới nhất trong ref để effect chỉ chạy một lần lúc mở,
  // không cướp lại focus mỗi khi trang cha vẽ lại.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    // Khoá cuộn trang phía sau khi đang xem ảnh.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    downOnBackdrop.current = e.target === e.currentTarget;
  }

  function onClick(e: MouseEvent<HTMLDivElement>) {
    const both = downOnBackdrop.current && e.target === e.currentTarget;
    downOnBackdrop.current = false;
    if (both) onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onPointerDown={onPointerDown}
      onClick={onClick}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-3 sm:p-6"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="absolute right-3 top-[calc(env(safe-area-inset-top,0px)+12px)] grid size-10 place-items-center rounded-full bg-surface text-xl text-ink shadow-card hover:bg-sunk"
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh đã resize sẵn 3 cỡ WebP lúc upload, xem src/lib/images.ts */}
      <img
        src={photoSrc(stem, 1600)}
        srcSet={photoSrcSet(stem)}
        sizes="92vw"
        alt={alt}
        width={width || undefined}
        height={height || undefined}
        decoding="async"
        className="max-h-[88vh] w-auto max-w-full rounded-lg object-contain"
      />
    </div>
  );
}
