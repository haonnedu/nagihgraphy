import type { Metadata } from "next";
import { PhotographerCard } from "@/components/photographer-card";
import { PhotographerFilters } from "@/components/photographer-filters";
import { listPhotographers } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/pricing";

// Render động mỗi request. Dù có searchParams, Next vẫn thử prerender lúc build
// và lúc đó không có database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chọn thợ chụp",
  description:
    "Danh sách thợ chụp kỷ yếu của NAGIH GRAPHY. Lọc theo khu vực, hạng ekip và dịch vụ đi kèm, xem portfolio và giá khởi điểm từng người.",
  alternates: { canonical: "/tho" },
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function many(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function PhotographersPage(props: PageProps<"/tho">) {
  const sp = await props.searchParams;

  const active = {
    q: first(sp.q),
    city: first(sp.city),
    tier: first(sp.tier),
    tags: many(sp.tag),
    sort: first(sp.sort) || "featured",
    openToday: first(sp.today) === "1",
  };

  const [{ photographers, cities, tiers, tags, total, minPrice }, settings] = await Promise.all([
    listPhotographers(active),
    getSettings(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-4">
      <section className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2.5 pb-1.5 pt-6">
        <div>
          <h1 className="font-serif text-[clamp(26px,6vw,36px)] font-semibold leading-tight tracking-tight text-balance">
            Chọn thợ{" "}
            <span className="font-script text-[1.22em] leading-none text-blue">theo vibe</span>
          </h1>
          <p className="mt-1.5 max-w-[60ch] text-ink-2">{settings.studio.intro}</p>
        </div>
        <p className="text-[12.5px] text-ink-3">
          <b className="font-semibold text-ink">{total}</b> thợ
          {minPrice > 0 && (
            <>
              {" · giá từ "}
              <b className="font-semibold text-ink">{money(minPrice)}</b>
            </>
          )}
        </p>
      </section>

      <PhotographerFilters
        facets={{ cities, tiers, tags }}
        active={active}
        shown={photographers.length}
      />

      {photographers.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-line-2 px-4 py-8 text-center text-ink-2">
          Chưa có thợ nào khớp bộ lọc này. Thử bỏ bớt điều kiện xem sao.
        </p>
      ) : (
        <section className="grid grid-cols-2 gap-3 pb-10 pt-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {photographers.map((p, i) => (
            <PhotographerCard key={p.id} p={p} index={i} priority={i < 4} />
          ))}
        </section>
      )}
    </main>
  );
}
