import Link from "next/link";
import { BRAND_ICONS, type BrandKey } from "@/components/brand-icons";
import { contactLinks, type Settings } from "@/lib/settings";

export function SiteFooter({
  studio,
  contacts,
}: {
  studio: Settings["studio"];
  contacts: Settings["contacts"];
}) {
  // Chỉ các app nhắn tin có logo, không hiện số điện thoại, giống khối liên hệ trên trang thợ.
  const links = contactLinks(contacts).filter((c) => c.key in BRAND_ICONS);

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap justify-between gap-x-6 gap-y-3 px-4 py-6 text-[12.5px] text-ink-3">
        <span>© {studio.name}</span>

        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/tho" className="text-ink-2 hover:text-blue">
            Chọn thợ
          </Link>
          <Link href="/bang-gia" className="text-ink-2 hover:text-blue">
            Bảng giá
          </Link>
          {links.map((c) => {
            const Icon = BRAND_ICONS[c.key as BrandKey];
            return (
              <a
                key={c.key}
                href={c.href}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 text-ink-2 hover:text-blue"
              >
                <Icon size={15} />
                {c.label}
              </a>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
