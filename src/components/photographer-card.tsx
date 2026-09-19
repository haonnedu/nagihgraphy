import Link from "next/link";
import { Photo, PhotoPlaceholder } from "@/components/photo";
import { shortAvailabilityLabel } from "@/lib/availability";
import { money, priceOf } from "@/lib/pricing";
import type { Photographer } from "@/lib/queries";

export function PhotographerCard({
  p,
  index = 0,
  priority = false,
}: {
  p: Photographer;
  /** Giữ để trang truyền vào như cũ; bản này không xoay vòng màu theo thứ tự. */
  index?: number;
  priority?: boolean;
}) {
  void index;
  const cover = p.photos[0];
  const price = priceOf(p);
  const availability = shortAvailabilityLabel(p.todaySlots, p.nextOpenDate);
  const minis = p.features.filter((f) => f.shortLabel && f.status === "IN").slice(0, 3);

  return (
    <article className="group relative overflow-hidden rounded-card border border-line bg-surface transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <Link href={`/tho/${p.slug}`} className="flex h-full flex-col text-inherit no-underline">
        <div className="relative aspect-3/4 overflow-hidden bg-sunk">
          {cover ? (
            <Photo
              path={cover.path}
              alt={cover.alt || `Ảnh portfolio của ${p.name}`}
              className="size-full object-cover"
              priority={priority}
            />
          ) : (
            <PhotoPlaceholder name={p.name} className="absolute inset-0" />
          )}

          <span className="absolute left-2 top-2 rounded-[7px] border border-line bg-surface/95 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-blue">
            {p.tier.name}
          </span>
          {p.isSample && (
            <span className="absolute right-2 top-2 rounded-[7px] border border-orange bg-orange px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white">
              Mẫu
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <h3 className="font-serif text-[17px] font-semibold leading-tight break-words">
            {p.name}
          </h3>

          {minis.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {minis.map((f) => (
                <span
                  key={f.key}
                  className="rounded-md border border-in-line bg-in-bg px-1.5 py-0.5 text-[11px] text-in-ink"
                >
                  {f.shortLabel}
                </span>
              ))}
            </div>
          )}

          <p className="text-[12.5px] text-ink-2">
            {p.rating > 0 && (
              <>
                <span className="text-orange">★</span>{" "}
                <b className="font-semibold text-ink">{p.rating.toFixed(1)}</b>
                {" · "}
              </>
            )}
            <b className="font-semibold text-ink">{p.sessions}</b> buổi đã chụp
          </p>

          <div className="mt-auto grid gap-px border-t border-line pt-2">
            <span className="text-xs text-ink-2">
              {price > 0 && "Từ "}
              <b className="text-[17px] font-semibold tabular-nums text-ink">{money(price)}</b>
            </span>
            <span
              className={
                availability.open
                  ? "text-[12.5px] font-medium text-avail"
                  : "text-[12.5px] text-ink-3"
              }
            >
              {availability.text}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
