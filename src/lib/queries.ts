import { db } from "@/lib/db";
import { normalizeForSearch } from "@/lib/slug";
import { priceOf } from "@/lib/pricing";
import { todayVN, type HalfSlot } from "@/lib/availability";

/** Chỉ lấy đúng những trường trang khách cần, tránh kéo cả bảng. */
const photographerSelect = {
  id: true,
  slug: true,
  name: true,
  city: true,
  style: true,
  bio: true,
  rating: true,
  sessions: true,
  priceOverride: true,
  driveUrl: true,
  zalo: true,
  phone: true,
  facebook: true,
  instagram: true,
  isSample: true,
  order: true,
  tier: {
    select: {
      id: true,
      slug: true,
      name: true,
      basePrice: true,
      note: true,
      groupPrices: { select: { people: true, price: true }, orderBy: { people: "asc" } },
    },
  },
  photos: {
    select: { id: true, path: true, width: true, height: true, alt: true },
    orderBy: { order: "asc" },
  },
  tags: { select: { tag: { select: { slug: true, name: true } } } },
  features: {
    select: {
      status: true,
      feature: { select: { key: true, label: true, shortLabel: true, order: true } },
    },
  },
} as const;

type RawPhotographer = Awaited<
  ReturnType<typeof db.photographer.findMany<{ select: typeof photographerSelect }>>
>[number];

export type Photographer = Omit<RawPhotographer, "rating" | "tags" | "features"> & {
  rating: number;
  tags: { slug: string; name: string }[];
  features: { key: string; label: string; shortLabel: string; status: string }[];
  todaySlots: HalfSlot[];
  nextOpenDate: string | null;
};

function shape(p: RawPhotographer, slots: Map<string, HalfSlot[]>, next: Map<string, string>) {
  return {
    ...p,
    rating: Number(p.rating),
    tags: p.tags.map((t) => t.tag),
    features: p.features
      .slice()
      .sort((a, b) => a.feature.order - b.feature.order)
      .map((f) => ({
        key: f.feature.key,
        label: f.feature.label,
        shortLabel: f.feature.shortLabel,
        status: f.status as string,
      })),
    todaySlots: slots.get(p.id) ?? [],
    nextOpenDate: next.get(p.id) ?? null,
  } satisfies Photographer;
}

/**
 * Nạp lịch cho một nhóm thợ trong hai truy vấn: ô trống hôm nay,
 * và ngày trống gần nhất kể từ mai. Tránh N+1.
 */
async function loadAvailability(ids: string[]) {
  const slots = new Map<string, HalfSlot[]>();
  const next = new Map<string, string>();
  if (!ids.length) return { slots, next };

  const today = new Date(`${todayVN()}T00:00:00Z`);

  const rows = await db.availability.findMany({
    where: { photographerId: { in: ids }, date: { gte: today }, status: "OPEN" },
    select: { photographerId: true, date: true, half: true, status: true },
    orderBy: { date: "asc" },
  });

  const todayKey = todayVN();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    if (key === todayKey) {
      const list = slots.get(r.photographerId) ?? [];
      list.push({ half: r.half, status: r.status });
      slots.set(r.photographerId, list);
    } else if (!next.has(r.photographerId)) {
      next.set(r.photographerId, key);
    }
  }
  return { slots, next };
}

export type ListFilters = {
  q?: string;
  city?: string;
  tier?: string;
  tags?: string[];
  sort?: string;
  openToday?: boolean;
};

export type ListResult = {
  photographers: Photographer[];
  cities: string[];
  tiers: { slug: string; name: string }[];
  tags: { slug: string; name: string; count: number }[];
  total: number;
  /** giá khởi điểm thấp nhất trên toàn bộ thợ, không phụ thuộc bộ lọc */
  minPrice: number;
};

export async function listPhotographers(filters: ListFilters): Promise<ListResult> {
  const all = await db.photographer.findMany({
    where: { published: true },
    select: photographerSelect,
    orderBy: { order: "asc" },
  });

  const ids = all.map((p) => p.id);
  const { slots, next } = await loadAvailability(ids);
  let list = all.map((p) => shape(p, slots, next));

  const cities = [...new Set(list.map((p) => p.city).filter(Boolean))];
  const tiers = [...new Map(list.map((p) => [p.tier.slug, p.tier])).values()].map((t) => ({
    slug: t.slug,
    name: t.name,
  }));
  const tagCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of list) {
    for (const t of p.tags) {
      const cur = tagCounts.get(t.slug) ?? { ...t, count: 0 };
      cur.count += 1;
      tagCounts.set(t.slug, cur);
    }
  }

  // --- lọc
  if (filters.city) list = list.filter((p) => p.city === filters.city);
  if (filters.tier) list = list.filter((p) => p.tier.slug === filters.tier);
  if (filters.tags?.length) {
    list = list.filter((p) => {
      const own = new Set(p.tags.map((t) => t.slug));
      return filters.tags!.every((slug) => own.has(slug));
    });
  }
  if (filters.openToday) {
    list = list.filter((p) => p.todaySlots.some((s) => s.status === "OPEN"));
  }
  if (filters.q) {
    // Tìm không dấu, giống hàm norm() của bản artifact cũ.
    const needle = normalizeForSearch(filters.q);
    list = list.filter((p) =>
      normalizeForSearch(
        [p.name, p.style, p.city, p.tier.name, ...p.tags.map((t) => t.name)].join(" "),
      ).includes(needle),
    );
  }

  // --- sắp xếp
  switch (filters.sort) {
    case "price-asc":
      list.sort((a, b) => priceOf(a) - priceOf(b));
      break;
    case "price-desc":
      list.sort((a, b) => priceOf(b) - priceOf(a));
      break;
    case "rating":
      list.sort((a, b) => b.rating - a.rating);
      break;
    case "sessions":
      list.sort((a, b) => b.sessions - a.sessions);
      break;
    default:
      break; // "featured" giữ nguyên thứ tự admin đã sắp
  }

  const prices = all.map((p) => priceOf(p)).filter((n) => n > 0);

  return {
    photographers: list,
    cities,
    tiers,
    tags: [...tagCounts.values()],
    total: all.length,
    minPrice: prices.length ? Math.min(...prices) : 0,
  };
}

export async function getPhotographer(slug: string): Promise<Photographer | null> {
  const row = await db.photographer.findFirst({
    where: { slug, published: true },
    select: photographerSelect,
  });
  if (!row) return null;
  const { slots, next } = await loadAvailability([row.id]);
  return shape(row, slots, next);
}

export async function listPhotographerSlugs(): Promise<string[]> {
  const rows = await db.photographer.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export async function getPricingTables() {
  const [tiers, zones, policies] = await Promise.all([
    db.tier.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        basePrice: true,
        note: true,
        hiddenInTable: true,
        groupPrices: { select: { people: true, price: true }, orderBy: { people: "asc" } },
        _count: { select: { photographers: { where: { published: true } } } },
      },
    }),
    db.travelZone.findMany({
      orderBy: { order: "asc" },
      select: { id: true, slug: true, name: true, minFee: true, maxFee: true, note: true },
    }),
    db.policy.findMany({ orderBy: { order: "asc" }, select: { id: true, text: true } }),
  ]);
  return { tiers, zones, policies };
}
