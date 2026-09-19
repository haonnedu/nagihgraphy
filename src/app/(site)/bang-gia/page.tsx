import type { Metadata } from "next";
import Link from "next/link";
import { TravelCalculator } from "@/components/travel-calculator";
import { money, travelFeeText } from "@/lib/pricing";
import { getPricingTables } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

// Render động mỗi request, không prerender lúc build vì CI không có database.
export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: "Bảng giá và phụ phí đi tỉnh",
  description:
    "Giá chụp kỷ yếu theo hạng ekip của NAGIH GRAPHY, kèm bảng phụ phí di chuyển cho hơn 20 tỉnh thành và các chính sách đi tỉnh.",
  alternates: { canonical: "/bang-gia" },
};

export default async function PricingPage() {
  const [{ tiers, zones, policies }, settings] = await Promise.all([
    getPricingTables(),
    getSettings(),
  ]);

  const visibleTiers = tiers.filter((t) => !t.hiddenInTable);

  return (
    <main className="mx-auto w-full max-w-[820px] flex-1 px-4 pb-16">
      <section className="pt-6">
        <h1 className="font-serif text-[clamp(24px,5.5vw,32px)] font-semibold leading-tight text-blue">
          Bảng giá theo hạng ekip
        </h1>
        <p className="mt-2 max-w-[62ch] text-ink-2">{settings.studio.priceNote}</p>

        <div className="mt-4 overflow-hidden rounded-card border border-line bg-surface">
          {visibleTiers.map((t, i) => (
            <div
              key={t.id}
              className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 ${i > 0 ? "border-t border-line" : ""}`}
            >
              <span className="font-semibold">{t.name}</span>
              <span className="col-start-2 row-span-2 row-start-1 text-right font-semibold tabular-nums text-blue">
                {t.basePrice > 0 && <small className="font-normal text-ink-3">từ </small>}
                <span className="text-base">{money(t.basePrice)}</span>
                <small className="block text-[11.5px] font-normal text-ink-3">
                  {t._count.photographers} thợ
                </small>
              </span>
              {t.note && <span className="col-start-1 text-[13px] text-ink-2">{t.note}</span>}
            </div>
          ))}
        </div>

        {visibleTiers.some((t) => t.groupPrices.length > 0) ? (
          <GroupPriceTable tiers={visibleTiers} />
        ) : (
          <p className="mt-3 rounded-xl border border-extra-line bg-extra-bg px-3 py-2.5 text-[13px] text-extra-ink">
            Chưa có bảng giá gói nhóm trên hệ thống. Nhắn studio để được báo giá theo số người.
          </p>
        )}
      </section>

      <section className="mt-10" id="phu-phi">
        <h2 className="font-serif text-[22px] font-semibold leading-tight text-blue">
          Phụ phí di chuyển đi tỉnh
        </h2>
        <p className="mb-3.5 mt-1 max-w-[62ch] text-ink-2">{settings.travel.note}</p>

        <TravelCalculator zones={zones} />

        <details className="mt-3">
          <summary className="cursor-pointer py-1.5 font-medium text-blue">
            Xem bảng phụ phí {zones.length} địa điểm
          </summary>
          <div className="mt-1.5 overflow-hidden rounded-card border border-line bg-surface">
            {zones.map((z, i) => (
              <div
                key={z.id}
                className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 ${i > 0 ? "border-t border-line" : ""}`}
              >
                <span className="font-semibold">{z.name}</span>
                <span className="col-start-2 row-span-2 row-start-1 text-right font-semibold tabular-nums text-blue">
                  {travelFeeText({ min: z.minFee, max: z.maxFee })}
                  <small className="block text-[11.5px] font-normal text-ink-3">/ 1 thợ</small>
                </span>
                {z.note && <span className="col-start-1 text-[13px] text-ink-2">{z.note}</span>}
              </div>
            ))}
          </div>
        </details>

        {policies.length > 0 && (
          <ul className="mt-4 grid list-disc gap-1 pl-5 text-[13.5px] text-ink-2">
            {policies.map((p) => (
              <li key={p.id}>{p.text}</li>
            ))}
          </ul>
        )}

        <p className="mt-4 rounded-xl border border-extra-line bg-extra-bg px-3 py-2.5 text-[13px] text-extra-ink">
          Chụp thêm buổi tối đến 20h cộng {money(settings.pricing.eveningAddon)}.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-2.5">
        <Link
          href="/tho"
          className="rounded-[10px] border border-line-2 bg-surface px-4 py-3 font-medium hover:border-ink-3"
        >
          Xem danh sách thợ
        </Link>
        <Link
          href="/lien-he"
          className="rounded-[10px] border border-cta bg-cta px-4 py-3 font-medium text-white hover:bg-cta-hover"
        >
          Nhắn studio để báo giá chính xác
        </Link>
      </div>
    </main>
  );
}

type TierWithGroups = {
  id: string;
  name: string;
  basePrice: number;
  groupPrices: { people: number; price: number }[];
};

function GroupPriceTable({ tiers }: { tiers: TierWithGroups[] }) {
  const peopleSet = [...new Set(tiers.flatMap((t) => t.groupPrices.map((g) => g.people)))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="mt-6">
      <h2 className="font-serif text-[18px] font-semibold text-blue">Giá gói nhóm</h2>
      <div className="mt-2 overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-4 py-2.5 font-semibold">Hạng</th>
              {peopleSet.map((n) => (
                <th key={n} className="px-4 py-2.5 text-right font-semibold">
                  {n} người
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5">{t.name}</td>
                {peopleSet.map((n) => {
                  const g = t.groupPrices.find((x) => x.people === n);
                  return (
                    <td key={n} className="px-4 py-2.5 text-right tabular-nums">
                      {g ? money(g.price) : <span className="text-ink-3">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
