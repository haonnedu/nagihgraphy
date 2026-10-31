import Link from "next/link";

const TABS = [
  { key: "tho", href: "/tho", label: "Chọn Photo" },
  { key: "truong", href: "/truong", label: "Chọn trường" },
] as const;

/**
 * Hai lối vào "Chọn Photo | Chọn trường" ở đầu trang /tho và /truong.
 * Menu trên header ẩn dưới cỡ sm, nên trên điện thoại đây là chỗ chuyển qua lại.
 */
export function BrowseTabs({ active, className = "" }: { active: "tho" | "truong"; className?: string }) {
  return (
    <nav aria-label="Cách chọn" className={className}>
      <div className="inline-flex rounded-full border border-line bg-sunk p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active === t.key ? "page" : undefined}
            className={
              active === t.key
                ? "rounded-full bg-blue px-4 py-1.5 text-[13.5px] font-medium text-white no-underline"
                : "rounded-full px-4 py-1.5 text-[13.5px] font-medium text-ink-2 no-underline hover:text-blue"
            }
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
