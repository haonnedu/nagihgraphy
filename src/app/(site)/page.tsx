import Link from "next/link";
import { PhotographerCard } from "@/components/photographer-card";
import { CountUp } from "@/components/motion/count-up";
import { DrawLine } from "@/components/motion/draw-line";
import { HeroParallax } from "@/components/motion/hero-parallax";
import { Marquee } from "@/components/motion/marquee";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { listPhotographers, getPricingTables } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/pricing";

/**
 * Landing có scroll storytelling, dựng trên palette gốc của studio.
 * Kịch bản từng section xem PLAN.md mục 5.
 * Mọi hiệu ứng tắt sạch dưới prefers-reduced-motion.
 */
// Render động: trang đọc database mỗi request. Không dùng ISR vì Next sẽ
// prerender lúc build, mà lúc build trong CI không có database nào.
// Truy vấn chỉ vài mili giây, đủ nhanh cho lưu lượng của studio.
export const dynamic = "force-dynamic";

/** "Chọn thợ *cá nhân theo vibe*" -> phần trong dấu sao dùng font script. */
function Headline({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*([^*]+)\*/);
  return (
    <h1 className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-script text-[1.22em] leading-none">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </h1>
  );
}

export default async function HomePage() {
  const [{ photographers, total, minPrice }, settings, { zones }] = await Promise.all([
    listPhotographers({ sort: "featured" }),
    getSettings(),
    getPricingTables(),
  ]);

  const featured = photographers.slice(0, 4);
  const totalSessions = photographers.reduce((sum, p) => sum + p.sessions, 0);
  // Ảnh hero do admin chọn trong /admin/hero; chưa chọn thì lấy ảnh portfolio đầu tiên.
  const firstPortfolio = photographers.flatMap((p) => p.photos)[0] ?? null;
  const heroPhoto = settings.hero.stem
    ? { path: settings.hero.stem, alt: settings.hero.alt }
    : firstPortfolio
      ? { path: firstPortfolio.path, alt: "" }
      : null;

  const stats = [
    { value: String(total), label: "thợ đang nhận lịch" },
    { value: totalSessions.toLocaleString("vi-VN"), label: "buổi đã chụp" },
    { value: minPrice > 0 ? money(minPrice) : "Liên hệ", label: "giá khởi điểm" },
  ];

  const heroInner = (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col justify-end px-4 pb-12 pt-24 sm:pb-16 sm:pt-32">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
        {settings.studio.kicker}
      </p>
      <Headline
        text={settings.studio.headline}
        className="mt-3 max-w-[16ch] font-serif text-[clamp(32px,7vw,58px)] font-semibold leading-[1.05] text-white text-balance"
      />
      <p className="mt-4 max-w-[48ch] text-[16px] leading-relaxed text-white/85">
        {settings.studio.intro}
      </p>
      <div className="mt-7 flex flex-wrap gap-2.5">
        <Link
          href="/tho"
          className="rounded-[10px] border border-cta bg-cta px-5 py-3 font-medium text-white transition-colors hover:border-cta-hover hover:bg-cta-hover"
        >
          Xem {total} thợ
        </Link>
        <Link
          href="/bang-gia"
          className="rounded-[10px] border border-white/60 bg-white/10 px-5 py-3 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          Bảng giá và phụ phí tỉnh
        </Link>
      </div>
    </div>
  );

  return (
    <main className="flex-1">
      {/* --- 1. hero ảnh tràn màn, ảnh trôi parallax --- */}
      {heroPhoto ? (
        <section className="min-h-[72vh]">
          <HeroParallax path={heroPhoto.path} alt={heroPhoto.alt}>
            <div className="flex min-h-[72vh] items-end">{heroInner}</div>
          </HeroParallax>
        </section>
      ) : (
        <section className="bg-sunk">{heroInner}</section>
      )}

      {/* --- 2. số liệu đếm lên --- */}
      <section className="mx-auto w-full max-w-[1120px] px-4 py-10">
        {/* Điện thoại: hai ô đầu cạnh nhau, ô giá chiếm trọn hàng dưới vì
            "2.200.000đ" không nhét vừa một phần ba màn 375px. Từ sm là ba cột. */}
        <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" stagger={0.09}>
          {stats.map((s, i) => (
            <RevealItem key={s.label} className={i === 2 ? "col-span-2 sm:col-span-1" : ""}>
              <div className="min-w-0 rounded-card border border-line bg-surface px-3 py-4 text-center sm:px-4">
                <b className="block font-serif text-[clamp(20px,4.6vw,30px)] font-semibold leading-none text-ink">
                  <CountUp value={s.value} />
                </b>
                <span className="mt-1.5 block text-[11.5px] text-ink-3">{s.label}</span>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* --- 3. thợ nổi bật, hiện lần lượt --- */}
      {featured.length > 0 && (
        <section className="mx-auto w-full max-w-[1120px] px-4 py-12">
          <Reveal>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-serif text-[clamp(22px,4.5vw,32px)] font-semibold leading-tight text-blue">
                Thợ nổi bật
              </h2>
              <Link
                href="/tho"
                className="text-[13.5px] text-ink-2 underline-offset-2 hover:text-blue hover:underline"
              >
                Xem tất cả →
              </Link>
            </div>
          </Reveal>
          <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {featured.map((p, i) => (
              <RevealItem key={p.id}>
                <PhotographerCard p={p} index={i} />
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
      )}

      {/* --- 4. tỉnh đã đi, chạy ngang vô tận --- */}
      {zones.length > 0 && (
        <section className="border-y border-line bg-sunk py-11">
          <div className="mx-auto w-full max-w-[1120px] px-4">
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                Đi tỉnh
              </p>
              <h2 className="mt-1.5 font-serif text-[clamp(22px,4.5vw,32px)] font-semibold leading-tight text-blue">
                Nhận chụp ở {zones.length} địa điểm
              </h2>
              <p className="mt-2 max-w-[52ch] text-ink-2">
                Book theo nhóm để chia phụ phí di chuyển cho nhẹ.
              </p>
            </Reveal>
          </div>

          <div className="mt-5 grid gap-2.5">
            <Marquee speed={46}>
              {zones.slice(0, Math.ceil(zones.length / 2)).map((z) => (
                <ZoneChip key={z.id} name={z.name} />
              ))}
            </Marquee>
            <Marquee speed={52} reverse>
              {zones.slice(Math.ceil(zones.length / 2)).map((z) => (
                <ZoneChip key={z.id} name={z.name} />
              ))}
            </Marquee>
          </div>

          <div className="mx-auto mt-6 w-full max-w-[1120px] px-4">
            <Link
              href="/bang-gia#phu-phi"
              className="inline-block rounded-[10px] border border-line-2 bg-surface px-4 py-2.5 text-[13.5px] font-medium hover:border-ink-3"
            >
              Xem bảng phụ phí
            </Link>
          </div>
        </section>
      )}

      {/* --- 5. quy trình, có đường kẻ vẽ dần nối các bước --- */}
      {settings.booking.steps.length > 0 && (
        <section className="mx-auto w-full max-w-[1120px] px-4 py-12">
          <Reveal>
            <h2 className="font-serif text-[clamp(22px,4.5vw,32px)] font-semibold leading-tight text-blue">
              Giữ lịch trong {settings.booking.steps.length} bước
            </h2>
            <p className="mt-1.5 max-w-[52ch] text-ink-2">{settings.booking.lead}</p>
          </Reveal>

          <div className="relative mt-7">
            <DrawLine className="inset-x-[12%] top-[22px] hidden h-1 lg:block" />
            <RevealGroup
              className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              stagger={0.12}
            >
              {settings.booking.steps.map((s, i) => (
                <RevealItem key={s.title}>
                  <div className="h-full rounded-card border border-line bg-surface p-3.5">
                    <span className="grid size-7 place-items-center rounded-full bg-blue text-[13px] font-semibold text-white">
                      {i + 1}
                    </span>
                    <b className="mt-2.5 block font-semibold">{s.title}</b>
                    <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-2">
                      {s.text}
                    </span>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}

      {/* --- 6. chốt --- */}
      <section className="mx-auto w-full max-w-[1120px] px-4 pb-14">
        <Reveal>
          <div className="rounded-card border border-line bg-blue-soft px-6 py-10 text-center">
            <h2 className="font-serif text-[clamp(24px,5vw,36px)] font-semibold leading-tight text-blue-deep text-balance">
              Chốt thợ, chốt ngày, xong.
            </h2>
            <p className="mx-auto mt-2.5 max-w-[46ch] text-ink-2">
              Chọn thợ hợp gu, nhắn thẳng cho thợ ngày bạn muốn và số người, thợ báo giá chính xác
              và giữ lịch cho bạn.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Link
                href="/lien-he"
                className="rounded-[10px] border border-cta bg-cta px-5 py-3 font-medium text-white hover:bg-cta-hover"
              >
                Nhắn studio ngay
              </Link>
              <Link
                href="/tho"
                className="rounded-[10px] border border-line-2 bg-surface px-5 py-3 font-medium hover:border-ink-3"
              >
                Xem thợ trước đã
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}

function ZoneChip({ name }: { name: string }) {
  return (
    <span className="shrink-0 rounded-full border border-line-2 bg-surface px-4 py-1.5 text-[13.5px] font-medium text-ink-2">
      {name}
    </span>
  );
}
