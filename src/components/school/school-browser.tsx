"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
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
            <section className="grid grid-cols-2 gap-3 pb-6 pt-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {liveShown.map((s, i) => (
                <LiveCard key={s.id} s={s} index={i} eager={i < 4} priority={i === 0} />
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
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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

/** Mỗi ảnh trên card đứng 1 giây rồi chuyển sang ảnh kế tiếp của trường. */
const SLIDE_MS = 1000;

/** eager: hàng đầu trên máy tính (4 cột); priority chỉ card đầu, ảnh LCP trên điện thoại. */
function LiveCard({
  s,
  index,
  eager,
  priority,
}: {
  s: PublicSchoolCard;
  index: number;
  eager: boolean;
  priority: boolean;
}) {
  return (
    <article className="group relative overflow-hidden rounded-card border border-line bg-surface transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <Link href={`/truong/${s.slug}`} className="flex h-full flex-col text-inherit no-underline">
        <div className="relative aspect-3/4 overflow-hidden bg-sunk">
          {s.slides.length > 0 ? (
            <CardSlides
              slides={s.slides}
              alt={`Ảnh kỷ yếu tại ${s.name}`}
              eager={eager}
              priority={priority}
              // lệch nhịp giữa các card để cả lưới không đổi ảnh cùng một lúc
              offset={(index * 170) % SLIDE_MS}
            />
          ) : (
            <SchoolPlaceholder short={s.short} name={s.name} className="absolute inset-0" />
          )}
          {s.short && (
            <span className="absolute left-2 top-2 z-10 rounded-[7px] border border-line bg-surface/95 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-blue">
              {s.short}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
          <h3 className="font-serif text-[15px] font-semibold leading-tight break-words sm:text-[17px]">{s.name}</h3>
          <p className="text-[12px] text-ink-2 sm:text-[12.5px]">{statLine(s)}</p>
          <span className="mt-auto pt-1.5 text-[13px] font-medium text-blue group-hover:underline sm:text-[13.5px]">
            Xem góc đẹp →
          </span>
        </div>
      </Link>
    </article>
  );
}

/**
 * Ảnh card tự chạy vòng qua hết ảnh của trường. Chỉ chạy khi card đang nằm
 * trong màn hình và tab đang mở; ảnh kế tiếp được gắn vào trước một nhịp để
 * kịp tải, ảnh chưa tới lượt thì chưa tải, đỡ tốn 4G. Ảnh kế tiếp chưa tải
 * xong thì đứng chờ ở ảnh hiện tại, không chuyển sang khung trống. Tắt hẳn khi
 * người dùng chọn giảm chuyển động.
 */
function CardSlides({
  slides,
  alt,
  eager,
  priority,
  offset,
}: {
  slides: PublicSchoolCard["slides"];
  alt: string;
  eager: boolean;
  priority: boolean;
  offset: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  // reached: chỉ số ảnh xa nhất đã gắn vào trang, để ảnh đã tải không bị gỡ ra
  const [state, setState] = useState({ current: 0, reached: 0 });
  const count = slides.length;
  const cycling = count > 1 && !reduced;
  // ảnh đầu do server render sẵn, coi như đã tải; các ảnh sau ghi vào khi onLoad
  const loadedRef = useRef(new Set<number>([0]));

  useEffect(() => {
    const box = boxRef.current;
    if (!cycling || !box) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(box);
    return () => io.disconnect();
  }, [cycling]);

  useEffect(() => {
    if (!cycling || !visible) return;
    let timer = 0;
    const start = window.setTimeout(() => {
      setState((s) => ({ ...s, reached: Math.max(s.reached, Math.min(s.current + 1, count - 1)) }));
      timer = window.setInterval(() => {
        if (document.hidden) return;
        setState((s) => {
          const next = (s.current + 1) % count;
          if (!loadedRef.current.has(next)) return s;
          return { current: next, reached: Math.max(s.reached, Math.min(next + 1, count - 1)) };
        });
      }, SLIDE_MS);
    }, offset);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [cycling, visible, count, offset]);

  return (
    <div ref={boxRef} className="absolute inset-0">
      {slides.slice(0, state.reached + 1).map((p, i) => (
        <div
          key={p.stem}
          aria-hidden={i === 0 ? undefined : true}
          className={`absolute inset-0 transition-opacity duration-500 ${i === state.current ? "opacity-100" : "opacity-0"}`}
        >
          <SchoolPicture
            stem={p.stem}
            width={p.width}
            height={p.height}
            alt={i === 0 ? alt : ""}
            sizes="(min-width: 1024px) 270px, (min-width: 640px) 33vw, 50vw"
            eager={i > 0 || eager}
            priority={i === 0 && priority}
            className="size-full object-cover"
            onLoad={() => loadedRef.current.add(i)}
          />
        </div>
      ))}
    </div>
  );
}

/** Card trường chưa có ảnh: không bấm vào được, chỉ có nút nhắn studio. */
function SoonCard({ s }: { s: PublicSchoolCard }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-dashed border-line-2 bg-surface">
      <SchoolPlaceholder short={s.short} name={s.name} className="aspect-4/3" />
      <div className="flex flex-1 flex-col gap-0.5 p-2.5 sm:p-3">
        <h3 className="font-serif text-[15px] font-semibold leading-tight break-words sm:text-[15.5px]">{s.name}</h3>
        {s.city && <p className="text-[12px] text-ink-3 sm:text-[12.5px]">{s.city} · đang gom ảnh</p>}
        <Link
          href={`/lien-he?truong=${encodeURIComponent(s.slug)}`}
          className="mt-auto pt-1.5 text-[13px] font-medium text-blue underline-offset-2 hover:underline"
        >
          Nhắn studio hỏi trước
        </Link>
      </div>
    </article>
  );
}
