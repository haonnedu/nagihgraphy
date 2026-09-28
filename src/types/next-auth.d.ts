import type { AdminRole } from "@/generated/prisma/enums";
import type { DefaultSession } from "next-auth";

/**
 * Thêm id, role và photographerId vào session, để layout admin biết ai đang
 * đăng nhập, được làm gì, và nếu là thợ thì là thợ nào.
 */
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AdminRole;
      photographerId: string | null;
    };
  }
  interface User {
    role?: AdminRole;
    photographerId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: AdminRole;
    pid?: string | null;
  }
}
