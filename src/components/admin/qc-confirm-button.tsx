"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/components/admin/form-bits";

/**
 * Nút hai bước thay cho window.confirm: bấm lần đầu hiện câu hỏi ngay trong
 * trang kèm nút xác nhận và nút huỷ. Dùng cho việc không hoàn tác được như
 * xoá trường.
 */
export function QcConfirmButton({
  action,
  label,
  question,
  confirmLabel = "Xác nhận",
}: {
  action: () => Promise<ActionState>;
  label: string;
  question: string;
  confirmLabel?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function run() {
    setError("");
    startTransition(async () => {
      // Thành công thì action chuyển trang, chỉ quay về đây khi có lỗi.
      const res = await action();
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="grid gap-2">
      {asking ? (
        <div className="grid gap-2 rounded-xl border border-extra-line bg-surface p-3">
          <p className="text-[13px] text-ink">{question}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={run}
              disabled={pending}
              className="rounded-[10px] border border-warn bg-warn px-3.5 py-2 text-[13.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Đang xoá…" : confirmLabel}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              disabled={pending}
              className="rounded-[10px] border border-line-2 px-3.5 py-2 text-[13.5px] font-medium hover:border-ink-3 disabled:opacity-60"
            >
              Huỷ
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="rounded-[10px] border border-warn px-3.5 py-2 text-[13.5px] font-medium text-warn hover:bg-extra-bg"
          >
            {label}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
