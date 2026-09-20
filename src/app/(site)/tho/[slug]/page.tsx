import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND_ICONS, type BrandKey } from "@/components/brand-icons";
import { FeatureMatrix } from "@/components/feature-matrix";
import { Photo, PhotoPlaceholder } from "@/components/photo";
import { dayStatus, dayStatusLabel, formatDateVN } from "@/lib/availability";
import { photoSrc } from "@/lib/image-paths";
import { money, priceOf } from "@/lib/pricing";
import { contactLinks, mergeContacts } from "@/lib/contacts";
import { getPhotographer } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

// Render động mỗi request. Không prerender lúc build vì CI không có database,
// và không dùng generateStaticParams vì nó cũng truy vấn database lúc build.
export const dynamic = "force-dynamic";


export async function generateMetadata(props: PageProps<"/tho/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getPhotographer(slug);
  if (!p) return { title: "Không tìm thấy thợ" };

  const price = priceOf(p);
  const description = [
    p.style,
    `${p.tier.name} tại ${p.city}`,
    price > 0 ? `giá từ ${money(price)} một buổi` : "liên hệ để báo giá",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${p.name} — thợ chụp ${p.city}`,
    description,
    alternates: { canonical: `/tho/${p.slug}` },
    openGraph: {
      title: `${p.name} · NAGIH GRAPHY`,
      description,
      images: p.photos[0] ? [{ url: photoSrc(p.photos[0].path, 1600) }] : undefined,
    },
  };
}

/** Link ngoài chỉ nhận https, chặn javascript: và http. */
function safeHttps(url: string): string {
  return /^https:\/\/[^\s"<>]+$/i.test(url) ? url : "";
}

export default async function PhotographerPage(props: PageProps<"/tho/[slug]">) {
  const { slug } = await props.params;
  const p = await getPhotographer(slug);
  if (!p) notFound();

  const settings = await getSettings();
  const price = priceOf(p);
  const today = dayStatus(p.todaySlots);
  const drive = safeHttps(p.driveUrl);
  // Không có sale: khách nhắn thẳng cho thợ. Thợ chưa có kênh riêng thì dùng kênh studio.
  // Chỉ các app nhắn tin, bỏ nút gọi theo ý khách. Instagram là nút chính to
  // nhất, các app còn lại thành nút nhỏ bên dưới.
  const apps = contactLinks(mergeContacts(p, settings.contacts)).filter((c) => c.key in BRAND_ICONS);
  const primary = apps.find((c) => c.key === "instagram") ?? apps[0];
  const secondary = apps.filter((c) => c !== primary);

  return (
    <main className="mx-auto w-full max-w-[820px] flex-1 px-4 pb-24">
      <nav className="py-3 text-[12.5px] text-ink-3">
        <Link href="/tho" className="hover:text-blue">
          Chọn thợ
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink-2">{p.name}</span>
      </nav>

      {p.photos.length > 0 ? (
        <>
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-card bg-sunk [scrollbar-width:none]">
            {p.photos.map((photo, i) => (
              <Photo
                key={photo.id}
                path={photo.path}
                alt={photo.alt || `Ảnh ${i + 1} của ${p.name}`}
                sizes="(min-width: 820px) 820px, 100vw"
                fallbackWidth={1600}
                priority={i === 0}
                className="aspect-4/5 w-full shrink-0 snap-center object-cover sm:aspect-4/3"
              />
            ))}
          </div>
          {p.photos.length > 1 && (
            <p className="mt-1.5 text-center text-[12px] text-ink-3">
              Vuốt ngang để xem {p.photos.length} ảnh
            </p>
          )}
        </>
      ) : (
        <PhotoPlaceholder name={p.name} className="aspect-4/3 w-full rounded-card" />
      )}

      {drive && (
        <a
          href={drive}
          target="_blank"
          rel="noopener nofollow"
          className="mt-3 block w-full rounded-[10px] border border-blue bg-blue px-4 py-3 text-center font-medium text-white hover:bg-blue-deep"
        >
          Xem album đầy đủ của {p.name} trên Google Drive ↗
        </a>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <h1 className="font-serif text-[26px] font-semibold leading-tight">{p.name}</h1>
        <span className="rounded-[7px] border border-blue-soft bg-blue-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-deep">
          {p.tier.name}
        </span>
        {p.isSample && (
          <span className="rounded-[7px] border border-line-2 bg-sunk px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Dữ liệu mẫu
          </span>
        )}
      </div>

      <p className="mt-2 text-[14.5px] text-ink-2">
        {p.city}
        {p.rating > 0 && (
          <>
            {" · ★ "}
            <b className="font-semibold text-ink">{p.rating.toFixed(1)}</b>
          </>
        )}
        {" · "}
        {p.sessions} buổi đã chụp
      </p>

      {p.style && <p className="mt-2.5 text-[15px] text-ink-2">{p.style}</p>}

      {p.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {p.tags.map((t) => (
            <li key={t.slug} className="rounded-md bg-sunk px-2 py-1 text-xs text-ink-2">
              {t.name}
            </li>
          ))}
        </ul>
      )}

      <section className="mt-5">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          Dịch vụ đi kèm
        </h2>
        <FeatureMatrix features={p.features} />
      </section>

      <section className="mt-5 rounded-card border border-line bg-surface p-3.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Lịch</h2>
        <p className={`mt-1.5 text-[15px] font-medium ${today === "NONE" ? "text-ink-2" : "text-avail"}`}>
          {today === "NONE"
            ? p.nextOpenDate
              ? `Trống gần nhất ngày ${formatDateVN(p.nextOpenDate)}`
              : "Chưa có lịch trống công bố"
            : `${dayStatusLabel(today)} hôm nay`}
        </p>
        <p className="mt-1 text-[13px] text-ink-3">
          Lịch trên web có thể chưa kịp cập nhật. Nhắn {p.name} để xác nhận chính xác.
        </p>
      </section>

      {primary && (
        <section className="mt-4 rounded-card border border-line bg-surface p-3.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Nhắn thẳng cho {p.name}
          </h2>
          <div className="mt-2.5 grid gap-2">
            <ContactButton link={primary} primary />
            {secondary.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {secondary.map((c) => (
                  <ContactButton key={c.key} link={c} />
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">
            Muốn có sẵn nội dung gồm ngày, số người và nơi chụp thì dùng nút soạn tin ở dưới.
          </p>
        </section>
      )}

      {p.tier.note && (
        <p className="mt-4 text-[13px] text-ink-2">
          <b className="font-semibold">{p.tier.name}:</b> {p.tier.note}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/97 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-3 px-4 py-3">
          <span className="text-xs text-ink-2">
            {price > 0 && "Từ "}
            <b className="block text-xl font-semibold tabular-nums text-ink">{money(price)}</b>
          </span>
          <Link
            href={`/lien-he?tho=${p.slug}`}
            className="rounded-[10px] border border-cta bg-cta px-4 py-3 font-medium text-white hover:bg-cta-hover"
          >
            Soạn tin nhắn cho {p.name}
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Nút mở app nhắn tin, có logo. Nút chính to, nền xanh; nút phụ viền mỏng. */
function ContactButton({ link, primary = false }: { link: { key: string; label: string; href: string }; primary?: boolean }) {
  const Icon = BRAND_ICONS[link.key as BrandKey];
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener"
      className={
        primary
          ? "flex items-center justify-center gap-2.5 rounded-[10px] border border-blue bg-blue px-4 py-3.5 text-[16px] font-semibold text-white hover:bg-blue-deep"
          : "flex items-center justify-center gap-2 rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink hover:border-blue hover:text-blue"
      }
    >
      <Icon size={primary ? 22 : 18} />
      {link.label}
    </a>
  );
}
