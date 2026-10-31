"use client";

import { useRef, useState, useTransition } from "react";
import { inputClass } from "@/components/admin/form-bits";
import { QcZoomImage } from "@/components/admin/qc-lightbox";
import { ANGLE_NAME_MAX, REJECT_REASON_MAX, REJECT_REASON_MIN, angleKey, normalizeAngleName } from "@/lib/school-shared";
import { approveAction, rejectAction } from "@/app/admin/(panel)/duyet-anh/actions";

/** Một thẻ trong hàng đợi, đã đổi sẵn ở server sang chữ hiện được. */
export type QcQueueItem = {
  id: string;
  stem: string;
  width: number;
  height: number;
  schoolId: string;
  schoolName: string;
  schoolShort: string;
  photographerName: string;
  /** tên góc Photo đề xuất: tên góc chuẩn đã chọn, hoặc chữ Photo tự gõ */
  proposedAngle: string;
  /** true khi Photo gõ góc mới, không chọn từ danh mục */
  proposedIsNew: boolean;
  /** tên điền sẵn vào ô góc: góc chuẩn khớp nếu có, không thì chữ Photo gõ */
  prefillAngle: string;
  kindLabel: string;
  year: number;
  submittedAt: string;
  note: string;
  warning: string | null;
};

type Notice = { id: number; tone: "ok" | "warn"; text: string };

/**
 * Hàng đợi duyệt ảnh trường. Thẻ nào xử lý xong thì ẩn ngay ở đây, server
 * cũng làm mới trang nên lần tải sau không còn thẻ đó. Thông báo (kể cả cảnh
 * báo 40%) nằm ở đầu hàng đợi vì thẻ đã biến mất sau khi duyệt.
 */
