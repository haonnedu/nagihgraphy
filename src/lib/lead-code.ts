import "server-only";
import { randomInt } from "node:crypto";
import { todayVN } from "@/lib/availability";

/** Bỏ các ký tự dễ nhìn nhầm: 0/O, 1/I/L. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Mã ngắn để chủ studio và khách cùng nhắc tới, VD NG-1909-A7K3.
 * Bốn ký tự cuối cho hơn 900 nghìn tổ hợp mỗi ngày, đủ cho quy mô này.
 * Cột code là unique nên nếu trùng thì Prisma báo lỗi và API sinh lại.
 */
export function newLeadCode(): string {
  const [, mm, dd] = todayVN().split("-");
  let tail = "";
  for (let i = 0; i < 4; i += 1) tail += ALPHABET[randomInt(ALPHABET.length)];
  return `NG-${dd}${mm}-${tail}`;
}
