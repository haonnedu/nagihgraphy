"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Hiện dần khi cuộn tới. Chỉ animate transform và opacity để không bắt
 * trình duyệt tính lại layout, đúng ngân sách hiệu năng trong PLAN.md mục 5.
 */

type Direction = "up" | "left" | "right" | "none";

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  left: { x: -28, y: 0 },
  right: { x: 28, y: 0 },
  none: { x: 0, y: 0 },
};

export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className,
}: {
  children: ReactNode;
  delay?: number;
  direction?: Direction;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  const from = OFFSET[direction];
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: from.x, y: from.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Bọc một lưới để các con hiện lần lượt. Con phải là <RevealItem>. */
export function RevealGroup({
  children,
  className,
  stagger = 0.07,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ shown: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 26, scale: 0.97 },
        shown: { opacity: 1, y: 0, scale: 1 },
      }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