export function QcReviewQueue({
  items,
  anglesBySchool,
  canAct,
}: {
  items: QcQueueItem[];
  anglesBySchool: Record<string, { id: string; name: string }[]>;
  canAct: boolean;
}) {
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [notices, setNotices] = useState<Notice[]>([]);
  // Đếm id thông báo trong callback, không đọc lúc render.
  const seq = useRef(0);

  function finish(id: string, list: Omit<Notice, "id">[]) {
    setDone((prev) => new Set(prev).add(id));
    const withIds = list.map((n) => ({ ...n, id: seq.current++ }));
    setNotices((prev) => [...withIds, ...prev].slice(0, 6));
  }

  const visible = items.filter((it) => !done.has(it.id));
  const schoolIds = [...new Set(items.map((it) => it.schoolId))];

  return (
    <div className="grid gap-3">
      {notices.length > 0 && (
        <div aria-live="polite" className="grid gap-1.5">
          {notices.map((n) => (
            <p
              key={n.id}
              className={`flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-[13.5px] ${
                n.tone === "warn" ? "border-extra-line bg-extra-bg text-extra-ink" : "border-in-line bg-in-bg text-in-ink"
              }`}
            >
              <span>{n.text}</span>
              <button
                type="button"
                onClick={() => setNotices((prev) => prev.filter((x) => x.id !== n.id))}
                aria-label="Ẩn thông báo"
                className="shrink-0 text-base leading-none opacity-70 hover:opacity-100"
              >
                ×
              </button>
            </p>
          ))}
        </div>
      )}

      {/* Một datalist mỗi trường, các thẻ cùng trường dùng chung. */}
      {schoolIds.map((sid) => (
        <datalist key={sid} id={`qc-angles-${sid}`}>
          {(anglesBySchool[sid] ?? []).map((a) => (
            <option key={a.id} value={a.name} />
          ))}
        </datalist>
      ))}

      {visible.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 px-4 py-8 text-center text-ink-2">
          Không còn ảnh nào chờ duyệt. Photo nộp ảnh mới thì sẽ hiện ở đây.
        </p>
      ) : (
        <ul className="grid gap-3">
          {visible.map((it) => (
            <QcReviewCard
              key={it.id}
              item={it}
              angles={anglesBySchool[it.schoolId] ?? []}
              canAct={canAct}
              onDone={(list) => finish(it.id, list)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function QcReviewCard({
  item,
  angles,
  canAct,
  onDone,
}: {
  item: QcQueueItem;
  angles: { id: string; name: string }[];
  canAct: boolean;
  onDone: (notices: Omit<Notice, "id">[]) => void;
}) {
  const [angle, setAngle] = useState(item.prefillAngle);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const clean = normalizeAngleName(angle);
  const match = clean ? angles.find((a) => angleKey(a.name) === angleKey(clean)) : undefined;
  const label = `${item.photographerName} · ${item.schoolShort || item.schoolName}`;

  function approve() {
    setError("");
    startTransition(async () => {
      const res = await approveAction(item.id, clean);
      if (res.error) return setError(res.error);
      const list: Omit<Notice, "id">[] = [{ tone: "ok", text: `${label}: ${res.ok ?? "Đã duyệt."}` }];
      if (res.warning) list.push({ tone: "warn", text: `Lưu ý: ${res.warning}` });
      onDone(list);
    });
  }

  function reject() {
    setError("");
    startTransition(async () => {
      const res = await rejectAction(item.id, reason);
      if (res.error) return setError(res.error);
      onDone([{ tone: "ok", text: `${label}: ${res.ok ?? "Đã trả lại."}` }]);
    });
  }

  const reasonLen = reason.replace(/\s+/g, " ").trim().length;

  return (
    <li className="grid gap-3 rounded-card border border-line bg-surface p-3 sm:grid-cols-[160px_1fr]">
      <QcZoomImage
        stem={item.stem}
        alt={`Ảnh ${item.proposedAngle} tại ${item.schoolName} của ${item.photographerName}`}
        width={item.width}
        height={item.height}
        className="aspect-3/4 w-full max-w-[220px] rounded-lg sm:max-w-none"
      />

      <div className="grid min-w-0 content-start gap-2">
        <div>
          <p className="font-semibold">
            {item.schoolShort && (
              <span className="mr-1.5 rounded-md bg-blue-soft px-1.5 py-0.5 text-[11px] font-semibold text-blue-deep">
                {item.schoolShort}
              </span>
            )}
            {item.schoolName}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-2">
            Góc đề xuất: <span className="font-medium text-ink">{item.proposedAngle || "(trống)"}</span>
            {item.proposedIsNew && (
              <span className="ml-1.5 rounded-md border border-extra-line bg-extra-bg px-1.5 py-0.5 text-[11px] font-medium text-extra-ink">
                góc mới
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-2">
            {item.photographerName} · {item.kindLabel} · năm {item.year}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-3">Nộp lúc {item.submittedAt}</p>
          {item.note && <p className="mt-1 text-[12.5px] text-ink">Ghi chú: {item.note}</p>}
        </div>

        {item.warning && (
          <p className="rounded-xl border border-extra-line bg-extra-bg px-3 py-2 text-[12.5px] text-extra-ink">
            Nếu duyệt: {item.warning} Vẫn duyệt được, cân nhắc ưu tiên ảnh của Photo khác.
          </p>
        )}

        {canAct ? (
          <>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-ink-2">Tên góc chuẩn</span>
              <input
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                list={`qc-angles-${item.schoolId}`}
                maxLength={ANGLE_NAME_MAX}
                placeholder="Chọn hoặc gõ tên góc"
                disabled={pending}
                className={inputClass}
              />
              <small className={`text-[11.5px] ${match ? "text-in-ink" : clean ? "text-extra-ink" : "text-ink-3"}`}>
                {match
                  ? `Góc có sẵn: ${match.name}`
                  : clean
                    ? "Sẽ tạo góc mới cho trường"
                    : angles.length
                      ? "Gõ để thấy gợi ý từ danh mục góc của trường"
                      : "Trường chưa có góc nào, tên gõ ở đây sẽ thành góc đầu tiên"}
              </small>
            </label>

            {rejecting ? (
              <div className="grid gap-2 rounded-xl bg-sunk p-2.5">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-ink-2">Lý do trả lại (Photo sẽ thấy)</span>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={REJECT_REASON_MAX}
                    placeholder="VD: ảnh mờ, lộ mặt người ngoài, sai trường…"
                    disabled={pending}
                    autoFocus
                    className={inputClass}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={reject}
                    disabled={pending || reasonLen < REJECT_REASON_MIN}
                    className="rounded-[10px] border border-warn px-3.5 py-2 text-[13.5px] font-medium text-warn hover:bg-extra-bg disabled:opacity-60"
                  >
                    {pending ? "Đang lưu…" : "Xác nhận trả lại"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(false)}
                    disabled={pending}
                    className="rounded-[10px] border border-line-2 px-3.5 py-2 text-[13.5px] font-medium hover:border-ink-3 disabled:opacity-60"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={approve}
                  disabled={pending || !clean}
                  className="rounded-[10px] border border-blue bg-blue px-4 py-2 text-[13.5px] font-medium text-white hover:bg-blue-deep disabled:opacity-60"
                >
                  {pending ? "Đang duyệt…" : "Duyệt"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setRejecting(true);
                  }}
                  disabled={pending}
                  className="rounded-[10px] border border-line-2 px-4 py-2 text-[13.5px] font-medium hover:border-warn hover:text-warn disabled:opacity-60"
                >
                  Trả lại
                </button>
              </div>
            )}
          </>
        ) : null}

        {error && (
          <p role="alert" className="text-[13px] text-warn">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
