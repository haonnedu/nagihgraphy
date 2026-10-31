"use client";

import { useState, useTransition } from "react";
import { inputClass, type ActionState } from "@/components/admin/form-bits";
import { ANGLE_NAME_MAX } from "@/lib/school-shared";
import { deleteAngleAction, mergeAngleAction, renameAngleAction } from "@/app/admin/(panel)/truong/actions";

export type QcAngleRow = { id: string; name: string; photoCount: number; pendingCount: number };

/**
 * Danh mục góc chuẩn của một trường: đổi tên ngay tại dòng, gộp vào góc khác,
 * xoá góc chưa có ảnh. Góc đang có ảnh thì không xoá được, phải gộp.
 */
export function QcAngleList({ angles, canAct }: { angles: QcAngleRow[]; canAct: boolean }) {
  if (angles.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-2 px-3 py-5 text-center text-[13px] text-ink-2">
        Trường chưa có góc nào. Góc sẽ tự có khi duyệt ảnh đầu tiên, hoặc thêm sẵn ở dưới.
      </p>
    );
  }
  return (
    <ul className="grid gap-2">
      {angles.map((a) => (
        <QcAngleItem key={a.id} angle={a} others={angles.filter((o) => o.id !== a.id)} canAct={canAct} />
      ))}
    </ul>
  );
}

type Mode = "view" | "rename" | "merge" | "delete";

function QcAngleItem({ angle, others, canAct }: { angle: QcAngleRow; others: QcAngleRow[]; canAct: boolean }) {
  const [mode, setMode] = useState<Mode>("view");
  const [name, setName] = useState(angle.name);
  const [picked, setPicked] = useState(others[0]?.id ?? "");
  // Danh mục đổi sau một lần gộp khác thì góc đã chọn có thể không còn.
  const into = others.some((o) => o.id === picked) ? picked : (others[0]?.id ?? "");
  const [state, setState] = useState<ActionState>({ error: "" });
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<ActionState>) {
    setState({ error: "" });
    startTransition(async () => {
      const res = await fn();
      setState(res);
      if (!res.error) setMode("view");
    });
  }

  const btn = "rounded-[10px] border border-line-2 px-3 py-1.5 text-[12.5px] font-medium hover:border-ink-3 disabled:opacity-60";
  const target = others.find((o) => o.id === into);

  return (
    <li className="grid gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{angle.name}</p>
          <p className="text-[12px] text-ink-3">
            {angle.photoCount} ảnh trên web{angle.pendingCount > 0 && ` · ${angle.pendingCount} ảnh chờ duyệt`}
          </p>
        </div>
        {canAct && mode === "view" && (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={btn} onClick={() => setMode("rename")}>
              Đổi tên
            </button>
            {others.length > 0 && (
              <button type="button" className={btn} onClick={() => setMode("merge")}>
                Gộp vào…
              </button>
            )}
            {angle.photoCount === 0 && (
              <button type="button" className={`${btn} hover:border-warn hover:text-warn`} onClick={() => setMode("delete")}>
                Xoá
              </button>
            )}
          </div>
        )}
      </div>

      {mode === "rename" && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => renameAngleAction(angle.id, name));
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={ANGLE_NAME_MAX}
            required
            autoFocus
            disabled={pending}
            aria-label="Tên góc mới"
            className={`${inputClass} min-w-0 flex-1 basis-48`}
          />
          <button type="submit" disabled={pending} className={`${btn} border-blue bg-blue text-white hover:bg-blue-deep`}>
            {pending ? "Đang lưu…" : "Lưu tên"}
          </button>
          <button type="button" disabled={pending} className={btn} onClick={() => setMode("view")}>
            Huỷ
          </button>
        </form>
      )}

      {mode === "merge" && (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => mergeAngleAction(angle.id, into));
          }}
        >
          <div className="flex flex-wrap gap-2">
            <select
              value={into}
              onChange={(e) => setPicked(e.target.value)}
              disabled={pending}
              aria-label="Gộp vào góc"
              className={`${inputClass} min-w-0 flex-1 basis-48`}
            >
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.photoCount} ảnh)
                </option>
              ))}
            </select>
            <button type="submit" disabled={pending || !into} className={`${btn} border-blue bg-blue text-white hover:bg-blue-deep`}>
              {pending ? "Đang gộp…" : "Gộp"}
            </button>
            <button type="button" disabled={pending} className={btn} onClick={() => setMode("view")}>
              Huỷ
            </button>
          </div>
          <small className="text-[11.5px] text-ink-3">
            {angle.photoCount} ảnh và các ảnh chờ duyệt của “{angle.name}” sẽ chuyển sang “{target?.name ?? "…"}”, rồi góc “
            {angle.name}” bị xoá.
          </small>
        </form>
      )}

      {mode === "delete" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink">
            Xoá góc “{angle.name}”?
            {angle.pendingCount > 0 && " Ảnh chờ duyệt đang dùng góc này giữ lại tên dạng chữ để QC chốt lại."}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteAngleAction(angle.id))}
            className={`${btn} border-warn text-warn hover:bg-extra-bg`}
          >
            {pending ? "Đang xoá…" : "Xoá góc"}
          </button>
          <button type="button" disabled={pending} className={btn} onClick={() => setMode("view")}>
            Huỷ
          </button>
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-[13px] text-warn">
          {state.error}
        </p>
      )}
      {state.ok && mode === "view" && <p className="text-[13px] text-in-ink">{state.ok}</p>}
    </li>
  );
}
