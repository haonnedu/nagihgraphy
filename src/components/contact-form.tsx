"use client";

import { useRef, useState } from "react";
import { todayVN } from "@/lib/availability";
import { BRAND_ICONS, type BrandKey } from "@/components/brand-icons";
import { contactLinks, mergeContacts, type ContactLink, type Contacts } from "@/lib/contacts";
import { buildLeadMessage, type FormPhotographer, type FormZone } from "@/lib/lead-message";
import { phoneSchema, type LeadInput } from "@/lib/lead-schema";
import { groupPriceOf, money, quote, rangeText, travelFeeText } from "@/lib/pricing";

type Props = {
  photographers: FormPhotographer[];
  zones: FormZone[];
  /** Liên hệ chung của studio, dùng khi thợ không có kênh riêng hoặc chưa chọn thợ. */
  studioContacts: Contacts;
  studioName: string;
  maxPeople: number;
  eveningAddonFee: number;
  initialPhotographer: string;
};

type Channel = LeadInput["channel"];

const CHANNEL_BY_KEY: Record<string, Channel> = {
  zalo: "ZALO",
  instagram: "INSTAGRAM",
  facebook: "FACEBOOK",
  phone: "PHONE",
  tiktok: "FORM",
};

/**
 * Form liên hệ theo đúng luồng bản artifact cũ: chọn xong là có sẵn tin
 * nhắn, bấm sao chép rồi tự dán vào Zalo. Bấm nút kênh nào thì tin nhắn
 * cũng được chép trước khi mở app.
 *
 * Không có sale: nút liên hệ trỏ thẳng tới kênh của thợ đang chọn, thợ
 * không có kênh riêng thì rơi về studio. Nếu khách điền tên và số điện
 * thoại thì lưu một lead để chủ studio xem trong admin, chạy nền, không
 * chặn việc mở app. Xem PLAN.md mục 6.
 */
