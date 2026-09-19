import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Primitive giao diện, theo đúng palette và hình khối của bản artifact gốc:
 * viền mảnh, bo góc vừa, bóng mờ. API giữ nguyên để các trang không phải sửa.
 */

/** Màu nhấn xoay vòng cho tag và badge. */
export const ACCENTS = ["blue", "orange", "green"] as const;
export type Accent = (typeof ACCENTS)[number];

export function accentAt(index: number): Accent {
  return ACCENTS[index % ACCENTS.length];
}

const ACCENT_SOFT: Record<Accent, string> = {
  blue: "border-blue-soft bg-blue-soft text-blue-deep",
  orange: "border-extra-line bg-extra-bg text-extra-ink",
  green: "border-in-line bg-in-bg text-in-ink",
};

/**
 * Bản cũ không nghiêng card. Giữ hàm để các trang gọi được như trước,
 * nhưng trả chuỗi rỗng.
 */
export function tiltAt(_index: number): string {
  void _index;
  return "";
}

// ---------------------------------------------------------------- nút

type ButtonTone = "orange" | "blue" | "green" | "paper";

const TONE: Record<ButtonTone, string> = {
  orange: "border-cta bg-cta text-white hover:bg-cta-hover hover:border-cta-hover",
  blue: "border-blue bg-blue text-white hover:bg-blue-deep hover:border-blue-deep",
  green: "border-in-ink bg-in-ink text-white",
  paper: "border-line-2 bg-surface text-ink hover:border-ink-3",
};

const SIZE = {
  sm: "px-3 py-1.5 text-[12.5px] rounded-lg",
  md: "px-3.5 py-2.5 text-[13.5px] rounded-[10px]",
  lg: "px-5 py-3 text-[15px] rounded-[10px]",
} as const;

function buttonClass(tone: ButtonTone, size: keyof typeof SIZE, extra = "") {
  return [
    "inline-flex items-center justify-center gap-1.5 border font-medium leading-none",
    "no-underline transition-colors",
    TONE[tone],
    SIZE[size],
    extra,
  ].join(" ");
}

export function StickerLink({
  href,
  tone = "orange",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  href: string;
  tone?: ButtonTone;
  size?: keyof typeof SIZE;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={buttonClass(tone, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function StickerAnchor({
  tone = "paper",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  tone?: ButtonTone;
  size?: keyof typeof SIZE;
  className?: string;
  children: ReactNode;
} & ComponentProps<"a">) {
  return (
    <a className={buttonClass(tone, size, className)} {...rest}>
      {children}
    </a>
  );
}

export function StickerButton({
  tone = "paper",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  tone?: ButtonTone;
  size?: keyof typeof SIZE;
  className?: string;
  children: ReactNode;
} & ComponentProps<"button">) {
  return (
    <button type="button" className={buttonClass(tone, size, className)} {...rest}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- nhãn

/** Badge hạng ekip trên ảnh bìa. */
export function TiltBadge({
  accent = "blue",
  className = "",
  children,
}: {
  accent?: Accent;
  className?: string;
  children: ReactNode;
}) {
  void accent;
  return (
    <span
      className={`inline-block rounded-[7px] border border-line bg-surface/95 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-blue ${className}`}
    >
      {children}
    </span>
  );
}

export function SoftTag({
  accent = "blue",
  className = "",
  children,
}: {
  accent?: Accent;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[11.5px] font-medium leading-tight ${ACCENT_SOFT[accent]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Nhãn nhỏ chữ hoa giãn rộng, dùng thay cho tiêu đề phụ. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 ${className}`}
    >
      {children}
    </p>
  );
}
