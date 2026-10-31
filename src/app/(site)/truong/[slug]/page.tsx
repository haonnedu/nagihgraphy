import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SchoolGallery } from "@/components/school/school-gallery";
import { absoluteUrl } from "@/lib/site-url";
import { StickerLink } from "@/components/ui";
import { photoSrc } from "@/lib/image-paths";
import { getSchoolPublic } from "@/lib/school-queries";
import { schoolPhotoAlt } from "@/lib/school-shared";

// Render động mỗi request, không prerender lúc build vì CI không có database.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/** generateMetadata và trang cùng gọi, cache để chỉ truy vấn một lần mỗi request. */
const loadSchool = cache(async (slug: string) => {
  if (!slug || slug.length > 120) return null;
  return getSchoolPublic(slug);
});

/** Số ảnh đưa vào JSON-LD, đủ cho Google hiểu trang, không làm HTML phình. */
const JSON_LD_PHOTOS = 24;

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { slug } = await props.params;
  const s = await loadSchool(slug);
  if (!s) return { title: "Không tìm thấy trường" };

  const description =
    s.stats.photos > 0
      ? `${s.stats.photos} ảnh kỷ yếu thật chụp tại ${s.name}${s.city ? `, ${s.city}` : ""}: ${s.stats.angles} góc đẹp, ${s.stats.photographers} Photo NAGIH đã chụp tại trường. Xem góc, bảng giá và đặt lịch Photo.`
      : `NAGIH GRAPHY nhận chụp kỷ yếu tại ${s.name}${s.city ? `, ${s.city}` : ""}. Ảnh thật tại trường đang được gom để đưa lên, nhắn studio để xem trước.`;
  const title = `Chụp kỷ yếu ${s.name} — ảnh thật, bảng giá và Photo đã chụp tại trường | NAGIH GRAPHY`;

  return {
    // absolute: tiêu đề đã có tên studio, không để template của layout thêm lần nữa.
    title: { absolute: title },
    description,
    alternates: { canonical: `/truong/${s.slug}` },
    openGraph: {
      title,
      description,
      url: `/truong/${s.slug}`,
      images: s.cover ? [{ url: photoSrc(s.cover.stem, 1600) }] : undefined,
    },
  };
}

/** JSON để nhúng vào <script>: chặn chuỗi "</script>" trong dữ liệu. */
function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Màn hình 2 (trang một trường) và popup ảnh (màn hình 3), xem docs/chon-truong.md. */
export default async function SchoolPage(props: Params) {
  const { slug } = await props.params;
  const s = await loadSchool(slug);
  if (!s) notFound();

  const bookAsk = `/lien-he?truong=${encodeURIComponent(s.slug)}`;

  const ld =
    s.photos.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Ảnh kỷ yếu tại ${s.name}`,
          itemListElement: s.photos.slice(0, JSON_LD_PHOTOS).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "ImageObject",
              contentUrl: absoluteUrl(photoSrc(p.stem, 1600)),
              thumbnailUrl: absoluteUrl(photoSrc(p.stem, 400)),
              caption: schoolPhotoAlt(p.angle.name, s.name),
              width: p.width,
              height: p.height,
              creditText: s.photographers[p.photographerSlug]?.name,
            },
          })),
        }
      : null;

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-14">
      <nav className="py-3 text-[12.5px] text-ink-3">
        <Link href="/truong" className="hover:text-blue">
          Chọn trường
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink-2">{s.name}</span>
      </nav>

      <header className="pb-1">
        {s.city && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange">{s.city}</p>
        )}
        <h1 className="mt-1 font-serif text-[clamp(26px,6vw,38px)] font-semibold leading-tight tracking-tight text-blue text-balance">
          {s.name}
        </h1>
        {s.intro && <p className="mt-2 max-w-[68ch] whitespace-pre-line text-ink-2 text-pretty">{s.intro}</p>}
        {s.photos.length > 0 && (
          <p className="mt-2.5 text-[13px] text-ink-3">
            <b className="font-semibold text-ink">{s.stats.photos}</b> ảnh ·{" "}
            <b className="font-semibold text-ink">{s.stats.angles}</b> góc ·{" "}
            <b className="font-semibold text-ink">{s.stats.photographers}</b> Photo
          </p>
        )}
      </header>

      {s.photos.length > 0 ? (
        <SchoolGallery
          school={{ slug: s.slug, name: s.name }}
          photos={s.photos}
          photographers={s.photographers}
          angles={s.angles}
          years={s.years}
          kinds={s.kinds}
        />
      ) : (
        <div className="mt-5 rounded-card border border-dashed border-line-2 bg-surface px-4 py-8 text-center">
          <p className="mx-auto max-w-[52ch] text-ink-2">
            NAGIH vẫn chụp ở {s.name}, ảnh thật tại trường đang gom để đưa lên web. Muốn xem trước ảnh đã
            chụp ở đây thì nhắn studio nhé.
          </p>
          <StickerLink href={bookAsk} tone="orange" className="mt-4">
            Nhắn studio hỏi trước
          </StickerLink>
        </div>
      )}

      <p className="mt-6 border-t border-line pt-4 text-[12.5px] leading-relaxed text-ink-3">
        Ảnh đăng khi khách trong ảnh đã đồng ý. Muốn gỡ ảnh của bạn,{" "}
        <Link href="/lien-he" className="text-blue underline underline-offset-2">
          nhắn NAGIH
        </Link>
        , bọn mình gỡ trong ngày.
      </p>

      {ld && (
        <script
          type="application/ld+json"
          // Dữ liệu tự sinh từ database, đã chặn "<" ở jsonLd().
          dangerouslySetInnerHTML={{ __html: jsonLd(ld) }}
        />
      )}
    </main>
  );
}
