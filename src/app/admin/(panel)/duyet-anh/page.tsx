import type { Metadata } from "next";
import { QcReviewQueue, type QcQueueItem } from "@/components/admin/qc-review-queue";
import { requireAdmin, canReview } from "@/lib/admin-guard";
import { listPendingSubmissions } from "@/lib/school-queries";
import { KIND_LABEL } from "@/lib/school-shared";

export const metadata: Metadata = { title: "Duyệt ảnh trường" };
export const dynamic = "force-dynamic";

/**
 * Hàng đợi ảnh trường Photo đã nộp, cũ nhất trước. QC, SALE, OWNER duyệt
 * hoặc trả lại; VIEWER chỉ xem. Quyền thật kiểm tra ở action và service.
 */
export default async function ReviewQueuePage() {
  const user = await requireAdmin({ allowQc: true });
  const canAct = canReview(user.role);
  const { items, anglesBySchool } = await listPendingSubmissions();

  // Đổi sẵn sang chữ hiện được ở server: giờ nộp theo giờ Việt Nam, không lệch
  // giữa server và trình duyệt.
  const rows: QcQueueItem[] = items.map((it) => {
    const angles = anglesBySchool[it.school.id] ?? [];
    const suggested = it.suggestedAngleId ? angles.find((a) => a.id === it.suggestedAngleId) : undefined;
    const proposed = it.angle?.name ?? it.angleText;
    return {
      id: it.id,
      stem: it.stem,
      width: it.width,
      height: it.height,
      schoolId: it.school.id,
      schoolName: it.school.name,
      schoolShort: it.school.short,
      photographerName: it.photographer.name,
      proposedAngle: proposed,
      proposedIsNew: !it.angle,
      prefillAngle: suggested?.name ?? proposed,
      kindLabel: KIND_LABEL[it.kind],
      year: it.year,
      submittedAt: it.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      note: it.note,
      warning: it.warning,
    };
  });

  return (
    <div className="max-w-[880px]">
      <h1 className="font-serif text-[26px] font-semibold leading-tight">Duyệt ảnh trường</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        <span className="font-semibold text-ink">{rows.length} ảnh chờ duyệt</span>, cũ nhất ở trên. Sửa tên góc về đúng
        danh mục của trường trước khi duyệt, để bộ lọc góc trên trang khách không bị lặp.
      </p>

      {!canAct && (
        <p className="mt-3 rounded-xl border border-line bg-sunk px-3.5 py-2.5 text-[13px] text-ink-2">
          Tài khoản của bạn chỉ có quyền xem hàng đợi, không duyệt hay trả ảnh được.
        </p>
      )}

      <div className="mt-4">
        <QcReviewQueue items={rows} anglesBySchool={anglesBySchool} canAct={canAct} />
      </div>
    </div>
  );
}
