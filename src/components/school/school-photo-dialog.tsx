"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { photoSrc } from "@/lib/image-paths";
import { money } from "@/lib/pricing";
import { KIND_LABEL, schoolPhotoAlt } from "@/lib/school-shared";
import type { PublicSchoolDetail, PublicSchoolPhoto, PublicSchoolPhotographer } from "@/lib/school-queries";
import { SoftTag, StickerLink } from "@/components/ui";
import { SchoolPicture } from "@/components/school/school-picture";
import { sendSchoolStat } from "@/components/school/stat-beacon";

type Props = {
  /** ảnh đang mở, null là đóng */
  photo: PublicSchoolPhoto | null;
  photos: PublicSchoolPhoto[];
  photographers: PublicSchoolDetail["photographers"];
  school: { slug: string; name: string };
  onClose: () => void;
};

/**
 * Popup ảnh (màn hình 3): máy tính là hộp giữa màn hình, điện thoại là sheet
 * trượt từ dưới lên. Thứ tự nội dung theo đúng docs/chon-truong.md.
 *
 * Chỉ đóng khi bấm X, phím Esc, hoặc bấm đúng nền tối: cả lúc nhấn xuống và
 * lúc thả ra đều phải trên nền. Bôi đen chữ trong popup rồi thả chuột ra ngoài
 * thì trình duyệt bắn click lên nền (phần tử cha chung), nên phải nhớ lúc nhấn
 * xuống nằm ở đâu, không thì popup tự đóng như lỗi bản web cũ.
 */
export function SchoolPhotoDialog({ photo, ...rest }: Props) {
  return <AnimatePresence>{photo && <DialogFrame key="school-photo" photo={photo} {...rest} />}</AnimatePresence>;
}

const MOBILE_QUERY = "(max-width: 639px)";

