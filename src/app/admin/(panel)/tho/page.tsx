import Link from "next/link";
import { ActionButton } from "@/components/admin/form-bits";
import { Photo, PhotoPlaceholder } from "@/components/photo";
import { db } from "@/lib/db";
import { requireAdmin, canEdit } from "@/lib/admin-guard";
import { money } from "@/lib/pricing";
import { movePhotographer, togglePublished } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPhotographersPage() {
  const user = await requireAdmin();
  const editable = canEdit(user.role);

  const rows = await db.photographer.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      city: true,
      published: true,
      isSample: true,
      priceOverride: true,
      zalo: true,
      facebook: true,
      phone: true,
      tier: { select: { name: true, basePrice: true } },
      photos: { select: { path: true }, orderBy: { order: "asc" }, take: 1 },
      _count: { select: { photos: true } },
    },
  });

  return (
    <div className="max-w-[960px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold leading-tight">Thợ và ảnh portfolio</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Thứ tự ở đây là thứ tự “Nổi bật” trên trang khách. Thợ đang ẩn không hiện với khách.
          </p>
        </div>
        {editable && (
          <Link
            href="/admin/tho/moi"
            className="rounded-[10px] border border-cta bg-cta px-4 py-2.5 text-[13.5px] font-medium text-white hover:bg-cta-hover"
          >
            + Thêm thợ
          </Link>
        )}
      </div>

      <ul className="mt-5 grid gap-2.5">
        {rows.map((p, i) => {
          const cover = p.photos[0];
          const price = p.priceOverride > 0 ? p.priceOverride : p.tier.basePrice;
          const noContact = !p.zalo && !p.facebook && !p.phone;
          return (
            <li
              key={p.id}
              className={`grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-card border border-line bg-surface p-2.5 ${p.published ? "" : "opacity-60"}`}
            >
              <div className="aspect-3/4 w-14 overflow-hidden rounded-lg bg-sunk">
                {cover ? (
                  <Photo path={cover.path} alt="" sizes="56px" fallbackWidth={400} className="size-full object-cover" />
                ) : (
                  <PhotoPlaceholder name={p.name} className="size-full text-lg" />
                )}
              </div>

              <div className="min-w-0">
                <Link href={`/admin/tho/${p.id}`} className="font-semibold hover:text-blue">
                  {p.name}
                </Link>
                <p className="truncate text-[12.5px] text-ink-2">
                  {p.tier.name} · {p.city} · từ {money(price)} · {p._count.photos} ảnh
                  {p.isSample && " · dữ liệu mẫu"}
                  {!p.published && " · đang ẩn"}
                </p>
                {noContact && (
                  <p className="text-[12px] text-extra-ink">Chưa có Zalo, Messenger hay SĐT riêng, đang dùng kênh studio.</p>
                )}
              </div>

              {editable && (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <ActionButton action={movePhotographer.bind(null, p.id, "up")}>↑</ActionButton>
                  <ActionButton action={movePhotographer.bind(null, p.id, "down")}>↓</ActionButton>
                  <ActionButton action={togglePublished.bind(null, p.id)}>{p.published ? "Ẩn" : "Hiện"}</ActionButton>
                  <Link
                    href={`/admin/tho/${p.id}`}
                    className="rounded-[10px] border border-line-2 px-3 py-2 text-[13.5px] font-medium hover:border-ink-3"
                  >
                    Sửa
                  </Link>
                </div>
              )}
              {!editable && <span className="text-[12px] text-ink-3">#{i + 1}</span>}
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && (
        <p className="mt-5 rounded-card border border-dashed border-line-2 px-4 py-8 text-center text-ink-2">
          Chưa có thợ nào. Bấm “Thêm thợ” để bắt đầu.
        </p>
      )}
    </div>
  );
}
