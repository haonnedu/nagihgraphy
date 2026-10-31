"use client";

import type { ReactNode } from "react";

/** Chip lọc dạng viên, cùng kiểu với bộ lọc ở /tho. */
export function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={
        on
          ? "inline-flex items-center gap-1.5 rounded-full border border-blue bg-blue px-3 py-1.5 text-[13px] text-white"
          : "inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-3 py-1.5 text-[13px] hover:border-blue"
      }
    >
      {children}
    </button>
  );
}
