import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResubmitForm, SubmitPhotosForm, WithdrawButton } from "@/components/admin/submit-form";
import { QC_HOME, requireAdmin } from "@/lib/admin-guard";
import { photoSrc } from "@/lib/image-paths";
import { KIND_LABEL } from "@/lib/school-shared";
import { getPhotographerSchoolDashboard, listSchoolOptions, type OwnSubmission } from "@/lib/school-queries";
import { resubmitSchoolPhoto, submitSchoolPhotos, withdrawSchoolPhoto } from "./actions";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * "Ảnh trường của tôi": bốn số, form nộp ảnh và danh sách ảnh đã nộp của
 * CHÍNH Photo đang đăng nhập. Id Photo lấy từ phiên, không từ URL, nên Photo
 * này không có cách nào xem ảnh chờ duyệt hay thống kê của Photo khác.
 * Nhân sự studio mở trang này thì chuyển sang trang duyệt ảnh.
 */
export default async function MySchoolPhotosPage() {
  const user = await requireAdmin({ allowPhotographer: true });
  if (user.role !== "PHOTOGRAPHER" || !user.photographerId) redirect(QC_HOME);

  const [dash, schools] = await Promise.all([
    getPhotographerSchoolDashboard(user.photographerId),
    listSchoolOptions(),
  ]);
  const currentYear = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric" }));
  const pendingRoom = Math.max(0, dash.maxPending - dash.pending);

  const rejected = dash.submissions.filter((s) => s.status === "REJECTED");
  const pending = dash.submissions.filter((s) => s.status === "PENDING");
  const approved = dash.submissions.filter((s) => s.status === "APPROVED");

  const tiles = [
    { label: "Ảnh đã lên web", value: dash.approved },
    { label: "Ảnh đang chờ duyệt", value: dash.pending },
    { label: "Lượt khách xem ảnh của bạn", value: dash.views },
    { label: "Lượt khách bấm Đặt từ ảnh của bạn", value: dash.bookClicks },
  ];

  return (
    <div className="max-w-[880px]">
      <h1 className="font-serif text-[26px] font-semibold leading-tight">Ảnh trường của tôi</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Nộp ảnh bạn chụp ở các trường. QC duyệt xong ảnh lên trang trường, khách bấm vào ảnh sẽ thấy tên bạn.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-card border border-line bg-surface px-4 py-3.5">
            <b className="block font-serif text-2xl font-semibold tabular-nums">{t.value.toLocaleString("vi-VN")}</b>
            <span className="text-[12.5px] text-ink-3">{t.label}</span>
          </div>
        ))}
      </div>

      <section className="mt-6 grid gap-3 rounded-card border border-line bg-surface p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Nộp ảnh mới</h2>
          <span className="text-[12.5px] text-ink-3">
            Đang chờ duyệt {dash.pending}/{dash.maxPending}
          </span>
        </div>
        {pendingRoom === 0 ? (
          <p className="rounded-xl border border-extra-line bg-extra-bg px-3.5 py-2.5 text-[13px] text-extra-ink">
            Bạn đang có {dash.pending} ảnh chờ duyệt, tối đa {dash.maxPending}. Đợi QC duyệt bớt rồi nộp tiếp.
          </p>
        ) : schools.length === 0 ? (
          <p className="text-[13px] text-ink-2">Chưa có trường nào trong danh sách. Nhắn studio thêm trường.</p>
        ) : (
          <SubmitPhotosForm
            action={submitSchoolPhotos}
            schools={schools}
            currentYear={currentYear}
            pendingRoom={pendingRoom}
          />
        )}
      </section>

      <h2 className="mt-8 font-serif text-xl font-semibold">Ảnh bạn đã nộp</h2>
      {dash.submissions.length === 0 && (
        <p className="mt-2 text-[13.5px] text-ink-2">Bạn chưa nộp ảnh nào.</p>
      )}

      {rejected.length > 0 && (
        <SubmissionGroup title="Bị trả lại" count={rejected.length}>
          {rejected.map((s) => (
            <SubmissionCard key={s.id} s={s}>
              <p className="rounded-xl border border-extra-line bg-extra-bg px-3 py-2 text-[13px] text-extra-ink">
                <b className="font-semibold">QC trả lại vì:</b> {s.rejectReason || "(không ghi lý do)"}
              </p>
              <details className="rounded-xl border border-line bg-sunk p-3">
                <summary className="cursor-pointer text-[13.5px] font-medium text-blue">Sửa và nộp lại</summary>
                <div className="mt-3">
                  <ResubmitForm
                    action={resubmitSchoolPhoto.bind(null, s.id)}
                    schools={schools}
                    currentYear={currentYear}
                    defaults={{ schoolId: s.school.id, angle: s.angleName, year: s.year, kind: s.kind, note: s.note }}
                  />
                </div>
              </details>
              <WithdrawButton action={withdrawSchoolPhoto.bind(null, s.id)} />
            </SubmissionCard>
          ))}
        </SubmissionGroup>
      )}

      {pending.length > 0 && (
        <SubmissionGroup title="Chờ duyệt" count={pending.length}>
          {pending.map((s) => (
            <SubmissionCard key={s.id} s={s}>
              <WithdrawButton action={withdrawSchoolPhoto.bind(null, s.id)} />
            </SubmissionCard>
          ))}
        </SubmissionGroup>
      )}

      {approved.length > 0 && (
        <SubmissionGroup title="Đã lên web (gần đây)" count={approved.length}>
          <li className="text-[12.5px] text-ink-3 sm:col-span-2">Muốn gỡ ảnh đã lên web, nhắn QC.</li>
          {approved.map((s) => (
            <SubmissionCard key={s.id} s={s}>
              <Link href={`/truong/${s.school.slug}`} target="_blank" className="text-[13px] text-ink-2 hover:text-blue">
                Xem trang trường ↗
              </Link>
            </SubmissionCard>
          ))}
        </SubmissionGroup>
      )}
    </div>
  );
}

