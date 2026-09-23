/**
 * Mọi con số hiển thị đều là tham khảo, thợ báo chính xác khi khách nhắn.
 * Giữ đúng tinh thần bản artifact cũ. Xem PLAN.md mục 4.
 */

export function money(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return n > 0 ? `${n.toLocaleString("vi-VN")}đ` : "Liên hệ";
}

export type ShootType = "FULL_DAY" | "HALF_DAY";

export type PriceableTier = {
  /** giá nửa ngày (một buổi) cho 1 người */
  basePrice: number;
  /** giá cả ngày cho 1 người, 0 là chưa có */
  fullDayPrice: number;
  groupPrices: { people: number; price: number }[];
};

export type PriceablePhotographer = {
  priceOverride: number;
  tier: PriceableTier;
};

/** Giá nửa ngày (một buổi) cho 1 người. Thợ có giá riêng thì ưu tiên giá riêng. */
export function priceOf(p: PriceablePhotographer): number {
  return p.priceOverride > 0 ? p.priceOverride : p.tier.basePrice;
}

/** Giá cả ngày cho 1 người, theo hạng. 0 nghĩa là chưa có, hiển thị "Thợ báo giá". */
export function fullDayPriceOf(p: PriceablePhotographer): number {
  return p.tier.fullDayPrice;
}

/**
 * Giá theo số người. 1 người dùng giá lẻ, từ 2 người tra bảng giá nhóm.
 * Trả 0 nghĩa là chưa có bảng giá cho mức đó, hiển thị "Thợ báo giá".
 */
export function groupPriceOf(p: PriceablePhotographer, people: number): number {
  if (people <= 1) return priceOf(p);
  return p.tier.groupPrices.find((g) => g.people === people)?.price ?? 0;
}

export type FeeRange = { min: number; max: number };

/** Nhân phụ phí theo số thợ. maxFee = 0 nghĩa là một mức cố định. */
export function travelFee(zone: FeeRange, photographers = 1): FeeRange {
  return {
    min: (Number(zone.min) || 0) * photographers,
    max: (Number(zone.max) || 0) * photographers,
  };
}

export function travelFeeText(zone: FeeRange, photographers = 1): string {
  const { min, max } = travelFee(zone, photographers);
  return max > min ? `${money(min)} - ${money(max)}` : money(min);
}

export type QuoteInput = {
  photographer: PriceablePhotographer | null;
  /** cả ngày hay nửa ngày; chỉ đổi giá khi chụp 1 người */
  shootType?: ShootType;
  people: number;
  zone: FeeRange | null;
  eveningAddon: boolean;
  eveningAddonFee: number;
};

export type Quote = {
  base: number;
  travelMin: number;
  travelMax: number;
  evening: number;
  totalMin: number;
  totalMax: number;
  /** false khi chưa đủ dữ kiện để ra con số, UI hiển thị "Thợ báo giá" */
  hasBase: boolean;
};

export function quote(input: QuoteInput): Quote {
  // Giá nhóm hiện chưa tách nửa ngày và cả ngày, nên cả ngày chỉ khác giá khi chụp 1 người.
  const base = !input.photographer
    ? 0
    : input.shootType === "FULL_DAY" && input.people <= 1
      ? fullDayPriceOf(input.photographer)
      : groupPriceOf(input.photographer, input.people);
  const travel = input.zone ? travelFee(input.zone, 1) : { min: 0, max: 0 };
  const evening = input.eveningAddon ? input.eveningAddonFee : 0;
  const travelMax = travel.max > travel.min ? travel.max : travel.min;

  return {
    base,
    travelMin: travel.min,
    travelMax,
    evening,
    totalMin: base + travel.min + evening,
    totalMax: base + travelMax + evening,
    hasBase: base > 0,
  };
}

/** "2.500.000đ" hoặc "2.500.000đ - 2.800.000đ" */
export function rangeText(min: number, max: number): string {
  return max > min ? `${money(min)} - ${money(max)}` : money(min);
}
