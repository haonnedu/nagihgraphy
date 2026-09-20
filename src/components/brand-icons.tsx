import type { SVGProps } from "react";

/**
 * Logo các app nhắn tin, vẽ lại đơn giản bằng SVG đơn sắc, tô theo currentColor
 * để đổi màu theo nút. Không tải ảnh ngoài.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    focusable: false,
    ...rest,
  } as const;
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MessengerIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M12 2.5C6.7 2.5 2.5 6.4 2.5 11.4c0 2.8 1.3 5.3 3.5 7v3.6l3.3-1.8c.9.2 1.8.4 2.7.4 5.3 0 9.5-3.9 9.5-8.9S17.3 2.5 12 2.5Zm1 12-2.5-2.6-4.8 2.6 5.3-5.6 2.5 2.6 4.7-2.6-5.2 5.6Z" />
    </svg>
  );
}

export function ZaloIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M6.5 3h11A3.5 3.5 0 0 1 21 6.5v11a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 17.5v-11A3.5 3.5 0 0 1 6.5 3Zm.8 5.2v1.4h3.2l-3.4 4.4v1.2h5.4v-1.4H9.2l3.4-4.4V8.2H7.3Zm7.2 0v7h1.5v-7h-1.5Zm-2.4 2.3c-1.3 0-2.3 1.1-2.3 2.4s1 2.4 2.3 2.4c.5 0 .9-.2 1.2-.5v.4h1.4v-4.6H13.3v.4c-.3-.3-.7-.5-1.2-.5Zm.2 1.4c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1Zm5.3-1.4c-1.3 0-2.4 1.1-2.4 2.4s1.1 2.4 2.4 2.4 2.4-1.1 2.4-2.4-1.1-2.4-2.4-2.4Zm0 1.4c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1Z" />
    </svg>
  );
}

export function TikTokIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3c-1.4 0-2.7-.4-3.9-1.2v6.2c0 3.4-2.7 6.1-6.1 6.1S4.4 18.2 4.4 14.8s2.7-6.1 6.1-6.1c.3 0 .6 0 .9.1v3.1a3 3 0 0 0-.9-.2 3 3 0 1 0 3 3V3h3.1Z" />
    </svg>
  );
}

/** Tra logo theo key của ContactLink. */
export const BRAND_ICONS = {
  instagram: InstagramIcon,
  facebook: MessengerIcon,
  zalo: ZaloIcon,
  tiktok: TikTokIcon,
} as const;

export type BrandKey = keyof typeof BRAND_ICONS;
