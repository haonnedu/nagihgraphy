import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, Field, inputClass } from "@/components/admin/form-bits";
import { QcAngleList } from "@/components/admin/qc-angle-list";
import { QcConfirmButton } from "@/components/admin/qc-confirm-button";
import { QcSchoolPhotos, type QcSchoolPhoto } from "@/components/admin/qc-school-photos";
import { requireAdmin, canManageSchools, canReview } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getSchoolAdmin } from "@/lib/school-queries";
import { ANGLE_NAME_MAX, KIND_LABEL, schoolPhotoAlt } from "@/lib/school-shared";
import { createAngleAction, deleteSchoolAction, updateSchoolAction } from "../actions";

export const metadata: Metadata = { title: "Trường" };
export const dynamic = "force-dynamic";

const STATUS_TEXT = { LIVE: "Đang hiện", SOON: "Sắp có ảnh" } as const;

function vnTime(d: Date): string {
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
}

/**
 * Chi tiết một trường: thông tin (chỉ OWNER sửa, xoá), danh mục góc (QC, SALE,
 * OWNER sửa, gộp, xoá) và ảnh đã lên web (gỡ, đặt bìa). VIEWER chỉ xem.
 */
export default async function AdminSchoolPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin({ allowQc: true });
  const manage = canManageSchools(user.role);
  const review = canReview(user.role);
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);

  // Đếm chờ duyệt theo trường, gồm cả bài Photo gõ góc mới (chưa gắn góc nào).
  const [s, pending] = await Promise.all([
    getSchoolAdmin(id),
    db.photoSubmission.count({ where: { schoolId: id, status: "PENDING" } }),
  ]);
  if (!s) notFound();

  const photos: QcSchoolPhoto[] = s.photos.map((p) => ({
    id: p.id,
    stem: p.stem,
    width: p.width,
    height: p.height,
    angleName: p.angle.name,
    photographerName: p.photographer.name,
    photographerHidden: !p.photographer.published,
    year: p.year,
    kindLabel: KIND_LABEL[p.kind],
    isCover: p.isCover,
    alt: schoolPhotoAlt(p.angle.name, s.name),
    approvedText: `Duyệt ${vnTime(p.approvedAt)}${p.approvedBy ? ` bởi ${p.approvedBy}` : ""}`,
  }));

  return (
    <div className="max-w-[960px]">
      <nav className="text-[12.5px] text-ink-3">
        <Link href="/admin/truong" className="hover:text-blue">
          Trường
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink-2">{s.name}</span>
      </nav>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold leading-tight">{s.name}</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {s.short && `${s.short} · `}
            {s.city || "chưa ghi thành phố"} · {STATUS_TEXT[s.status]} · {s.photos.length} ảnh · {s.angles.length} góc
            {pending > 0 && (
              <>
                {" · "}
                <Link href="/admin/duyet-anh" className="font-medium text-extra-ink hover:underline">
                  {pending} ảnh chờ duyệt
                </Link>
              </>
            )}
          </p>
        </div>
        <Link href={`/truong/${s.slug}`} target="_blank" className="text-[13px] text-ink-2 hover:text-blue">
          Xem trang khách ↗
        </Link>
      </div>

      {sp.created && (
        <p className="mt-3 rounded-xl border border-in-line bg-in-bg px-3.5 py-2.5 text-[13.5px] text-in-ink">
          Đã thêm trường. Có thể thêm sẵn các góc chuẩn ở phần dưới để Photo chọn khi nộp ảnh.
        </p>
      )}

      {!review && (
        <p className="mt-3 rounded-xl border border-line bg-sunk px-3.5 py-2.5 text-[13px] text-ink-2">
          Tài khoản của bạn chỉ có quyền xem trường, góc và ảnh.
        </p>
      )}

      <div className="mt-5 grid gap-5">
        {/* (a) Thông tin trường: chỉ OWNER sửa. Người khác thấy bản chỉ đọc. */}
        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Thông tin trường</h2>
          {manage ? (
            <ActionForm action={updateSchoolAction} className="mt-3">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="statusWas" value={s.status} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên trường">
                  <input name="name" required maxLength={120} defaultValue={s.name} className={inputClass} />
                </Field>
                <Field label="Mã trường" hint="Viết tắt hiện trên card, VD TMU">
                  <input name="short" maxLength={16} defaultValue={s.short} className={inputClass} />
                </Field>
                <Field label="Thành phố">
                  <input name="city" maxLength={40} defaultValue={s.city} className={inputClass} />
                </Field>
                <Field label="Đường dẫn" hint="Phần sau /truong/. Để trống thì sinh từ tên. Đổi thì link cũ hết dùng được.">
                  <input name="slug" maxLength={80} defaultValue={s.slug} className={inputClass} />
                </Field>
                <Field label="Trạng thái" hint="Trường “Sắp có ảnh” tự chuyển sang “Đang hiện” khi đủ 4 ảnh.">
                  <select name="status" defaultValue={s.status} className={inputClass}>
                    <option value="SOON">Sắp có ảnh</option>
                    <option value="LIVE">Đang hiện</option>
                  </select>
                </Field>
                <Field label="Thứ tự" hint="Số nhỏ đứng trước trong danh sách trường">
                  <input name="order" type="number" min={0} max={9999} defaultValue={s.order} className={inputClass} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Giới thiệu ngắn" hint="Hiện ở đầu trang trường. Tối đa 1200 ký tự.">
                  <textarea name="intro" rows={4} maxLength={1200} defaultValue={s.intro} className={inputClass} />
                </Field>
              </div>
            </ActionForm>
          ) : (
            <dl className="mt-3 grid gap-x-4 gap-y-2 text-[13.5px] sm:grid-cols-[140px_1fr]">
              <dt className="text-ink-3">Đường dẫn</dt>
              <dd>/truong/{s.slug}</dd>
              <dt className="text-ink-3">Thứ tự</dt>
              <dd>{s.order}</dd>
              <dt className="text-ink-3">Giới thiệu</dt>
              <dd className="whitespace-pre-line">{s.intro || "Chưa có"}</dd>
            </dl>
          )}
        </section>

        {/* (b) Danh mục góc chuẩn: QC, SALE, OWNER sửa. */}
        <section className="grid gap-3 rounded-card border border-line bg-surface p-4">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Danh mục góc chụp</h2>
            <p className="mt-1 text-[13px] text-ink-2">
              Mỗi góc là một chip lọc trên trang khách. Hai góc trùng nghĩa (“Sảnh V”, “Sảnh chữ V”) thì gộp lại.
            </p>
          </div>
          <QcAngleList
            angles={s.angles.map((a) => ({ id: a.id, name: a.name, photoCount: a.photoCount, pendingCount: a.pendingCount }))}
            canAct={review}
          />
          {review && (
            <ActionForm action={createAngleAction} submitLabel="Thêm góc" resetOnOk className="rounded-xl bg-sunk p-3">
              <input type="hidden" name="schoolId" value={s.id} />
              <Field label="Thêm sẵn góc chuẩn" hint="Photo chọn được góc này khi nộp ảnh">
                <input name="name" required maxLength={ANGLE_NAME_MAX} placeholder="VD: Sảnh V" className={inputClass} />
              </Field>
            </ActionForm>
          )}
        </section>

        {/* (c) Ảnh đã lên web: gỡ một bấm, đặt bìa. */}
        <section className="grid gap-3 rounded-card border border-line bg-surface p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Ảnh đã lên web</h2>
              <p className="mt-1 text-[13px] text-ink-2">
                Khách nhắn muốn gỡ ảnh của mình thì bấm “Gỡ ảnh”: ảnh và file bị xoá ngay, không hoàn tác được.
              </p>
            </div>
            <span className="text-[12.5px] text-ink-3">{s.photos.length} ảnh</span>
          </div>
          <QcSchoolPhotos schoolId={s.id} photos={photos} canAct={review} />
        </section>

        {manage && (
          <section className="rounded-card border border-extra-line bg-extra-bg p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-extra-ink">Vùng nguy hiểm</h2>
            <p className="mt-1 text-[13px] text-ink-2">
              Xoá trường sẽ xoá luôn {s.angles.length} góc, {s.photos.length} ảnh đã lên web, mọi ảnh chờ duyệt và file của
              chúng. Muốn tạm giấu thì chuyển sang “Sắp có ảnh”.
            </p>
            <div className="mt-3">
              <QcConfirmButton
                action={deleteSchoolAction.bind(null, s.id)}
                label="Xoá trường này"
                question={`Xoá hẳn ${s.name} cùng toàn bộ góc và ảnh? Không hoàn tác được.`}
                confirmLabel="Xoá hẳn"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