export function ContactForm({
  photographers,
  zones,
  studioContacts,
  studioName,
  maxPeople,
  eveningAddonFee,
  initialPhotographer,
}: Props) {
  const [pick, setPick] = useState(initialPhotographer);
  const [shootType, setShootType] = useState<"FULL_DAY" | "HALF_DAY">("FULL_DAY");
  const [shootDate, setShootDate] = useState("");
  const [people, setPeople] = useState(1);
  const [zoneSlug, setZoneSlug] = useState("");
  const [placeDetail, setPlaceDetail] = useState("");
  const [concept, setConcept] = useState("");
  const [eveningAddon, setEveningAddon] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [toast, setToast] = useState("");
  const [copyLabel, setCopyLabel] = useState("Sao chép");
  const [savedCode, setSavedCode] = useState("");
  const savingRef = useRef(false);
  const messageRef = useRef<HTMLPreElement>(null);

  const photographer = photographers.find((p) => p.slug === pick) ?? null;
  const zone = zones.find((z) => z.slug === zoneSlug) ?? null;

  // Nút liên hệ đổi theo thợ đang chọn.
  const contacts = mergeContacts(photographer?.contacts, studioContacts);
  // Chỉ các app nhắn tin, không có nút gọi. Instagram là nút chính to nhất,
  // các app còn lại là nút nhỏ bên dưới; SMS có sẵn nội dung vẫn giữ cho điện thoại.
  const apps = contactLinks(contacts).filter((c) => c.key in BRAND_ICONS);
  const primaryApp = apps.find((c) => c.key === "instagram") ?? apps[0];
  const secondaryApps = apps.filter((c) => c !== primaryApp);
  const smsNumber = contacts.phone.replace(/[^\d+]/g, "");
  const recipient = photographer ? photographer.name : studioName;

  // Dựng chuỗi tin nhắn rất rẻ, không cần memo; React Compiler tự lo phần còn lại.
  const draft = {
      photographer,
      shootType,
      shootDate,
      people,
      zone,
      placeDetail,
      concept,
      eveningAddon,
      customerName: customerName.trim(),
      phone: phone.trim(),
  };

  const message = buildLeadMessage(draft, { studioName, eveningAddonFee });

  const q = quote({
    photographer,
    people,
    zone: zone ? { min: zone.minFee, max: zone.maxFee } : null,
    eveningAddon,
    eveningAddonFee,
  });
  const groupPrice = photographer ? groupPriceOf(photographer, people) : 0;

  const phoneOk = phoneSchema.safeParse(phone).success;
  const canSaveLead = customerName.trim().length > 0 && phoneOk;

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 3200);
  }

  async function copyMessage(silent: boolean) {
    const done = () => {
      setCopyLabel("Đã chép");
      window.setTimeout(() => setCopyLabel("Sao chép"), 1800);
      if (silent) showToast("Đã chép tin nhắn, dán vào khung chat nhé.");
    };
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        done();
        return;
      }
    } catch {
      // rơi xuống cách dự phòng
    }
    // Dự phòng cho trình duyệt cũ hoặc trang không phải https: bôi đen sẵn.
    const el = messageRef.current;
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      showToast("Đã bôi đen tin nhắn, bấm Sao chép trên máy để chép.");
    }
  }

  /** Lưu lead một lần cho mỗi lần mở trang. Chạy nền, không chặn mở app. */
  async function saveLead(channel: Channel) {
    if (!canSaveLead || savedCode || savingRef.current) return;
    savingRef.current = true;
    const payload: LeadInput = {
      customerName: customerName.trim(),
      phone: phone.trim(),
      zalo: "",
      email: "",
      photographerSlug: pick,
      shootType,
      shootDate,
      people,
      travelZoneSlug: zoneSlug,
      placeDetail: placeDetail.trim(),
      concept: concept.trim(),
      eveningAddon,
      channel,
      website,
    };
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      const json = (await res.json()) as { ok: boolean; code?: string; error?: string };
      if (json.ok && json.code) {
        setSavedCode(json.code);
      } else if (channel === "FORM") {
        showToast(json.error ?? "Chưa lưu được thông tin, bạn cứ nhắn thợ nhé.");
      }
    } catch {
      // mất mạng thì thôi, khách vẫn nhắn được
    } finally {
      savingRef.current = false;
    }
  }

  function onContactClick(link: ContactLink) {
    // Không chặn mặc định: để trình duyệt mở app như bình thường.
    if (link.href.startsWith("https:")) void copyMessage(true);
    void saveLead(CHANNEL_BY_KEY[link.key] ?? "FORM");
  }

  const smsHref = smsNumber ? `sms:${smsNumber}?body=${encodeURIComponent(message)}` : "";

  return (
    <div className="grid gap-4">
      <div className="relative grid gap-3.5 rounded-card border border-line bg-surface p-4">
        <Field label="Thợ muốn chụp">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputClass}>
            <option value="">Chưa chọn, nhắn studio</option>
            {photographers.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
                {p.tierName ? ` · ${p.tierName}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-ink-2">Chụp cả ngày hay nửa ngày</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["FULL_DAY", "Cả ngày"],
                ["HALF_DAY", "Nửa ngày"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setShootType(value)}
                aria-pressed={shootType === value}
                className={
                  shootType === value
                    ? "rounded-[10px] border border-blue bg-blue px-3 py-2.5 text-sm font-medium text-white"
                    : "rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-sm font-medium hover:border-blue"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-ink bg-surface px-4 pb-3 pt-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <b className="text-[14.5px] font-semibold">
              {people} người · {people > 1 ? "gói nhóm" : "gói lẻ"}
            </b>
            <strong className="text-xl font-semibold tabular-nums text-blue-deep">
              {!photographer ? "" : groupPrice > 0 ? `${people === 1 ? "từ " : ""}${money(groupPrice)}` : "Thợ báo giá"}
            </strong>
          </div>
          <input
            type="range"
            min={1}
            max={maxPeople}
            step={1}
            value={people}
            onChange={(e) => setPeople(Number(e.target.value))}
            aria-label="Số người chụp"
            className="mt-3 w-full accent-blue"
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-3">
            {Array.from({ length: maxPeople }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">
            Mặc định 1 người, giá gói lẻ. Kéo sang phải nếu chụp nhóm, tối đa {maxPeople} người.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ngày chụp dự kiến">
            <input
              type="date"
              value={shootDate}
              min={todayVN()}
              onChange={(e) => setShootDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Tỉnh / thành chụp">
            <select value={zoneSlug} onChange={(e) => setZoneSlug(e.target.value)} className={inputClass}>
              <option value="">Chọn nơi chụp…</option>
              {zones.map((z) => (
                <option key={z.slug} value={z.slug}>
                  {z.name} · {travelFeeText({ min: z.minFee, max: z.maxFee })}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Địa điểm cụ thể (trường, quận/huyện)">
          <input
            value={placeDetail}
            maxLength={120}
            onChange={(e) => setPlaceDetail(e.target.value)}
            placeholder="VD: ĐH Thương Mại, Cầu Giấy"
            autoComplete="off"
            className={inputClass}
          />
        </Field>

        <label className="inline-flex select-none items-center gap-2 text-[13.5px] text-ink-2">
          <input
            type="checkbox"
            checked={eveningAddon}
            onChange={(e) => setEveningAddon(e.target.checked)}
            className="size-4.5 accent-blue"
          />
          Chụp thêm buổi tối đến 20h (+{money(eveningAddonFee)})
        </label>

        <Field label="Concept mong muốn">
          <textarea
            value={concept}
            maxLength={500}
            rows={2}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="VD: tone pastel, chụp ở sân trường lúc chiều"
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>

        {(zone || eveningAddon) && q.hasBase && (
          <div className="grid gap-1.5 rounded-xl bg-blue-soft px-3.5 py-3 text-[13.5px]">
            <Row label="Giá thợ" value={`${people > 1 ? "" : "từ "}${money(q.base)}`} />
            {zone && (
              <Row label="Phụ phí di chuyển tham khảo (1 thợ)" value={rangeText(q.travelMin, q.travelMax)} />
            )}
            {eveningAddon && <Row label="Chụp thêm buổi tối" value={money(q.evening)} />}
            <div className="flex justify-between gap-3 border-t border-dashed border-line-2 pt-1.5">
              <span className="text-ink-2">Tạm tính tham khảo</span>
              <b className="tabular-nums text-blue-deep">từ {rangeText(q.totalMin, q.totalMax)}</b>
            </div>
            {zone?.note && <p className="text-[12.5px] text-ink-3">{zone.note}</p>}
          </div>
        )}

        <div className="grid gap-3 border-t border-line pt-3.5 sm:grid-cols-2">
          <Field label="Tên bạn" hint="Không bắt buộc, để thợ biết đang nói chuyện với ai">
            <input
              value={customerName}
              maxLength={80}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
              className={inputClass}
            />
          </Field>
          <Field
            label="Số điện thoại"
            hint={phone && !phoneOk ? "Số chưa đúng, VD 0961 120 879" : undefined}
            error={Boolean(phone) && !phoneOk}
          >
            <input
              value={phone}
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {/* honeypot: ẩn với người, bot hay điền bừa */}
        <div aria-hidden className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Tin nhắn gửi {recipient}
          </h2>
          <button
            type="button"
            onClick={() => {
              void copyMessage(false);
              void saveLead("FORM");
            }}
            className="rounded-lg border border-line-2 bg-surface px-3 py-1.5 text-[12.5px] font-medium hover:border-ink-3"
          >
            {copyLabel}
          </button>
        </div>
        <pre
          ref={messageRef}
          className="mt-2 whitespace-pre-wrap rounded-xl bg-sunk px-3.5 py-3 font-sans text-[13.5px] leading-relaxed text-ink"
        >
          {message}
        </pre>
        <p className="mt-2 text-[13px] text-ink-3">
          Bấm Zalo, Messenger hoặc Instagram bên dưới để nhắn thẳng cho {recipient}: tin nhắn được
          tự chép, bạn chỉ cần dán vào khung chat.
        </p>
      </div>

      <div className="grid gap-2">
        {primaryApp && <AppButton link={primaryApp} primary onClick={() => onContactClick(primaryApp)} />}
        {secondaryApps.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {secondaryApps.map((c) => (
              <AppButton key={c.key} link={c} onClick={() => onContactClick(c)} />
            ))}
          </div>
        )}
        {smsHref && (
          <a
            href={smsHref}
            onClick={() => void saveLead("SMS")}
            className="rounded-[10px] border border-cta bg-cta px-4 py-3 text-center font-medium text-white hover:bg-cta-hover sm:hidden"
          >
            Nhắn SMS, có sẵn nội dung
          </a>
        )}
      </div>

      {savedCode && (
        <p className="rounded-xl border border-in-line bg-in-bg px-3.5 py-2.5 text-[13.5px] text-in-ink">
          Đã lưu thông tin, mã của bạn là <b className="font-semibold">{savedCode}</b>. Nhắn thẳng
          cho {recipient} qua nút ở trên nhé.
        </p>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-[13.5px] text-white shadow-card"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-sm placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-3 focus:ring-blue-soft";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <small className={error ? "text-[11.5px] text-warn" : "text-[11.5px] text-ink-3"}>{hint}</small>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-2">{label}</span>
      <b className="tabular-nums">{value}</b>
    </div>
  );
}

/** Nút mở app nhắn tin, có logo. Nút chính to nền xanh, nút phụ viền mỏng. */
function AppButton({ link, primary = false, onClick }: { link: ContactLink; primary?: boolean; onClick: () => void }) {
  const Icon = BRAND_ICONS[link.key as BrandKey];
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener"
      onClick={onClick}
      className={
        primary
          ? "flex items-center justify-center gap-2.5 rounded-[10px] border border-blue bg-blue px-4 py-3.5 text-[16px] font-semibold text-white hover:bg-blue-deep"
          : "flex items-center justify-center gap-2 rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium hover:border-blue hover:text-blue"
      }
    >
      <Icon size={primary ? 22 : 18} />
      {link.label}
    </a>
  );
}
