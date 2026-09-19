import Link from "next/link";
import { photoSrc } from "@/lib/image-paths";
import type { Settings } from "@/lib/settings";

const NAV = [
  { href: "/tho", label: "Chọn thợ" },
  { href: "/bang-gia", label: "Bảng giá" },
];

export function SiteHeader({ studio }: { studio: Settings["studio"] }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex w-full max-w-[1120px] items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5 text-inherit no-underline">
          {studio.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh đã resize sẵn lúc upload, xem src/lib/images.ts
            <img
              src={photoSrc(studio.logo, 400)}
              alt=""
              className="h-11 w-auto shrink-0 object-contain"
            />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-blue font-serif text-[17px] font-semibold text-white">
              {studio.name.charAt(0)}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-serif text-base font-semibold text-blue">
              {studio.name}
            </span>
            <span className="block truncate text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
              {studio.kicker}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-ink-2 hover:bg-sunk hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/lien-he"
          className="inline-flex shrink-0 items-center justify-center rounded-[10px] border border-cta bg-cta px-3.5 py-2.5 text-[13.5px] font-medium text-white hover:bg-cta-hover"
        >
          Đặt lịch<span className="hidden sm:inline">&nbsp;ngay</span>
        </Link>
      </div>
    </header>
  );
}
