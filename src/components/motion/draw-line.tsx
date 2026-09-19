"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

/**
 * Đường kẻ nối các bước, vẽ dần theo tiến độ cuộn qua khối cha.
 * Đặt absolute phía sau danh sách bước.
 */
export function DrawLine({
  orientation = "horizontal",
  className = "",
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 60%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });

  const horizontal = orientation === "horizontal";

  return (
    <div ref={ref} aria-hidden className={`pointer-events-none absolute ${className}`}>
      <div
        className={`absolute rounded-full bg-line ${horizontal ? "inset-x-0 top-1/2 h-1 -translate-y-1/2" : "inset-y-0 left-1/2 w-1 -translate-x-1/2"}`}
      />
      <motion.div
        style={reduced ? undefined : horizontal ? { scaleX: progress } : { scaleY: progress }}
        className={`absolute rounded-full bg-blue ${
          horizontal
            ? "inset-x-0 top-1/2 h-1 origin-left -translate-y-1/2"
            : "inset-y-0 left-1/2 w-1 origin-top -translate-x-1/2"
        }`}
      />
    </div>
  );
}
