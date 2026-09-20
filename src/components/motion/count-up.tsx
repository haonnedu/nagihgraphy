"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * Đếm số tăng dần khi khối lọt vào màn hình.
 *
 * `value` là chuỗi đã định dạng sẵn phía server (VD "2.500.000đ" hoặc "398").
 * Server luôn render đúng chuỗi đó nên không lệch hydrate; sau khi hydrate
 * xong mới hạ về 0 rồi đếm lên. Chuỗi không thuần số thì hiện thẳng.
 */
export function CountUp({ value, duration = 900 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();

  // Tách phần số nguyên ở đầu và hậu tố phía sau, VD "2.200.000đ" -> 2200000 và "đ",
  // "120+" -> 120 và "+". Chỉ nhận số nguyên có dấu chấm ngăn hàng nghìn; số thập
  // phân kiểu "1,2 triệu" hay chuỗi lạ thì hiện thẳng, không đếm, để không ra
  // "12triệu" giữa chừng. Hậu tố giữ nguyên khoảng trắng đứng trước.
  const match = /^(\d{1,3}(?:\.\d{3})+|\d+)(\D*)$/.exec(value.trim());
  const target = match ? Number(match[1].replace(/\./g, "")) : NaN;
  const suffix = match?.[2] ?? "";
  const countable = Number.isFinite(target) && target > 0 && !reduced;

  // null = dùng nguyên chuỗi từ server, giữ cho lần render đầu khớp SSR
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!countable || !inView) return;

    // Số chỉ đổi bên trong rAF, không gán state thẳng trong thân effect.
    let start: number | undefined;
    let frame = 0;

    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // chậm dần về đích
      if (t < 1) {
        setDisplay(Math.round(target * eased).toLocaleString("vi-VN") + suffix);
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [countable, inView, target, suffix, duration, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display ?? value}
    </span>
  );
}
