import Link from "next/link";
import { PhotographerCard } from "@/components/photographer-card";
import { CountUp } from "@/components/motion/count-up";
import { DrawLine } from "@/components/motion/draw-line";
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

/** "Lớp mình đã chốt *ảnh kỷ yếu* chưa?" -> cụm trong hai dấu sao đổi sang màu nhấn. */
function Headline({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*([^*]+)\*/);
  return (
    <h1 className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-orange">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </h1>
  );
}

/** "chụp **trọn 1 ngày** cho cả lớp" -> cụm trong hai dấu sao kép in đậm. */
function Lead({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*\*([^*]+)\*\*/);
  return (
    <p className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-ink">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
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

  // Chữ hero do admin sửa trong /admin/hero; trường trống thì rơi về nội dung studio.
  const hero = settings.hero;
  const eyebrow = hero.eyebrow || settings.studio.kicker;
  const headline = hero.headline || settings.studio.headline;
  const lead = hero.lead || settings.studio.intro;
  const primaryLabel = hero.primaryLabel || `Xem ${total} thợ`;
  const secondaryLabel = hero.secondaryLabel || "Bảng giá và phụ phí tỉnh";
  // Viên số liệu: admin nhập tay; chưa nhập thì tự tính từ database.
  const stats =
    hero.stats.length > 0
      ? hero.stats
      : [
          { value: String(total), label: "thợ đang nhận lịch" },
          { value: totalSessions.toLocaleString("vi-VN"), label: "buổi đã chụp" },
          { value: minPrice > 0 ? money(minPrice) : "Liên hệ", label: "giá khởi điểm" },
        ];

  return (
    <main className="flex-1">
      {/* --- 1. hero chữ căn giữa trên nền trắng, chữ xanh và cam, số liệu thành viên tròn --- */}
      <section className="relative overflow-hidden bg-surface">
        {/* quầng xanh rất nhạt phía trên để nền trắng không phẳng lì */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(70%_60%_at_50%_0%,rgb(0_112_187/0.10),transparent_72%)]"
        />
        <div className="relative mx-auto flex w-full max-w-[900px] flex-col items-center px-4 pb-14 pt-16 text-center sm:pb-20 sm:pt-24">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange">{eyebrow}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <Headline
              text={headline}
              className="mt-4 font-serif text-[clamp(30px,6.4vw,56px)] font-semibold leading-[1.08] text-blue text-balance"
            />
          </Reveal>
          <Reveal delay={0.16}>
            <Lead
              text={lead}
              className="mt-5 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-2 text-pretty sm:text-[17px]"
            />
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              <Link
                href="/tho"
                className="rounded-[10px] border border-cta bg-cta px-5 py-3 font-medium text-white transition-colors hover:border-cta-hover hover:bg-cta-hover"
              >
                {primaryLabel}
              </Link>
              <Link
                href="/bang-gia"
                className="rounded-[10px] border border-blue bg-surface px-5 py-3 font-medium text-blue transition-colors hover:bg-blue-soft"
              >
                {secondaryLabel}
              </Link>
            </div>
          </Reveal>
          {stats.length > 0 && (
            <RevealGroup className="mt-9 flex flex-wrap justify-center gap-2" stagger={0.07}>
              {stats.map((s) => (
                <RevealItem key={`${s.value} ${s.label}`}>
                  <span className="inline-flex items-baseline gap-1.5 rounded-full border border-line bg-sunk px-4 py-2 text-[13.5px] text-ink-2">
                    <b className="font-semibold tabular-nums text-blue">
                      <CountUp value={s.value} />
                    </b>
                    {s.label}
                  </span>
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </div>
      </section>

      {/* --- 2. thợ nổi bật, hiện lần lượt --- */}
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

      {/* --- 3. tỉnh đã đi, chạy ngang vô tận --- */}
      {zones.length > 0 && (
        <section className="border-y border-line bg-sunk py-11">
          <div className="mx-auto w-full max-w-[1120px] px-4">
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                Đi tỉnh
              </p>
              <h2 className="mt-1.5 font-serif text-[clamp(22px,4.5vw,32px)] font-semibold leading-tight text-blue">
                Phụ phí di chuyển đi các tỉnh
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

      {/* --- 4. quy trình, có đường kẻ vẽ dần nối các bước --- */}
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

      {/* --- 5. chốt --- */}
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
