import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [photographers, published, photos, newLeads, totalLeads, settings] = await Promise.all([
    db.photographer.count(),
    db.photographer.count({ where: { published: true } }),
    db.photo.count(),
    db.lead.count({ where: { status: "NEW" } }),
    db.lead.count(),
    getSettings(),
  ]);

  const cards = [
    { label: "Thợ đang hiện", value: `${published} / ${photographers}`, href: "/admin/tho" },
    { label: "Ảnh portfolio", value: String(photos), href: "/admin/tho" },
    { label: "Khách mới chưa xem", value: String(newLeads), href: "/admin/lead" },
    { label: "Tổng khách để lại thông tin", value: String(totalLeads), href: "/admin/lead" },
  ];

  return (
    <div className="max-w-[880px]">
      <h1 className="font-serif text-[26px] font-semibold leading-tight">Tổng quan</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-card border border-line bg-surface px-4 py-3.5 hover:border-blue"
          >
            <b className="block font-serif text-2xl font-semibold tabular-nums">{c.value}</b>
            <span className="text-[12.5px] text-ink-3">{c.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        {!settings.hero.headline && (
          <p className="rounded-xl border border-line bg-sunk px-3.5 py-3 text-[13.5px] text-ink-2">
            Đầu trang chủ đang dùng chữ mặc định.{" "}
            <Link href="/admin/hero" className="text-blue underline underline-offset-2">
              Sửa tiêu đề, mô tả và số liệu
            </Link>
          </p>
        )}
      </div>

      <section className="mt-8 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Làm gì ở đây</h2>
        <ul className="mt-2 grid gap-1.5 text-[13.5px] text-ink-2">
          <li>Thêm thợ, upload ảnh portfolio, chọn ảnh bìa, điền link album Google Drive.</li>
          <li>Sửa giá theo hạng ekip, giá gói nhóm theo số người, phụ phí từng tỉnh và các dòng chính sách.</li>
          <li>Sửa tiêu đề, đoạn mô tả và các viên số liệu ở đầu trang chủ.</li>
          <li>Xem khách đã để lại tên và số điện thoại, đánh dấu đã liên hệ hoặc đã chốt.</li>
        </ul>
        <p className="mt-3 text-[12.5px] text-ink-3">
          Trang khách hiện thay đổi ngay sau khi lưu.
        </p>
      </section>
    </div>
  );
}
