"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionState = { error: string; ok?: string };

/**
 * Bọc một server action kiểu (prev, formData) => state. Children là JSX
 * từ server truyền vào, nên các trang admin không phải viết client component
 * riêng cho từng form.
 */
export function ActionForm({
  action,
  children,
  className = "",
  submitLabel = "Lưu",
  resetOnOk = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  submitLabel?: string;
  resetOnOk?: boolean;
}) {
  // Form upload xong thì đổi key để React dựng lại form, xoá file đã chọn,
  // tránh bấm lần nữa gửi lại nhầm. Đếm trong callback của action, không
  // gọi hàm ngẫu nhiên lúc render.
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const next = await action(prev, formData);
      if (resetOnOk && next.ok) setFormKey((k) => k + 1);
      return next;
    },
    { error: "" },
  );

  return (
    <form action={formAction} className={className} key={formKey}>
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <StatusNote state={state} />
      </div>
    </form>
  );
}

export function SubmitButton({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "danger" | "ghost";
}) {
  const { pending } = useFormStatus();
  const cls =
    tone === "danger"
      ? "border-warn text-warn hover:bg-extra-bg"
      : tone === "ghost"
        ? "border-line-2 text-ink hover:border-ink-3"
        : "border-blue bg-blue text-white hover:bg-blue-deep";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-[10px] border px-3.5 py-2 text-[13.5px] font-medium disabled:opacity-60 ${cls}`}
    >
      {pending ? "Đang lưu…" : children}
    </button>
  );
}

export function StatusNote({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-[13px] text-warn">
        {state.error}
      </p>
    );
  }
  if (state.ok) return <p className="text-[13px] text-in-ink">{state.ok}</p>;
  return null;
}

/** Nút gọi server action không có form dữ liệu, có hỏi xác nhận khi cần. */
export function ActionButton({
  action,
  children,
  confirm,
  tone = "ghost",
}: {
  action: () => Promise<unknown>;
  children: ReactNode;
  confirm?: string;
  tone?: "blue" | "danger" | "ghost";
}) {
  return (
    <form
      action={async () => {
        await action();
      }}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline"
    >
      <SubmitButton tone={tone}>{children}</SubmitButton>
    </form>
  );
}

export const inputClass =
  "w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-sm placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-3 focus:ring-blue-soft";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <small className="text-[11.5px] text-ink-3">{hint}</small>}
    </label>
  );
}
