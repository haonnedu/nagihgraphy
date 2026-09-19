"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error: string };

/**
 * Server action cho form đăng nhập. signIn thành công thì tự redirect về
 * /admin bằng cách ném một redirect đặc biệt, phải ném tiếp chứ không nuốt.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/admin" });
    return { error: "" };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email hoặc mật khẩu chưa đúng." };
    }
    throw err; // redirect của Next đi qua đây
  }
}
