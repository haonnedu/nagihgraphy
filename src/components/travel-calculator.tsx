"use client";

import { useState } from "react";
import { money, travelFeeText } from "@/lib/pricing";

export type Zone = {
  id: string;
  slug: string;
  name: string;
  minFee: number;
  maxFee: number;
  note: string;
};

/**
 * Máy tính phụ phí di chuyển, giữ nguyên ý tưởng từ bản artifact cũ.
 * Mọi con số đều là tham khảo, thợ báo chính xác khi khách nhắn.
 */
export function TravelCalculator({ zones }: { zones: Zone[] }) {
  const [zoneSlug, setZoneSlug] = useState("");
  const [count, setCount] = useState(1);

  const zone = zones.find((z) => z.slug === zoneSlug) ?? null;
  const fee = zone ? { min: zone.minFee, max: zone.maxFee } : null;

  return (
    <div className="grid gap-3 rounded-card border border-line bg-surface p-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-ink-2">Nơi chụp</span>
          <select
            value={zoneSlug}
            onChange={(e) => setZoneSlug(e.target.value)}
            className="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-sm"
          >
            <option value="">Chọn nơi chụp…</option>
            {zones.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.name} · {travelFeeText({ min: z.minFee, max: z.maxFee })}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-ink-2">Số thợ</span>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-sm"
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n} thợ
              </option>
            ))}
          </select>
        </label>
      </div>

      {fee ? (
        <div className="grid gap-0.5 rounded-xl bg-blue-soft px-3.5 py-3">
          <span className="text-[12.5px] text-ink-2">Phụ phí di chuyển tham khảo</span>
          <b className="font-serif text-[21px] font-semibold tabular-nums text-blue-deep">
            {travelFeeText(fee, count)}
          </b>
          {zone?.note && <small className="text-[12.5px] text-ink-2">{zone.note}</small>}
        </div>
      ) : (
        <p className="text-[13px] text-ink-3">Chọn nơi chụp để xem phụ phí.</p>
      )}
    </div>
  );
}

export function formatFee(min: number, max: number): string {
  return max > min ? `${money(min)} - ${money(max)}` : money(min);
}
