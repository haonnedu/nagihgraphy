import { z } from "zod";

/**
 * Dữ liệu form liên hệ, dùng chung cho client (kiểm tra trước khi gửi)
 * và API route (kiểm tra lại, không tin client). Không import gì từ server.
 */

/** Số điện thoại Việt Nam: 0 + 9 số, hoặc +84 + 9 số. Cho phép chấm, cách, gạch. */
export const phoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s.\-()]/g, ""))
  .pipe(z.string().regex(/^(0\d{9}|\+84\d{9})$/, "Số điện thoại chưa đúng"));

export const SHOOT_TYPES = ["FULL_DAY", "HALF_DAY"] as const;
export const LEAD_CHANNELS = ["ZALO", "INSTAGRAM", "FACEBOOK", "PHONE", "SMS", "FORM"] as const;

export const leadInputSchema = z.object({
  customerName: z.string().trim().min(1, "Cho studio biết tên bạn nhé").max(80),
  phone: phoneSchema,
  zalo: z.string().trim().max(40).default(""),
  email: z.string().trim().email().max(120).or(z.literal("")).default(""),

  photographerSlug: z.string().trim().max(80).default(""),
  shootType: z.enum(SHOOT_TYPES).default("FULL_DAY"),
  /** YYYY-MM-DD hoặc rỗng */
  shootDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .default(""),
  people: z.coerce.number().int().min(1).max(20).default(1),
  travelZoneSlug: z.string().trim().max(80).default(""),
  placeDetail: z.string().trim().max(120).default(""),
  concept: z.string().trim().max(500).default(""),
  eveningAddon: z.boolean().default(false),

  channel: z.enum(LEAD_CHANNELS).default("FORM"),

  /**
   * honeypot: người thật không thấy ô này. Không chặn ở schema, để API
   * trả về "thành công" giả cho bot, bot không biết mà đổi cách.
   */
  website: z.string().max(200).default(""),
});

export type LeadInput = z.infer<typeof leadInputSchema>;