function SubmissionGroup({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
        {title} · {count}
      </h3>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">{children}</ul>
    </section>
  );
}

function SubmissionCard({ s, children }: { s: OwnSubmission; children?: ReactNode }) {
  const wide = s.status === "REJECTED";
  return (
    <li
      className={`grid content-start gap-3 rounded-card border border-line bg-surface p-3 ${wide ? "sm:col-span-2" : ""}`}
    >
      <div className="grid grid-cols-[96px_1fr] gap-3">
        {/* Ảnh chờ duyệt chỉ route /uploads trả cho chính Photo này. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc(s.stem, 400)}
          alt={`${s.angleName} tại ${s.school.name}`}
          width={s.width}
          height={s.height}
          loading="lazy"
          decoding="async"
          className="aspect-3/4 w-full rounded-lg border border-line bg-sunk object-cover"
        />
        <div className="min-w-0 text-[13px]">
          <p className="font-semibold leading-snug">
            {s.school.short && (
              <span className="mr-1.5 rounded-md bg-blue-soft px-1.5 py-0.5 text-[11px] font-semibold text-blue-deep">
                {s.school.short}
              </span>
            )}
            {s.school.name}
          </p>
          <p className="mt-0.5 text-ink-2">
            Góc: <span className="font-medium text-ink">{s.angleName || "(trống)"}</span>
          </p>
          <p className="mt-0.5 text-ink-2">
            {KIND_LABEL[s.kind]} · năm {s.year}
          </p>
          {s.note && <p className="mt-0.5 break-words text-ink-2">Ghi chú: {s.note}</p>}
          <p className="mt-1 text-[12px] text-ink-3">
            Nộp {fmtDate(s.createdAt)}
            {s.reviewedAt && s.status !== "PENDING" ? ` · QC xem ${fmtDate(s.reviewedAt)}` : ""}
          </p>
        </div>
      </div>
      {children}
    </li>
  );
}