function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function DialogFrame({ photo, photos, photographers, school, onClose }: Props & { photo: PublicSchoolPhoto }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const downOnBackdrop = useRef(false);
  const reduced = useReducedMotion();
  const mobile = useIsMobile();

  // Khoá cuộn trang, đưa focus vào popup, Esc để đóng; đóng thì trả focus về chỗ cũ.
  // onClose đổi mỗi lần render cha, giữ bản mới nhất trong ref để effect chỉ chạy một lần.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const prevPadding = html.style.paddingRight;
    // Bù chỗ thanh cuộn biến mất để trang phía sau không giật ngang.
    const gap = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (gap > 0) html.style.paddingRight = `${gap}px`;
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      html.style.paddingRight = prevPadding;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  /** Giữ phím Tab quanh quẩn trong popup. */
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !panelRef.current) return;
    const nodes = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const duration = reduced ? 0 : 0.24;
  // Mở thẳng bằng ?anh= trên điện thoại: lúc hydrate useIsMobile còn trả false nên
  // panel khởi đầu theo kiểu desktop (mờ, thu nhỏ). Bản mobile phải tự đưa opacity
  // và scale về 1, không thì popup kẹt ở trạng thái vô hình.
  const panelMotion = mobile
    ? { initial: { y: "100%" }, animate: { y: 0, opacity: 1, scale: 1 }, exit: { y: "100%" } }
    : { initial: { opacity: 0, scale: 0.97, y: 10 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 10 } };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration }}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        const ok = downOnBackdrop.current && e.target === e.currentTarget;
        downOnBackdrop.current = false;
        if (ok) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapTab}
        initial={panelMotion.initial}
        animate={panelMotion.animate}
        exit={panelMotion.exit}
        transition={{ duration, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[18px] bg-surface shadow-card sm:max-h-[90vh] sm:max-w-[720px] sm:rounded-card"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-2.5 top-2.5 z-10 grid size-9 place-items-center rounded-full bg-surface/90 text-xl leading-none text-ink shadow-card hover:bg-surface"
        >
          ×
        </button>
        <div className="overflow-y-auto overscroll-contain">
          <DialogBody
            key={photo.id}
            photo={photo}
            photos={photos}
            photographers={photographers}
            school={school}
            titleId={titleId}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function DialogBody({
  photo,
  photos,
  photographers,
  school,
  titleId,
}: Omit<Props, "onClose" | "photo"> & { photo: PublicSchoolPhoto; titleId: string }) {
  const [othersOpen, setOthersOpen] = useState(false);
  const by = photographers[photo.photographerSlug] ?? null;

  // Photo khác từng chụp đúng góc này, mỗi người một dòng, kèm một ảnh của họ ở góc đó
  // để lượt bấm Đặt được tính cho đúng người.
  const others: { p: PublicSchoolPhotographer; photoId: string }[] = [];
  const seen = new Set([photo.photographerSlug]);
  for (const x of photos) {
    if (x.angle.id !== photo.angle.id || seen.has(x.photographerSlug)) continue;
    seen.add(x.photographerSlug);
    const p = photographers[x.photographerSlug];
    if (p) others.push({ p, photoId: x.id });
  }

  const bookHref = (slug: string) =>
    `/lien-he?${new URLSearchParams({ tho: slug, truong: school.slug, goc: photo.angle.id }).toString()}`;

  return (
    <>
      <div className="bg-ink">
        <SchoolPicture
          stem={photo.stem}
          width={photo.width}
          height={photo.height}
          alt={schoolPhotoAlt(photo.angle.name, school.name)}
          sizes="(min-width: 640px) 720px, 100vw"
          priority
          className="mx-auto block h-auto max-h-[62dvh] w-auto max-w-full object-contain"
        />
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          <SoftTag accent="blue">{photo.angle.name}</SoftTag>
          <SoftTag accent="orange">{photo.year}</SoftTag>
          <SoftTag accent="green">{KIND_LABEL[photo.kind]}</SoftTag>
        </div>

        <div>
          <h2 id={titleId} className="font-serif text-[clamp(19px,4.4vw,23px)] font-semibold leading-tight">
            {school.name}
          </h2>
          {photo.note && (
            <p className="mt-2 rounded-xl bg-sunk px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-2">
              <b className="font-semibold text-ink">Ghi chú của Photo:</b> {photo.note}
            </p>
          )}
        </div>

        {by && (
          <div className="rounded-card border border-line p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Photo đã chụp góc này
            </p>
            <PhotographerRow p={by} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <StickerLink href={`/tho/${by.slug}`} tone="paper">
                Xem Photo
              </StickerLink>
              <StickerLink
                href={bookHref(by.slug)}
                tone="orange"
                onClick={() => sendSchoolStat(photo.id, "book")}
              >
                Đặt
              </StickerLink>
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setOthersOpen((v) => !v)}
              aria-expanded={othersOpen}
              className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-line-2 bg-surface px-3.5 py-2.5 text-left text-[13.5px] font-medium hover:border-blue"
            >
              Photo khác cũng chụp góc này ({others.length})
              <span aria-hidden className={othersOpen ? "rotate-180 transition-transform" : "transition-transform"}>
                ▾
              </span>
            </button>
            {othersOpen && (
              <ul className="mt-2 grid gap-2">
                {others.map(({ p, photoId }) => (
                  <li key={p.slug} className="flex flex-wrap items-center gap-2.5 rounded-card border border-line p-2.5">
                    <div className="min-w-0 flex-1">
                      <PhotographerRow p={p} small />
                    </div>
                    <div className="flex gap-1.5">
                      <StickerLink href={`/tho/${p.slug}`} tone="paper" size="sm">
                        Xem Photo
                      </StickerLink>
                      <StickerLink
                        href={bookHref(p.slug)}
                        tone="orange"
                        size="sm"
                        onClick={() => sendSchoolStat(photoId, "book")}
                      >
                        Đặt
                      </StickerLink>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/** Avatar, tên, hạng ekip và giá khởi điểm của một Photo. */
function PhotographerRow({ p, small = false }: { p: PublicSchoolPhotographer; small?: boolean }) {
  const size = small ? "size-10" : "size-12";
  return (
    <div className="flex min-w-0 items-center gap-3">
      {p.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh đã resize sẵn lúc upload, xem src/lib/images.ts
        <img
          src={photoSrc(p.avatar, 400)}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          decoding="async"
          className={`${size} shrink-0 rounded-full bg-sunk object-cover`}
        />
      ) : (
        <span
          className={`${size} grid shrink-0 place-items-center rounded-full bg-blue-soft font-serif text-lg font-semibold text-blue`}
        >
          {p.name.charAt(0)}
        </span>
      )}
      <span className="min-w-0">
        <b className={`block truncate font-semibold ${small ? "text-[14px]" : "text-[15.5px]"}`}>{p.name}</b>
        <span className="block truncate text-[12.5px] text-ink-2">
          {[p.tierName, p.priceFrom > 0 ? `từ ${money(p.priceFrom)}` : "Nhắn để hỏi giá"].filter(Boolean).join(" · ")}
        </span>
      </span>
    </div>
  );
}
