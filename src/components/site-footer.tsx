import Link from "next/link";
import { contactLinks, type Settings } from "@/lib/settings";

export function SiteFooter({
  studio,
  contacts,
}: {
  studio: Settings["studio"];
  contacts: Settings["contacts"];
}) {
  const links = contactLinks(contacts);

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
          {links.map((c) => (
            <a
              key={c.key}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener"
              className="text-ink-2 hover:text-blue"
            >
              {c.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
