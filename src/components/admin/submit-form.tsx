"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { StatusNote, type ActionState } from "@/components/admin/form-bits";
import { ImagePicker, usePickedImages } from "@/components/admin/submit-images";
import { SubmitFields, type SubmitSchool } from "@/components/admin/submit-fields";
import type { ShotKind } from "@/generated/prisma/enums";
import { MAX_FILES_PER_SUBMIT } from "@/lib/school-shared";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Server action nhận tối đa 25 MB một lần. Ảnh đã thu về ≤ 2560px nên 5 ảnh
 * thường chỉ 5–10 MB; nếu vẫn quá mức này thì chia làm nhiều lần gửi nối nhau.
 */
const BATCH_BYTES = 20 * 1024 * 1024;

function batchesOf(files: File[]): File[][] {
  const out: File[][] = [];
  let cur: File[] = [];
  let size = 0;
  for (const f of files) {
    if (cur.length > 0 && size + f.size > BATCH_BYTES) {
      out.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(f);
    size += f.size;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

const btnClass =
  "rounded-[10px] border border-blue bg-blue px-3.5 py-2 text-[13.5px] font-medium text-white hover:bg-blue-deep disabled:opacity-60";

/**
 * Form nộp 1–5 ảnh trường. Ảnh được chuẩn bị ở trình duyệt ngay khi chọn
 * (HEIC → JPEG, thu nhỏ), rồi gửi kèm thông tin chung. Giới hạn 5 ảnh và 10
 * ảnh chờ duyệt chặn thật ở server; ở đây chỉ báo trước.
 */
export function SubmitPhotosForm({
  action,
  schools,
  currentYear,
  pendingRoom,
}: {
  action: FormAction;
  schools: SubmitSchool[];
  currentYear: number;
  /** số ảnh còn được nộp trước khi chạm giới hạn chờ duyệt */
  pendingRoom: number;
}) {
  const picker = usePickedImages(MAX_FILES_PER_SUBMIT);
  const [state, setState] = useState<ActionState>({ error: "" });
  const [sending, setSending] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || picker.busy) return;
    if (picker.hasError) return setState({ error: "Bỏ các ảnh bị lỗi ra rồi gửi lại." });
    const files = picker.ready;
    if (files.length === 0) return setState({ error: "Chọn ít nhất 1 ảnh." });
    if (files.length > pendingRoom) {
      return setState({
        error:
          pendingRoom <= 0
            ? "Bạn đang có đủ ảnh chờ duyệt. Đợi QC duyệt bớt rồi nộp tiếp."
            : `Bạn chỉ còn nộp được ${pendingRoom} ảnh nữa. Đợi QC duyệt bớt rồi nộp tiếp.`,
      });
    }

    // Đọc form TRƯỚC khi khoá: fieldset bị disabled thì FormData bỏ qua các ô bên trong.
    const base = new FormData(e.currentTarget);
    const batches = batchesOf(files.map((f) => f.file));
    const keys = files.map((f) => f.key);
    setState({ error: "" });
    setSending("Đang gửi…");

    startTransition(async () => {
      let sent = 0;
      for (let i = 0; i < batches.length; i++) {
        if (batches.length > 1) setSending(`Đang gửi phần ${i + 1}/${batches.length}…`);
        const fd = new FormData();
        for (const [k, v] of base.entries()) fd.append(k, v);
        for (const f of batches[i]) fd.append("files", f, f.name);
        const res = await action({ error: "" }, fd);
        if (res.error) {
          // Phần đã gửi được thì bỏ khỏi danh sách để bấm lại không gửi trùng.
          if (sent > 0) picker.remove(keys.slice(0, sent));
          setSending("");
          setState({
            error: sent > 0 ? `Đã gửi ${sent} ảnh, các ảnh còn lại chưa gửi được: ${res.error}` : res.error,
          });
          return;
        }
        sent += batches[i].length;
      }
      picker.reset();
      setSending("");
      setFormKey((k) => k + 1);
      setState({ error: "", ok: `Đã gửi ${sent} ảnh, chờ QC duyệt.` });
    });
  }

  const locked = Boolean(sending);

  return (
    <form key={formKey} onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-1">
        <span className="text-xs font-medium text-ink-2">Ảnh (1–{MAX_FILES_PER_SUBMIT} ảnh một lần)</span>
        <ImagePicker picker={picker} multiple disabled={locked} label="Chọn ảnh để nộp" />
        <small className="text-[11.5px] text-ink-3">
          Nhận cả ảnh HEIC từ iPhone. Ảnh được thu nhỏ trên máy bạn trước khi gửi nên gửi nhanh hơn.
        </small>
      </div>

      <SubmitFields schools={schools} currentYear={currentYear} disabled={locked} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={locked || picker.busy || picker.ready.length === 0} className={btnClass}>
          {sending ||
            (picker.busy
              ? "Đang chuẩn bị ảnh…"
              : picker.ready.length > 0
                ? `Gửi ${picker.ready.length} ảnh cho QC`
                : "Gửi ảnh cho QC")}
        </button>
        <StatusNote state={state} />
      </div>
    </form>
  );
}

/**
 * Sửa một ảnh bị trả lại rồi nộp lại. Đổi ảnh là tuỳ chọn, ảnh thay thế đi qua
 * cùng bước chuẩn bị như form nộp. Cam kết phải tick lại.
 */
export function ResubmitForm({
  action,
  schools,
  currentYear,
  defaults,
}: {
  action: FormAction;
  schools: SubmitSchool[];
  currentYear: number;
  defaults: { schoolId: string; angle: string; year: number; kind: ShotKind; note: string };
}) {
  const picker = usePickedImages(1);
  const [state, setState] = useState<ActionState>({ error: "" });
  const [sending, setSending] = useState(false);
  const [, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || picker.busy) return;
    if (picker.hasError) return setState({ error: "Ảnh thay thế bị lỗi, bỏ ra hoặc chọn ảnh khác." });
    const fd = new FormData(e.currentTarget);
    const file = picker.ready[0]?.file;
    if (file) fd.append("file", file, file.name);
    setState({ error: "" });
    setSending(true);
    startTransition(async () => {
      const res = await action({ error: "" }, fd);
      setSending(false);
      setState(res);
      if (!res.error) picker.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <SubmitFields schools={schools} currentYear={currentYear} defaults={defaults} disabled={sending} />
      <div className="grid gap-1">
        <span className="text-xs font-medium text-ink-2">Đổi ảnh khác (tuỳ chọn)</span>
        <ImagePicker picker={picker} multiple={false} disabled={sending} label="Chọn ảnh thay thế" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={sending || picker.busy} className={btnClass}>
          {sending ? "Đang gửi…" : picker.busy ? "Đang chuẩn bị ảnh…" : "Nộp lại"}
        </button>
        <StatusNote state={state} />
      </div>
    </form>
  );
}

/** Nút rút ảnh đang chờ duyệt hoặc bị trả lại, có hỏi xác nhận và hiện lỗi. */
export function WithdrawButton({ action }: { action: (prev: ActionState) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Rút ảnh này? Ảnh sẽ bị xoá, muốn nộp lại phải chọn lại ảnh.")) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] border border-warn px-3 py-1.5 text-[12.5px] font-medium text-warn hover:bg-extra-bg disabled:opacity-60"
      >
        {pending ? "Đang rút…" : "Rút ảnh"}
      </button>
      {state.error && <StatusNote state={state} />}
    </form>
  );
}
