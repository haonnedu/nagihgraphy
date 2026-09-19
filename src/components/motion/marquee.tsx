"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Dải chạy ngang vô tận, thuần CSS nên không tốn JS mỗi khung hình.
 * Nội dung được nhân đôi để nối liền mạch; bản sao thứ hai ẩn với trình đọc
 * màn hình. Dừng khi rê chuột, và đứng yên hẳn khi giảm chuyển động.
 */
export function Marquee({
  children,
  speed = 42,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  reverse?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={`no-scrollbar flex gap-4 overflow-x-auto ${className}`}>{children}</div>;
  }

  return (
    <div className={`group relative flex overflow-hidden ${className}`}>
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className="flex shrink-0 gap-4 pr-4 motion-safe:animate-[marquee_linear_infinite] group-hover:[animation-play-state:paused]"
          style={{
            animationDuration: `${speed}s`,
            animationDirection: reverse ? "reverse" : "normal",
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
