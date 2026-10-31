"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/components/admin/form-bits";
import { QcZoomImage } from "@/components/admin/qc-lightbox";
import { removePhotoAction, setCoverAction } from "@/app/admin/(panel)/truong/actions";

export type QcSchoolPhoto = {
  id: string;
  stem: string;
  width: number;
  height: number;
  angleName: string;
  photographerName: string;
  photographerHidden: boolean;
  year: number;
  kindLabel: string;
  isCover: boolean;
  alt: string;
  /** "Duyệt bởi … lúc …", đã định dạng ở server */
  approvedText: string;
};

/**
 * Lưới ảnh đã lên web của một trường. "Gỡ ảnh" chạy ngay một bấm theo yêu cầu
 * bản quyền ảnh khách (không hỏi lại), rồi báo rõ là không hoàn tác được.
 */
export function QcSchoolPhotos({
  schoolId,
  photos,
  canAct,
}: {
  schoolId: string;
  photos: QcSchoolPhoto[];
  canAct: boolean;
}) {
  const [notice, setNotice] = useState<ActionState>({ error: "" });
  const [busyId, setBusyId] = useState("");
  const [busyKind, setBusyKind] = useState<"cover" | "remove">("cover");
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();

  function run(photoId: string, kind: "cover" | "remove", fn: () => Promise<ActionState>, onOk?: () => void) {
    setNotice({ error: "" });
    setBusyId(photoId);
    setBusyKind(kind);
    startTransition(async () => {
      const res = await fn();
      setNotice(res);
      if (!res.error) onOk?.();
      setBusyId("");
    });
  }

  const visible = photos.filter((p) => !removed.has(p.id));
  const btn = "rounded-lg border px-2 py-1 text-[11.5px] font-medium disabled:opacity-60";

  return (
    <div className="grid gap-3">
      {(notice.error || notice.ok) && (
        <p
          role={notice.error ? "alert" : "status"}
          className={`rounded-xl border px-3.5 py-2.5 text-[13px] ${
            notice.error ? "border-extra-line bg-extra-bg text-warn" : "border-in-line bg-in-bg text-in-ink"
          }`}
        >
          {notice.error || notice.ok}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-2 px-3 py-5 text-center text-[13px] text-ink-2">
          Trường chưa có ảnh nào trên web. Ảnh Photo nộp sẽ hiện ở đây sau khi được duyệt.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {visible.map((ph) => {
            const busy = pending && busyId === ph.id;
            return (
              <li
                key={ph.id}
                className={`relative grid content-start overflow-hidden rounded-lg border bg-surface ${
                  ph.isCover ? "border-blue ring-2 ring-blue-soft" : "border-line"
                } ${busy ? "opacity-60" : ""}`}
              >
                <QcZoomImage
                  stem={ph.stem}
                  alt={ph.alt}
                  width={ph.width}
                  height={ph.height}
                  sizes="(min-width: 768px) 200px, 45vw"
                  className="aspect-3/4 w-full"
                />
                {ph.isCover && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-blue px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Ảnh bìa
                  </span>
                )}
                <div className="grid gap-0.5 p-2 text-[12px]">
                  <p className="truncate font-medium text-ink">{ph.angleName}</p>
                  <p className="truncate text-ink-2">
                    {ph.photographerName}
                    {ph.photographerHidden && " (đang ẩn)"} · {ph.year} · {ph.kindLabel}
                  </p>
                  <p className="truncate text-[11px] text-ink-3" title={ph.approvedText}>
                    {ph.approvedText}
                  </p>
                  {canAct && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {!ph.isCover && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(ph.id, "cover", () => setCoverAction(schoolId, ph.id))}
                          className={`${btn} border-line-2 hover:border-blue hover:text-blue`}
                        >
                          {busy && busyKind === "cover" ? "Đang lưu…" : "Đặt làm ảnh bìa"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(ph.id, "remove", () => removePhotoAction(ph.id), () => setRemoved((prev) => new Set(prev).add(ph.id)))
                        }
                        className={`${btn} border-warn text-warn hover:bg-extra-bg`}
                      >
                        {busy && busyKind === "remove" ? "Đang gỡ…" : "Gỡ ảnh"}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
