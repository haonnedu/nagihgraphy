import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newLeadCode } from "@/lib/lead-code";
import { buildLeadMessage } from "@/lib/lead-message";
import { leadInputSchema } from "@/lib/lead-schema";
import { notifyNewLead } from "@/lib/notify";
import { quote } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { formatDateVN } from "@/lib/availability";

export const dynamic = "force-dynamic";

/**
 * Nhận lead từ form liên hệ. Giới hạn nhịp nằm ở Traefik (10 req/phút/IP),
 * xem docker-compose.yml. Ở đây chỉ kiểm tra dữ liệu và honeypot.
 *
 * Giá lưu vào lead được tính lại từ database, không tin con số client gửi.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const parsed = leadInputSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: first?.message ?? "Dữ liệu không hợp lệ", field: first?.path[0] },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Bot điền vào ô ẩn thì trả về như thành công để nó không thử cách khác.
  if (input.website) {
    return NextResponse.json({ ok: true, code: "NG-0000-XXXX" });
  }

  const [settings, photographer, zone] = await Promise.all([
    getSettings(),
    input.photographerSlug
      ? db.photographer.findFirst({
          where: { slug: input.photographerSlug, published: true },
          select: {
            id: true,
            slug: true,
            name: true,
            priceOverride: true,
            tier: {
              select: {
                name: true,
                basePrice: true,
                groupPrices: { select: { people: true, price: true } },
              },
            },
          },
        })
      : null,
    input.travelZoneSlug
      ? db.travelZone.findUnique({
          where: { slug: input.travelZoneSlug },
          select: { id: true, slug: true, name: true, minFee: true, maxFee: true, note: true },
        })
      : null,
  ]);

  const priceable = photographer
    ? {
        slug: photographer.slug,
        name: photographer.name,
        tierName: photographer.tier.name,
        priceOverride: photographer.priceOverride,
        tier: photographer.tier,
      }
    : null;

  const q = quote({
    photographer: priceable,
    people: input.people,
    zone: zone ? { min: zone.minFee, max: zone.maxFee } : null,
    eveningAddon: input.eveningAddon,
    eveningAddonFee: settings.pricing.eveningAddon,
  });

  const data = {
    photographerId: photographer?.id ?? null,
    customerName: input.customerName,
    phone: input.phone,
    zalo: input.zalo,
    email: input.email,
    shootDate: input.shootDate ? new Date(`${input.shootDate}T00:00:00Z`) : null,
    shootType: input.shootType,
    people: input.people,
    travelZoneId: zone?.id ?? null,
    placeDetail: input.placeDetail,
    concept: input.concept,
    eveningAddon: input.eveningAddon,
    quotedBase: q.base,
    quotedTravel: q.travelMin,
    quotedTotal: q.totalMin,
    channel: input.channel,
    userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? "",
    referrer: request.headers.get("referer")?.slice(0, 300) ?? "",
  };

  // Mã lead là unique; trùng thì sinh lại, tối đa 3 lần.
  let lead: { id: string; code: string } | null = null;
  for (let attempt = 0; attempt < 3 && !lead; attempt += 1) {
    try {
      lead = await db.lead.create({
        data: { ...data, code: newLeadCode() },
        select: { id: true, code: true },
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "P2002" || attempt === 2) throw err;
    }
  }
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Không lưu được, thử lại sau" }, { status: 500 });
  }

  await db.leadEvent.create({
    data: { leadId: lead.id, fromStatus: null, toStatus: "NEW", note: `Khách gửi từ web qua ${input.channel}` },
  });

  const message = buildLeadMessage(
    {
      photographer: priceable,
      shootType: input.shootType,
      shootDate: input.shootDate,
      people: input.people,
      zone,
      placeDetail: input.placeDetail,
      concept: input.concept,
      eveningAddon: input.eveningAddon,
      customerName: input.customerName,
      phone: input.phone,
    },
    { studioName: settings.studio.name, eveningAddonFee: settings.pricing.eveningAddon },
  );

  // Không await để khách nhận phản hồi ngay; lỗi Telegram không ảnh hưởng lead.
  void notifyNewLead(
    `🆕 Lead ${lead.code} (${input.channel})\n` +
      `${input.customerName} · ${input.phone}\n` +
      (input.shootDate ? `Ngày: ${formatDateVN(input.shootDate)}\n` : "") +
      `\n${message}`,
  );

  return NextResponse.json({ ok: true, code: lead.code });
}
