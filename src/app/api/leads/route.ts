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
 * Khách bấm Đặt từ ảnh ở trang trường: tra lại tên trường và góc từ slug, id.
 * Góc chỉ nhận khi thuộc đúng trường đó; sai thì bỏ qua, không báo lỗi.
 * Bảng leads chưa có cột trường, nên tên trường và góc nằm trong tin nhắn
 * báo về và ghi chú của sự kiện đầu tiên trong lịch sử lead.
 */
async function loadReference(schoolSlug: string, angleId: string) {
  if (!schoolSlug) return { school: null, angle: "" };
  const school = await db.school.findUnique({ where: { slug: schoolSlug }, select: { id: true, name: true } });
  if (!school) return { school: null, angle: "" };
  const angle = angleId
    ? await db.schoolAngle.findFirst({ where: { id: angleId, schoolId: school.id }, select: { name: true } })
    : null;
  return { school: { name: school.name }, angle: angle?.name ?? "" };
}

function referenceNote(ref: { school: { name: string } | null; angle: string }): string {
  if (!ref.school) return "";
  return ref.angle ? ` · ảnh tham khảo: góc ${ref.angle} tại ${ref.school.name}` : ` · trường: ${ref.school.name}`;
}

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

  const [settings, photographer, zone, reference] = await Promise.all([
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
                fullDayPrice: true,
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
    loadReference(input.schoolSlug, input.angleId),
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
    shootType: input.shootType,
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
    data: {
      leadId: lead.id,
      fromStatus: null,
      toStatus: "NEW",
      note: `Khách gửi từ web qua ${input.channel}${referenceNote(reference)}`,
    },
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
      school: reference.school,
      angle: reference.angle,
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
