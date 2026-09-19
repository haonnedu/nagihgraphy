import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import type { AdminRole } from "@/generated/prisma/enums";

/**
 * Đăng nhập admin bằng email và mật khẩu, so bcrypt với bảng admin_users.
 * Phiên lưu trong JWT cookie, không cần bảng session. Chỉ 2–5 tài khoản
 * nội bộ nên không cần OAuth. Xem PLAN.md mục 3.
 *
 * trustHost: đứng sau Traefik nên Host header là của proxy, phải tin nó.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await db.adminUser.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: AdminRole }).role ?? "VIEWER";
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      session.user.role = (token.role as AdminRole) ?? "VIEWER";
      return session;
    },
  },
});
