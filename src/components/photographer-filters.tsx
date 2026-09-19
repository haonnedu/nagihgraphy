"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Bộ lọc nằm trong URL chứ không trong state, để trang vẫn render được
 * từ server và chia sẻ link giữ nguyên bộ lọc. Xem PLAN.md mục 5.
 */

export type Facets = {
  cities: string[];
  tiers: { slug: string; name: string }[];
  tags: { slug: string; name: string; count: number }[];
};

export type ActiveFilters = {
  q: string;
  city: string;
  tier: string;
  tags: string[];
  sort: string;
  openToday: boolean;
};

const SORTS = [
  { value: "featured", label: "Nổi bật" },
  { value: "price-desc", label: "Giá cao → thấp" },
  { value: "price-asc", label: "Giá thấp → cao" },
  { value: "rating", label: "Đánh giá cao nhất" },
  { value: "sessions", label: "Chụp nhiều nhất" },
];

export function PhotographerFilters({
  facets,
  active,
  shown,
}: {
  facets: Facets;
  active: ActiveFilters;
  shown: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [panelOpen, setPanelOpen] = useState(
    Boolean(active.city || active.tier || active.openToday),
  );
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ô tìm kiếm giữ state riêng để gõ mượt, nhưng phải theo kịp URL khi người
  // dùng bấm back. Đây là cách React khuyến nghị để đồng bộ state với prop:
  // so sánh ngay trong lúc render, không dùng useEffect.
  const [query, setQuery] = useState(active.q);
  const [syncedQuery, setSyncedQuery] = useState(active.q);
  if (syncedQuery !== active.q) {
    setSyncedQuery(active.q);
    setQuery(active.q);
  }

  function push(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function setParam(key: string, value: string) {
    push((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  function onSearch(value: string) {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParam("q", value.trim()), 300);
  }

  function toggleTag(slug: string) {
    push((params) => {
      const current = params.getAll("tag");
      params.delete("tag");
      const next = current.includes(slug)
        ? current.filter((t) => t !== slug)
        : [...current, slug];
      for (const t of next) params.append("tag", t);
    });
  }

  const activeCount =
    (active.city ? 1 : 0) + (active.tier ? 1 : 0) + (active.openToday ? 1 : 0);
  const hasAny = activeCount > 0 || active.tags.length > 0 || Boolean(active.q);

  return (
    <section className="grid gap-2.5 py-3.5" aria-busy={pending}>
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc phong cách…"
          aria-label="Tìm thợ"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-3 focus:ring-blue-soft"
        />
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
          className="shrink-0 rounded-[10px] border border-line-2 bg-surface px-3.5 py-2.5 text-[13.5px] font-medium hover:border-ink-3"
        >
          Bộ lọc{activeCount > 0 && ` · ${activeCount}`}
        </button>
      </div>

      {panelOpen && (
        <div className="grid gap-3 rounded-card border border-line bg-surface p-3.5">
          {facets.cities.length > 1 && (
            <div>
              <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                Khu vực
              </h4>
              <div className="flex flex-wrap gap-2">
                <Chip on={!active.city} onClick={() => setParam("city", "")}>
                  Tất cả
                </Chip>
                {facets.cities.map((c) => (
                  <Chip
                    key={c}
                    on={active.city === c}
                    onClick={() => setParam("city", active.city === c ? "" : c)}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Hạng ekip
            </h4>
            <div className="flex flex-wrap gap-2">
              <Chip on={!active.tier} onClick={() => setParam("tier", "")}>
                Tất cả
              </Chip>
              {facets.tiers.map((t) => (
                <Chip
                  key={t.slug}
                  on={active.tier === t.slug}
                  onClick={() => setParam("tier", active.tier === t.slug ? "" : t.slug)}
                >
                  {t.name}
                </Chip>
              ))}
            </div>
          </div>

          <label className="inline-flex select-none items-center gap-2 text-[13px] text-ink-2">
            <input
              type="checkbox"
              checked={active.openToday}
              onChange={(e) => setParam("today", e.target.checked ? "1" : "")}
              className="size-4.5 accent-blue"
            />
            Chỉ hiện thợ còn lịch hôm nay
          </label>
        </div>
      )}

      {facets.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {facets.tags.map((t) => (
            <Chip key={t.slug} on={active.tags.includes(t.slug)} onClick={() => toggleTag(t.slug)}>
              {t.name}{" "}
              <span className={active.tags.includes(t.slug) ? "text-white/65" : "text-ink-3"}>
                {t.count}
              </span>
            </Chip>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          value={active.sort}
          onChange={(e) => setParam("sort", e.target.value === "featured" ? "" : e.target.value)}
          aria-label="Sắp xếp"
          className="rounded-[10px] border border-line-2 bg-sunk py-2 pl-3 pr-8 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <p className="text-[12.5px] text-ink-3">
          Hiển thị <b className="font-semibold text-ink">{shown}</b> thợ
          {hasAny && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
                className="text-blue underline underline-offset-2"
              >
                Xoá bộ lọc
              </button>
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={
        on
          ? "inline-flex items-center gap-1.5 rounded-full border border-blue bg-blue px-3 py-1.5 text-[13px] text-white"
          : "inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-3 py-1.5 text-[13px] hover:border-blue"
      }
    >
      {children}
    </button>
  );
}
