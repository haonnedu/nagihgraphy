import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import type { AdminRole } from "@/generated/prisma/enums";

/**
 * Đăng nhập admin bằng email và mật khẩu, so bcrypt với bảng admin_users.
 * Phiên lưu trong JWT cookie, không cần bảng session. Xem PLAN.md mục 3.
 *
 * Tài khoản thợ (role PHOTOGRAPHER) mang theo photographerId trong phiên;
 * mọi trang lịch lấy id thợ từ đây, không bao giờ lấy từ URL. Xem PLAN.md mục 11.
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          photographerId: user.photographerId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; role?: AdminRole; photographerId?: string | null };
        token.uid = u.id;
        token.role = u.role ?? "VIEWER";
        token.pid = u.photographerId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      session.user.role = (token.role as AdminRole) ?? "VIEWER";
      session.user.photographerId = (token.pid as string | null) ?? null;
      return session;
    },
  },
});
