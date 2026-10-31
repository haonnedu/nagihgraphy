import { z } from "zod";
import { db } from "@/lib/db";
import { recordStat } from "@/lib/school-service";

export const dynamic = "force-dynamic";

/**
 * Đếm lượt khách mở ảnh trường (view) và bấm Đặt từ ảnh (book) cho Photo
 * chụp ảnh đó. Gọi từ trình duyệt bằng navigator.sendBeacon hoặc fetch keepalive.
 *
 * Luôn trả 204, kể cả khi dữ liệu sai hay DB lỗi: con số chỉ để tạo động lực,
 * không đáng làm hỏng trải nghiệm của khách, và không để lộ gì cho người dò.
 * Chặn nhẹ: bỏ qua request khác origin và bot tự khai. Traefik giới hạn nhịp
 * theo IP (router nagih-stats trong docker-compose.yml), và ở đây mỗi IP chỉ
 * được đếm một lần cho mỗi ảnh mỗi loại trong DEDUPE_MS, để gọi lặp không thổi
 * phồng con số.
 */

const bodySchema = z.object({
  photoId: z.string().min(1).max(40),
  type: z.enum(["view", "book"]),
});

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|zalo.*link/i;

/** Một IP mở lại cùng ảnh trong khoảng này thì không đếm thêm. */
const DEDUPE_MS = 30 * 60 * 1000;
/** Trần số khoá nhớ trong RAM, đầy thì dọn khoá hết hạn rồi bỏ khoá cũ nhất. */
const DEDUPE_MAX = 20_000;
const seen = new Map<string, number>();

/** true nếu (IP, ảnh, loại) đã đếm gần đây; chưa thì ghi nhận và trả false. */
function alreadyCounted(key: string): boolean {
  const now = Date.now();
  const at = seen.get(key);
  if (at !== undefined && now - at < DEDUPE_MS) return true;
  seen.delete(key); // xoá rồi set lại để khoá mới nằm cuối Map (thứ tự chèn)
  seen.set(key, now);
  if (seen.size > DEDUPE_MAX) {
    for (const [k, t] of seen) {
      if (seen.size <= DEDUPE_MAX && now - t < DEDUPE_MS) break;
      seen.delete(k);
    }
  }
  return false;
}

function clientIp(request: Request): string {
  // Traefik ghi IP thật vào x-real-ip / đầu x-forwarded-for.
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("x-real-ip") || fwd || "unknown";
}

function noContent() {
  return new Response(null, { status: 204 });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return noContent();
    if (BOT_UA.test(request.headers.get("user-agent") ?? "")) return noContent();

    // sendBeacon gửi text/plain, nên đọc text rồi tự parse thay vì request.json().
    const raw = await request.text();
    if (raw.length > 500) return noContent();
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return noContent(); // body hỏng thì bỏ qua, không ghi log cho đỡ rác
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return noContent();

    // Chỉ đếm ảnh đã duyệt của Photo đang hiện; bài nộp chờ duyệt không có ở đây.
    const photo = await db.schoolPhoto.findFirst({
      where: { id: parsed.data.photoId, photographer: { published: true } },
      select: { photographerId: true },
    });
    if (!photo) return noContent();
    if (alreadyCounted(`${clientIp(request)}|${parsed.data.photoId}|${parsed.data.type}`)) return noContent();
    await recordStat(photo.photographerId, parsed.data.type);
  } catch (err) {
    console.error("[truong/su-kien]", err);
  }
  return noContent();
}
