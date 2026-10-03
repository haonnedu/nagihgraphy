import Link from "next/link";
import { Legend } from "@/components/admin/schedule-month";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { formatDateVN, todayVN } from "@/lib/availability";
import {
  countMonth,
  DAY_GROUP_LABEL,
  dayGroup,
  hasNote,
  monthParam,
  noteText,
  parseMonth,
  shiftMonth,
  slotClass,
  STATUS_SHORT,
  weekdayVN,
  WEEKDAY_SHORT,
  type DayCell,
  type DayGroup,
} from "@/lib/schedule";
import { loadDayAll, loadMonthAll, photographersMissingNextWeek } from "@/lib/schedule-queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Màn quản lý lịch ekip, bám bản mẫu của khách. Hai tab: theo ngày và cả tháng.
 * Bộ lọc nằm trên URL nên chia sẻ link giữ nguyên kết quả. Vai thợ bị chặn
 * từ requireAdmin. Xem PLAN.md mục 11.
 */

type Params = { tab: "ngay" | "thang"; date: string; thang: string; ekip: string; q: string };

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function href(p: Params, patch: Partial<Params>): string {
  const next = { ...p, ...patch };
  const qs = new URLSearchParams();
  qs.set("tab", next.tab);
  if (next.tab === "ngay") qs.set("date", next.date);
  else qs.set("thang", next.thang);
  if (next.ekip) qs.set("ekip", next.ekip);
  if (next.q) qs.set("q", next.q);
  return `/admin/lich?${qs.toString()}`;
}

