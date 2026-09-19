"use client";

import { useEffect } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Lenis làm mượt cuộn trang. Không dùng transform lên body nên thanh header
 * sticky và thanh chốt giá fixed vẫn hoạt động bình thường.
 *
 * Tắt hoàn toàn khi người dùng bật giảm chuyển động, và trên thiết bị cảm ứng
 * vì cuộn quán tính gốc của điện thoại đã tốt sẵn, chèn thêm chỉ gây lag.
 */
export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (window.matchMedia("(hover: none)").matches) return;

    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let frame = 0;
    let cancelled = false;

    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ duration: 0.9, smoothWheel: true });
      const loop = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, [reduced]);

  return null;
}
