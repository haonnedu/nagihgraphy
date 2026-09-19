import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  robots: { index: false, follow: false },
};

/** Nằm ngoài nhóm (panel) để không bị guard chuyển hướng vòng lặp. */
export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/admin");

  return (
    <main className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center px-4 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">NAGIH GRAPHY</p>
      <h1 className="mt-2 font-serif text-[26px] font-semibold leading-tight">Quản trị</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">Dành cho chủ studio và thợ. Khách không cần đăng nhập.</p>
      <div className="mt-6 rounded-card border border-line bg-surface p-4">
        <LoginForm />
      </div>
    </main>
  );
}
