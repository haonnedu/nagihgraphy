import type { AdminRole } from "@/generated/prisma/enums";
import type { DefaultSession } from "next-auth";

/** Thêm id và role vào session, để layout admin biết ai đang đăng nhập và được làm gì. */
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AdminRole;
    };
  }
  interface User {
    role?: AdminRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: AdminRole;
  }
}
