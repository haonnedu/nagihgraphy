import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Nội dung studio nằm trong bảng site_settings, mỗi khoá một hàng JSON.
 * Schema Zod ở đây vừa để ép kiểu vừa để có giá trị mặc định khi thiếu,
 * nên trang vẫn render được cả khi chưa seed.
 */

const studioSchema = z.object({
  name: z.string().default("NAGIH GRAPHY"),
  logo: z.string().default(""),
  kicker: z.string().default(""),
  pageTitle: z.string().default(""),
  headline: z.string().default(""),
  intro: z.string().default(""),
  priceNote: z.string().default(""),
  cities: z.array(z.string()).default([]),
  maxPeople: z.number().int().min(2).max(20).default(9),
});

const contactsSchema = z.object({
  zalo: z.string().default(""),
  phone: z.string().default(""),
  instagram: z.string().default(""),
  facebook: z.string().default(""),
  tiktok: z.string().default(""),
});

const bookingSchema = z.object({
  lead: z.string().default(""),
  steps: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .default([]),
});

const travelSchema = z.object({ note: z.string().default("") });

const pricingSchema = z.object({
  /** phụ phí chụp thêm buổi tối đến 20h */
  eveningAddon: z.number().int().min(0).default(500_000),
});

/**
 * Chữ ở đầu trang chủ, admin sửa trong /admin/hero. Trường nào trống thì trang
 * chủ rơi về studio.kicker / headline / intro và số liệu tự tính từ database.
 */
const heroSchema = z.object({
  /** dòng nhỏ in hoa phía trên tiêu đề */
  eyebrow: z.string().default(""),
  /** tiêu đề; cụm trong hai dấu * đổi sang màu nhấn */
  headline: z.string().default(""),
  /** đoạn mô tả; cụm trong **hai dấu sao kép** in đậm */
  lead: z.string().default(""),
  /** viên số liệu dưới tiêu đề, tối đa 4; trống thì tự tính */
  stats: z.array(z.object({ value: z.string(), label: z.string() })).max(4).default([]),
  primaryLabel: z.string().default(""),
  secondaryLabel: z.string().default(""),
});

const SCHEMAS = {
  studio: studioSchema,
  contacts: contactsSchema,
  booking: bookingSchema,
  travel: travelSchema,
  pricing: pricingSchema,
  hero: heroSchema,
} as const;

export type Settings = {
  [K in keyof typeof SCHEMAS]: z.infer<(typeof SCHEMAS)[K]>;
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.siteSetting.findMany({
    where: { key: { in: Object.keys(SCHEMAS) } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const out = {} as Settings;
  for (const [key, schema] of Object.entries(SCHEMAS)) {
    const parsed = schema.safeParse(byKey.get(key) ?? {});
    // Parse hỏng thì dùng mặc định thay vì để cả trang chết.
    Object.assign(out, {
      [key]: parsed.success ? parsed.data : schema.parse({}),
    });
  }
  return out;
}

/**
 * Logic ghép và lọc kênh liên hệ nằm ở lib/contacts.ts để client dùng chung.
 * Giữ re-export cho các chỗ đang import từ đây.
 */
export { contactLinks, mergeContacts } from "@/lib/contacts";
