"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Photo } from "@/components/photo";

/**
 * Ảnh hero tràn màn, trôi chậm hơn trang khi cuộn.
 *
 * Ảnh cao hơn khung 18% để khi trôi không hở mép. Đây là phần tử LCP của
 * trang chủ nên tải với priority và lấy thẳng bản 1600px, không lazy.
 */
export function HeroParallax({
  path,
  alt,
  children,
}: {
  path: string;
  alt: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);

  return (
    <div ref={ref} className="relative isolate overflow-hidden">
      <motion.div
        aria-hidden
        style={reduced ? undefined : { y }}
        className="absolute inset-x-0 -top-[9%] h-[118%]"
      >
        <Photo
          path={path}
          alt={alt}
          sizes="100vw"
          fallbackWidth={1600}
          priority
          className="size-full object-cover"
        />
      </motion.div>

      {/* Lớp phủ để chữ trắng luôn đọc được, đậm dần về phía dưới */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/45 to-ink/75"
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
