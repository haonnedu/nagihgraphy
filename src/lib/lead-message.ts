import { formatDateVN } from "@/lib/availability";
import { money, quote, rangeText, travelFeeText, type PriceablePhotographer } from "@/lib/pricing";

/**
 * Soạn tin nhắn cho khách chép và dán vào Zalo. Thuần hàm, không import
 * server, để form bên client và API bên server cùng dùng một logic.
 * Giữ đúng dạng của bản artifact cũ, thêm dòng cả ngày/nửa ngày và tên, SĐT.
 */

export type FormPhotographer = PriceablePhotographer & {
  slug: string;
  name: string;
  tierName: string;
};

export type FormZone = {
  slug: string;
  name: string;
  minFee: number;
  maxFee: number;
  note: string;
};

export type LeadDraft = {
  photographer: FormPhotographer | null;
  shootType: "FULL_DAY" | "HALF_DAY";
  shootDate: string;
  people: number;
  zone: FormZone | null;
  placeDetail: string;
  concept: string;
  eveningAddon: boolean;
  customerName: string;
  phone: string;
};

export function buildLeadMessage(
  draft: LeadDraft,
  opts: { studioName: string; eveningAddonFee: number },
): string {
  const { photographer: p, zone } = draft;
  const q = quote({
    photographer: p,
    shootType: draft.shootType,
    people: draft.people,
    zone: zone ? { min: zone.minFee, max: zone.maxFee } : null,
    eveningAddon: draft.eveningAddon,
    eveningAddonFee: opts.eveningAddonFee,
  });

  const lines = [`Chào ${opts.studioName}, mình muốn đặt lịch chụp.`];

  lines.push(`- Thợ: ${p ? `${p.name}${p.tierName ? ` (${p.tierName})` : ""}` : "nhờ studio gợi ý"}`);

  const shoot = draft.shootType === "FULL_DAY" ? "cả ngày" : "nửa ngày";
  const evening = draft.eveningAddon ? ` + thêm buổi tối đến 20h (+${money(opts.eveningAddonFee)})` : "";
  lines.push(`- Chụp: ${shoot}${evening}`);

  const pkg = draft.people > 1 ? "gói nhóm" : "gói lẻ";
  const priceNote = p
    ? q.hasBase
      ? ` - giá ${draft.people > 1 ? "" : "từ "}${money(q.base)}`
      : " - nhờ báo giá nhóm"
    : "";
  lines.push(`- Số người chụp: ${draft.people} người (${pkg})${priceNote}`);

  lines.push(`- Ngày chụp dự kiến: ${formatDateVN(draft.shootDate) || "chưa chốt"}`);

  lines.push(
    `- Nơi chụp: ${
      zone
        ? `${zone.name} (phụ phí di chuyển tham khảo ${travelFeeText({ min: zone.minFee, max: zone.maxFee })}/thợ)`
        : "chưa chọn"
    }`,
  );
  if (draft.placeDetail) lines.push(`- Địa điểm cụ thể: ${draft.placeDetail}`);

  if (q.hasBase && (zone || draft.eveningAddon)) {
    lines.push(`- Tạm tính tham khảo: từ ${rangeText(q.totalMin, q.totalMax)}`);
  }

  lines.push(`- Concept mong muốn: ${draft.concept || ""}`);

  if (draft.customerName || draft.phone) {
    lines.push(`- Liên hệ: ${[draft.customerName, draft.phone].filter(Boolean).join(" - ")}`);
  }

  return lines.join("\n");
}
