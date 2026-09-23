import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/form-bits";
import { db } from "@/lib/db";
import { requireAdmin, canEdit } from "@/lib/admin-guard";
import { deletePhotographer } from "../actions";
import { loadFormOptions } from "../options";
import { PhotographerForm } from "../photographer-form";
import { PhotoManager } from "../photo-manager";

export const dynamic = "force-dynamic";

export default async function EditPhotographerPage(props: PageProps<"/admin/tho/[id]">) {
  const user = await requireAdmin();
  const { id } = await props.params;
  const sp = await props.searchParams;

  const [p, options] = await Promise.all([
    db.photographer.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { order: "asc" }, select: { id: true, path: true, width: true, height: true } },
        tags: { select: { tagId: true } },
        features: { select: { featureId: true, status: true } },
      },
    }),
    loadFormOptions(),
  ]);
  if (!p) notFound();

  const value = {
    id: p.id,
    name: p.name,
    tierId: p.tierId,
    city: p.city,
    style: p.style,
    bio: p.bio,
    rating: Number(p.rating),
    sessions: p.sessions,
    priceOverride: p.priceOverride,
    driveUrl: p.driveUrl,
    published: p.published,
    isSample: p.isSample,
    tagIds: p.tags.map((t) => t.tagId),
    features: Object.fromEntries(p.features.map((f) => [f.featureId, f.status])),
  };

  return (
    <div className="max-w-[880px]">
      <nav className="text-[12.5px] text-ink-3">
        <Link href="/admin/tho" className="hover:text-blue">
          Thợ
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink-2">{p.name}</span>
      </nav>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-[26px] font-semibold leading-tight">{p.name}</h1>
        <Link href={`/tho/${p.slug}`} target="_blank" className="text-[13px] text-ink-2 hover:text-blue">
          Xem trang khách ↗
        </Link>
      </div>

      {sp.created && (
        <p className="mt-3 rounded-xl border border-in-line bg-in-bg px-3.5 py-2.5 text-[13.5px] text-in-ink">
          Đã tạo thợ. Tải ảnh portfolio lên ở phần dưới.
        </p>
      )}

      {!canEdit(user.role) && (
        <p className="mt-3 rounded-xl border border-line bg-sunk px-3.5 py-2.5 text-[13px] text-ink-2">
          Tài khoản của bạn chỉ có quyền xem, các nút lưu sẽ báo lỗi.
        </p>
      )}

      <div className="mt-5 grid gap-5">
        <PhotoManager photographerId={p.id} photos={p.photos} />
        <PhotographerForm value={value} options={options} />

        <section className="rounded-card border border-extra-line bg-extra-bg p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-extra-ink">Vùng nguy hiểm</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            Xoá thợ sẽ xoá luôn {p.photos.length} ảnh và bỏ liên kết với các lead cũ. Muốn tạm giấu thì dùng “Ẩn” thay vì xoá.
          </p>
          <div className="mt-3">
            <ActionButton
              action={deletePhotographer.bind(null, p.id)}
              confirm={`Xoá hẳn ${p.name} và toàn bộ ảnh? Không hoàn tác được.`}
              tone="danger"
            >
              Xoá thợ này
            </ActionButton>
          </div>
        </section>
      </div>
    </div>
  );
}
