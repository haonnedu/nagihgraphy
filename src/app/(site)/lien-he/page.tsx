import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { db } from "@/lib/db";
import type { FormPhotographer, FormZone } from "@/lib/lead-message";
import { getSettings } from "@/lib/settings";

/**
 * Trang liên hệ, giữ đúng luồng bản artifact cũ: chọn xong là có tin nhắn
 * soạn sẵn, chép rồi dán vào Zalo. Không có sale, khách nhắn thẳng cho thợ
 * qua kênh riêng của thợ; thợ chưa có kênh riêng thì dùng kênh studio.
 * Xem PLAN.md mục 6. Dữ liệu do admin sửa nên làm mới sau 5 phút.
 */
// Render động mỗi request, không prerender lúc build vì CI không có database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đặt lịch chụp",
  description:
    "Chọn thợ, số người, ngày và nơi chụp, web soạn sẵn tin nhắn để bạn gửi thẳng cho thợ qua Zalo, Messenger hoặc Instagram.",
  alternates: { canonical: "/lien-he" },
};

export default async function ContactPage(props: PageProps<"/lien-he">) {
  const sp = await props.searchParams;
  const requested = Array.isArray(sp.tho) ? sp.tho[0] : (sp.tho ?? "");

  const [settings, photographerRows, zoneRows] = await Promise.all([
    getSettings(),
    db.photographer.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
      select: {
        slug: true,
        name: true,
        priceOverride: true,
        tier: {
          select: {
            name: true,
            basePrice: true,
            fullDayPrice: true,
            groupPrices: { select: { people: true, price: true }, orderBy: { people: "asc" } },
          },
        },
      },
    }),
    db.travelZone.findMany({
      orderBy: { order: "asc" },
      select: { slug: true, name: true, minFee: true, maxFee: true, note: true },
    }),
  ]);

  const photographers: FormPhotographer[] = photographerRows.map((p) => ({
    slug: p.slug,
    name: p.name,
    tierName: p.tier.name,
    priceOverride: p.priceOverride,
    tier: { basePrice: p.tier.basePrice, fullDayPrice: p.tier.fullDayPrice, groupPrices: p.tier.groupPrices },
  }));
  const zones: FormZone[] = zoneRows;

  const initialPhotographer = photographers.some((p) => p.slug === requested) ? requested : "";

  return (
    <main className="mx-auto w-full max-w-[640px] flex-1 px-4 pb-16">
      <h1 className="pt-6 font-serif text-[clamp(24px,5.5vw,32px)] font-semibold leading-tight">
        Đặt lịch chụp
      </h1>
      <p className="mt-2 text-ink-2">{settings.booking.lead}</p>

      {settings.booking.steps.length > 0 && (
        <ol className="mt-5 grid gap-3">
          {settings.booking.steps.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[28px_1fr] items-start gap-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-blue text-[13px] font-semibold text-white">
                {i + 1}
              </span>
              <span>
                <b className="block font-semibold">{s.title}</b>
                <span className="text-[13.5px] text-ink-2">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 border-t border-line pt-5">
        <ContactForm
          photographers={photographers}
          zones={zones}
          studioContacts={settings.contacts}
          instagramAccounts={settings.contacts.instagramAccounts}
          studioName={settings.studio.name}
          maxPeople={settings.studio.maxPeople}
          eveningAddonFee={settings.pricing.eveningAddon}
          initialPhotographer={initialPhotographer}
        />
      </div>
    </main>
  );
}
