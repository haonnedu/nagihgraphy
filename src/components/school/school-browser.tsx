"use client";

import Link from "next/link";
import { useState } from "react";
import { normalizeForSearch } from "@/lib/slug";
import type { PublicSchoolCard } from "@/lib/school-queries";
import { FilterChip } from "@/components/school/chip";
import { SchoolPicture, SchoolPlaceholder } from "@/components/school/school-picture";

/**
 * Tìm trường (bỏ dấu vẫn ra) và lọc thành phố, chạy ngay ở trình duyệt vì
 * danh sách trường nhỏ, không cần hỏi lại server mỗi lần gõ.
 * Trường "live" ở lưới chính, trường "soon" dồn xuống khu "Sắp có ảnh".
 */
export function SchoolBrowser({
  live,
  soon,
  cities,
}: {
  live: PublicSchoolCard[];
  soon: PublicSchoolCard[];
  cities: string[];
}) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");

  const q = normalizeForSearch(query);
  const match = (s: PublicSchoolCard) =>
    (!city || s.city === city) && (!q || normalizeForSearch(`${s.name} ${s.short} ${s.city}`).includes(q));

  const liveShown = live.filter(match);
  const soonShown = soon.filter(match);
  const hasFilter = Boolean(q || city);

  function reset() {
    setQuery("");
    setCity("");
  }

  return (
    <>
      <section className="grid gap-2.5 py-3.5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm trường, VD: thuong mai, NEU…"
          aria-label="Tìm trường"
          autoComplete="off"
          className="w-full rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-3 focus:ring-blue-soft"
        />
        {cities.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Thành phố">
            <FilterChip on={!city} onClick={() => setCity("")}>
              Tất cả
            </FilterChip>
            {cities.map((c) => (
              <FilterChip key={c} on={city === c} onClick={() => setCity(city === c ? "" : c)}>
                {c}
              </FilterChip>
            ))}
          </div>
        )}
      </section>

      {liveShown.length === 0 && soonShown.length === 0 ? (
        <div className="mt-2 rounded-card border border-dashed border-line-2 px-4 py-8 text-center text-ink-2">
          <p>Chưa thấy trường nào khớp “{query.trim() || city}”.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-[10px] border border-line-2 bg-surface px-3.5 py-2 text-[13.5px] font-medium hover:border-ink-3"
          >
            Xoá tìm kiếm
          </button>
        </div>
      ) : (
        <>
          {liveShown.length > 0 && (
            <section className="grid grid-cols-1 gap-3 pb-6 pt-2.5 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {liveShown.map((s, i) => (
                <LiveCard key={s.id} s={s} eager={i < 3} priority={i === 0} />
              ))}
            </section>
          )}

          {soonShown.length > 0 && (
            <section className="pb-6 pt-4">
              <h2 className="font-serif text-[clamp(20px,4.2vw,26px)] font-semibold leading-tight text-blue">
                Sắp có ảnh
              </h2>
              <p className="mt-1 max-w-[60ch] text-[13.5px] text-ink-2">
                NAGIH đã và đang chụp ở các trường này, ảnh đang được gom để đưa lên. Muốn xem trước thì
                nhắn studio nhé.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {soonShown.map((s) => (
                  <SoonCard key={s.id} s={s} />
                ))}
              </div>
            </section>
          )}

          {hasFilter && (
            <p className="text-[12.5px] text-ink-3">
              Hiển thị <b className="font-semibold text-ink">{liveShown.length + soonShown.length}</b> trường
              {" · "}
              <button type="button" onClick={reset} className="text-blue underline underline-offset-2">
                Xoá tìm kiếm
              </button>
            </p>
          )}
        </>
      )}
    </>
  );
}

/** "Hà Nội · 8 ảnh · 6 Photo đã chụp" */
function statLine(s: PublicSchoolCard): string {
  return [s.city, `${s.photoCount} ảnh`, `${s.photographerCount} Photo đã chụp`].filter(Boolean).join(" · ");
}

/** eager: hàng đầu trên máy tính (3 cột); priority chỉ card đầu, ảnh LCP trên điện thoại. */
function LiveCard({ s, eager, priority }: { s: PublicSchoolCard; eager: boolean; priority: boolean }) {
  return (
    <article className="group relative overflow-hidden rounded-card border border-line bg-surface transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <Link href={`/truong/${s.slug}`} className="flex h-full flex-col text-inherit no-underline">
        <div className="relative aspect-4/3 overflow-hidden bg-sunk">
          {s.cover ? (
            <SchoolPicture
              stem={s.cover.stem}
              width={s.cover.width}
              height={s.cover.height}
              alt={`Ảnh kỷ yếu tại ${s.name}`}
              sizes="(min-width: 1024px) 360px, (min-width: 420px) 50vw, 100vw"
              eager={eager}
              priority={priority}
              className="size-full object-cover"
            />
          ) : (
            <SchoolPlaceholder short={s.short} name={s.name} className="absolute inset-0" />
          )}
          {s.short && (
            <span className="absolute left-2 top-2 rounded-[7px] border border-line bg-surface/95 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-blue">
              {s.short}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="font-serif text-[17px] font-semibold leading-tight break-words">{s.name}</h3>
          <p className="text-[12.5px] text-ink-2">{statLine(s)}</p>
          <span className="mt-auto pt-1.5 text-[13.5px] font-medium text-blue group-hover:underline">
            Xem góc đẹp →
          </span>
        </div>
      </Link>
    </article>
  );
}

/** Card trường chưa có ảnh: không bấm vào được, chỉ có nút nhắn studio. */
function SoonCard({ s }: { s: PublicSchoolCard }) {
  return (
    <article className="flex items-center gap-3 rounded-card border border-dashed border-line-2 bg-surface p-3">
      <SchoolPlaceholder short={s.short} name={s.name} small className="size-16 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-[15.5px] font-semibold leading-tight break-words">{s.name}</h3>
        {s.city && <p className="text-[12.5px] text-ink-3">{s.city}</p>}
        <Link
          href={`/lien-he?truong=${encodeURIComponent(s.slug)}`}
          className="mt-1.5 inline-block text-[13px] font-medium text-blue underline-offset-2 hover:underline"
        >
          Nhắn studio hỏi trước
        </Link>
      </div>
    </article>
  );
}
