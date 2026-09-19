import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/auth";
import { requireAdmin, canEdit } from "@/lib/admin-guard";

export const metadata: Metadata = {
  title: { default: "Quản trị", template: "%s · Quản trị NAGIH" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/tho", label: "Thợ và ảnh portfolio" },
  { href: "/admin/goi", label: "Gói chụp và bảng giá" },
  { href: "/admin/hero", label: "Ảnh hero trang chủ" },
  { href: "/admin/lead", label: "Khách để lại thông tin" },
];

/** Mọi trang trong nhóm (panel) đều qua guard này. Trang login nằm ngoài nhóm. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="border-b border-line bg-surface md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:block md:py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">NAGIH GRAPHY</p>
            <p className="font-serif text-lg font-semibold leading-tight">Quản trị</p>
          </div>
          <Link href="/" className="text-[12.5px] text-ink-2 hover:text-blue md:mt-2 md:block">
            Xem trang khách ↗
          </Link>
        </div>

        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-ink-2 hover:bg-sunk hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden px-4 py-4 md:block">
          <p className="truncate text-[12.5px] text-ink-2">{user.name || user.email}</p>
          <p className="text-[11px] uppercase tracking-wide text-ink-3">
            {user.role}
            {!canEdit(user.role) && " · chỉ xem"}
          </p>
          <form action={logout} className="mt-2">
            <button type="submit" className="text-[12.5px] text-ink-2 underline underline-offset-2 hover:text-blue">
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-7">{children}</main>
    </div>
  );
}
