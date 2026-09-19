"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = { error: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="grid gap-3.5">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-ink-2">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-sm focus:border-blue focus:outline-none focus:ring-3 focus:ring-blue-soft"
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-ink-2">Mật khẩu</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-sm focus:border-blue focus:outline-none focus:ring-3 focus:ring-blue-soft"
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl border border-extra-line bg-extra-bg px-3 py-2 text-[13px] text-extra-ink">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] border border-blue bg-blue px-4 py-3 font-medium text-white hover:bg-blue-deep disabled:opacity-60"
      >
        {pending ? "Đang kiểm tra…" : "Đăng nhập"}
      </button>
    </form>
  );
}