export default async function ScheduleAdminPage(props: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await props.searchParams;
  const todayKey = todayVN();
  const dateRaw = str(sp.date);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : todayKey;
  const { year, month } = parseMonth(str(sp.thang) || undefined, todayKey);
  const p: Params = {
    tab: str(sp.tab) === "thang" ? "thang" : "ngay",
    date,
    thang: monthParam(year, month),
    ekip: str(sp.ekip),
    q: str(sp.q).slice(0, 60),
  };
  const filter = { tier: p.ekip || undefined, q: p.q || undefined };

  const [tiers, missing] = await Promise.all([
    db.tier.findMany({
      where: { photographers: { some: { published: true } } },
      orderBy: { order: "asc" },
      select: { slug: true, name: true },
    }),
    photographersMissingNextWeek(),
  ]);

  return (
    <div className="max-w-[1100px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold leading-tight">Quản lý lịch ekip</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">Xem ai còn trống trong ngày, hoặc lưới cả tháng. Bấm tên Photo để sửa hộ.</p>
        </div>
        {p.tab === "thang" && <MonthNav p={p} year={year} month={month} />}
      </div>

      {missing.length > 0 && (
        <p className="mt-4 rounded-xl border border-extra-line bg-extra-bg px-3.5 py-2.5 text-[13px] text-extra-ink">
          <b className="font-semibold">{missing.length} Photo chưa điền đủ lịch 7 ngày tới:</b>{" "}
          {missing
            .slice(0, 12)
            .map((m) => `${m.name} (${m.missing} buổi)`)
            .join(", ")}
          {missing.length > 12 && ` và ${missing.length - 12} Photo khác`}. Nhắc họ vào điền.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Tab active={p.tab === "ngay"} href={href(p, { tab: "ngay" })}>
          Theo ngày
        </Tab>
        <Tab active={p.tab === "thang"} href={href(p, { tab: "thang" })}>
          Cả tháng
        </Tab>
      </div>

      <form method="get" action="/admin/lich" className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="tab" value={p.tab} />
        {p.tab === "ngay" ? <input type="hidden" name="date" value={p.date} /> : <input type="hidden" name="thang" value={p.thang} />}
        {p.ekip && <input type="hidden" name="ekip" value={p.ekip} />}
        <input
          type="search"
          name="q"
          defaultValue={p.q}
          placeholder="Tìm tên Photo…"
          className="min-w-[200px] flex-1 rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-sm placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-3 focus:ring-blue-soft"
        />
        <button type="submit" className="rounded-[10px] border border-line-2 bg-surface px-3.5 py-2 text-[13.5px] font-medium hover:border-blue hover:text-blue">
          Tìm
        </button>
      </form>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Pill active={!p.ekip} href={href(p, { ekip: "" })}>
          Tất cả ekip
        </Pill>
        {tiers.map((t) => (
          <Pill key={t.slug} active={p.ekip === t.slug} href={href(p, { ekip: t.slug })}>
            {t.name}
          </Pill>
        ))}
      </div>

      {p.tab === "ngay" ? <DayTab p={p} filter={filter} todayKey={todayKey} /> : <MonthTab p={p} filter={filter} year={year} month={month} todayKey={todayKey} />}
    </div>
  );
}

// ---------------------------------------------------------------- tab theo ngày

async function DayTab({ p, filter, todayKey }: { p: Params; filter: { tier?: string; q?: string }; todayKey: string }) {
  const { photographers, cells } = await loadDayAll(p.date, filter);
  const groups: Record<DayGroup, typeof photographers> = { FULL: [], MORNING: [], AFTERNOON: [], NONE: [] };
  for (const ph of photographers) groups[dayGroup(cells.get(ph.id))].push(ph);
  const half = groups.MORNING.length + groups.AFTERNOON.length;
  const { year, month } = parseMonth(p.date.slice(0, 7), todayKey);

  return (
    <div className="mt-4">
      <form method="get" action="/admin/lich" className="rounded-card border border-line bg-surface p-3.5">
        <input type="hidden" name="tab" value="ngay" />
        {p.ekip && <input type="hidden" name="ekip" value={p.ekip} />}
        {p.q && <input type="hidden" name="q" value={p.q} />}
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-ink-2">Ngày cần tìm Photo</span>
            <input
              type="date"
              name="date"
              defaultValue={p.date}
              className="rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-3 focus:ring-blue-soft"
            />
          </label>
          <button type="submit" className="rounded-[10px] border border-blue bg-blue px-3.5 py-2 text-[13.5px] font-medium text-white hover:bg-blue-deep">
            Xem
          </button>
          {p.date !== todayKey && (
            <Link href={href(p, { date: todayKey })} className="text-[13px] text-ink-2 underline underline-offset-2 hover:text-blue">
              Hôm nay
            </Link>
          )}
          <p className="ml-auto text-[13.5px] text-ink-2">
            {formatDateVN(p.date)} · <b className="font-semibold text-blue">{groups.FULL.length}</b> Photo trống cả ngày ·{" "}
            <b className="font-semibold text-blue">{half}</b> trống nửa ngày
          </p>
        </div>
      </form>

      <Legend />

      {(["FULL", "MORNING", "AFTERNOON", "NONE"] as DayGroup[]).map((g) => (
        <section key={g} className="mt-5">
          <h2 className="flex items-center gap-2 font-serif text-[17px] font-semibold">
            {DAY_GROUP_LABEL[g]}
            <span className="rounded-full bg-sunk px-2 py-0.5 text-[12px] font-medium text-ink-2">{groups[g].length}</span>
          </h2>
          {groups[g].length === 0 ? (
            <p className="mt-1.5 text-[13px] text-ink-3">Không có ai.</p>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {groups[g].map((ph) => {
                const c = cells.get(ph.id);
                return (
                  <li key={ph.id}>
                    <Link
                      href={`/admin/lich/tho/${ph.id}?thang=${monthParam(year, month)}`}
                      className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-3.5 py-3 hover:border-blue"
                    >
                      <span className="min-w-0">
                        <b className="block truncate font-serif text-[15px] font-semibold">{ph.name}</b>
                        <span className="block truncate text-[12.5px] text-ink-3">
                          {ph.realName ? `${ph.realName} · ` : ""}
                          {ph.tierName}
                        </span>
                        {hasNote(c) && <span className="mt-0.5 block truncate text-[12.5px] text-ink-2">{noteText(c)}</span>}
                      </span>
                      <span className="flex shrink-0 gap-1.5">
                        <HalfBox label="S" value={c?.morning ?? null} />
                        <HalfBox label="C" value={c?.afternoon ?? null} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function HalfBox({ label, value }: { label: string; value: DayCell["morning"] }) {
  return (
    <span
      title={value ? STATUS_SHORT[value] : "Chưa điền"}
      className={`grid size-8 place-items-center rounded-lg border text-[12px] font-semibold text-ink-2 ${slotClass(value)}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------- tab cả tháng

async function MonthTab({
  p,
  filter,
  year,
  month,
  todayKey,
}: {
  p: Params;
  filter: { tier?: string; q?: string };
  year: number;
  month: number;
  todayKey: string;
}) {
  const { photographers, cells, keys } = await loadMonthAll(year, month, filter);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend />
        <a
          href={`/admin/lich/xuat?thang=${p.thang}${p.ekip ? `&ekip=${p.ekip}` : ""}`}
          className="rounded-[10px] border border-line-2 bg-surface px-3.5 py-2 text-[13.5px] font-medium hover:border-blue hover:text-blue"
        >
          Xuất Excel tháng {month}/{year}
        </a>
      </div>

      {photographers.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-3">Không có Photo nào khớp bộ lọc.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-semibold text-ink-2 shadow-[1px_0_0_0_var(--color-line)]">
                  Photo
                </th>
                {keys.map((k) => {
                  const wd = weekdayVN(k);
                  const isToday = k === todayKey;
                  return (
                    <th
                      key={k}
                      className={`px-1 py-1.5 text-center font-medium ${isToday ? "bg-blue-soft text-blue" : wd >= 5 ? "text-extra-ink" : "text-ink-3"}`}
                    >
                      <span className="block text-[10px]">{WEEKDAY_SHORT[wd]}</span>
                      <span className="block text-[12px] font-semibold text-ink">{Number(k.slice(8, 10))}</span>
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-right font-semibold text-in-ink">Rảnh</th>
                <th className="px-2 py-2 text-right font-semibold text-blue">NAGIH</th>
                <th className="px-2 py-2 text-right font-semibold text-extra-ink">Ngoài</th>
              </tr>
            </thead>
            <tbody>
              {photographers.map((ph) => {
                const m = cells.get(ph.id) ?? {};
                const c = countMonth(m, keys);
                return (
                  <tr key={ph.id} className="border-b border-line last:border-0">
                    <td className="sticky left-0 z-10 bg-surface px-3 py-1.5 shadow-[1px_0_0_0_var(--color-line)]">
                      <Link href={`/admin/lich/tho/${ph.id}?thang=${p.thang}`} className="block min-w-[96px] hover:text-blue">
                        <b className="block font-serif text-[13.5px] font-semibold leading-tight">{ph.name}</b>
                        <span className="block text-[11px] text-ink-3">{ph.tierName}</span>
                      </Link>
                    </td>
                    {keys.map((k) => {
                      const cell = m[k];
                      const isToday = k === todayKey;
                      return (
                        <td key={k} className={`px-0.5 py-1.5 align-middle ${isToday ? "bg-blue-soft/40" : ""}`}>
                          <span className="grid w-6 gap-0.5" title={noteText(cell) || undefined}>
                            <span className={`h-2 rounded-sm border ${slotClass(cell?.morning ?? null)}`} />
                            <span className={`h-2 rounded-sm border ${slotClass(cell?.afternoon ?? null)}`} />
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-in-ink">{c.free}</td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-blue">{c.nagih}</td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-extra-ink">{c.external}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MonthNav({ p, year, month }: { p: Params; year: number; month: number }) {
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={href(p, { thang: monthParam(prev.year, prev.month) })}
        aria-label="Tháng trước"
        className="grid size-9 place-items-center rounded-[10px] border border-line-2 bg-surface text-ink-2 hover:border-blue hover:text-blue"
      >
        ‹
      </Link>
      <span className="min-w-[128px] text-center font-serif text-[17px] font-semibold">
        Tháng {month}/{year}
      </span>
      <Link
        href={href(p, { thang: monthParam(next.year, next.month) })}
        aria-label="Tháng sau"
        className="grid size-9 place-items-center rounded-[10px] border border-line-2 bg-surface text-ink-2 hover:border-blue hover:text-blue"
      >
        ›
      </Link>
    </div>
  );
}

function Tab({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-4 py-2 text-[13.5px] font-medium ${
        active ? "border-blue bg-blue text-white" : "border-line-2 bg-surface text-ink hover:border-blue hover:text-blue"
      }`}
    >
      {children}
    </Link>
  );
}

function Pill({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium ${
        active ? "border-blue bg-blue text-white" : "border-line-2 bg-surface text-ink-2 hover:border-blue hover:text-blue"
      }`}
    >
      {children}
    </Link>
  );
}
