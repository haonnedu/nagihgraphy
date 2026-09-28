"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { clearMonth, fillMonthFree, saveDay } from "@/app/admin/(panel)/lich/actions";
import {
  countMonth,
  monthKeys,
  monthParam,
  NOTE_MAX,
  shiftMonth,
  slotClass,
  STATUS_LABEL,
  STATUSES,
  weekdayVN,
  WEEKDAY_SHORT,
  type DayCell,
  type MonthCells,
  type SlotValue,
} from "@/lib/schedule";

/**
 * Lịch tháng của một thợ, bám bản mẫu của khách: mỗi ô ngày có hai vạch
 * sáng và chiều tô màu theo trạng thái, bấm ngày mở hộp chọn. Dùng cho cả
 * thợ tự điền và quản lý sửa hộ; quyền do server action kiểm tra lại.
 * Thiết kế cho điện thoại trước: ô nhỏ, hộp chọn trượt từ đáy màn.
 */

type Props = {
  photographerId: string;
  title: string;
  subtitle: string;
  year: number;
  month: number;
  cells: MonthCells;
  editable: boolean;
  todayKey: string;
  /** đường dẫn trang này, để dựng link chuyển tháng */
  basePath: string;
};

const EMPTY: DayCell = { morning: null, afternoon: null, note: "" };

export function ScheduleMonth({ photographerId, title, subtitle, year, month, cells: initial, editable, todayKey, basePath }: Props) {
  const router = useRouter();
  const [cells, setCells] = useState<MonthCells>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<DayCell>(EMPTY);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const keys = monthKeys(year, month);
  const counts = countMonth(cells, keys);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const lead = weekdayVN(keys[0]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  function open(key: string) {
    setDraft({ ...(cells[key] ?? EMPTY) });
    setError("");
    setSelected(key);
  }

  function save() {
    if (!selected) return;
    const key = selected;
    const value = { ...draft, note: draft.note.trim().slice(0, NOTE_MAX) };
    startTransition(async () => {
      const r = await saveDay({ photographerId, date: key, ...value });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCells((c) => ({ ...c, [key]: value }));
      setSelected(null);
      router.refresh();
    });
  }

  function fillFree() {
    startTransition(async () => {
      const r = await fillMonthFree(photographerId, year, month);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCells((c) => {
        const out = { ...c };
        for (const k of keys) {
          const cur = out[k] ?? EMPTY;
          out[k] = { ...cur, morning: cur.morning ?? "FREE", afternoon: cur.afternoon ?? "FREE" };
        }
        return out;
      });
      router.refresh();
    });
  }

  function clearAll() {
    if (!window.confirm(`Xoá toàn bộ lịch tháng ${month}/${year}? Mọi ngày về "chưa điền".`)) return;
    startTransition(async () => {
      const r = await clearMonth(photographerId, year, month);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCells({});
      router.refresh();
    });
  }

  const setBoth = (v: SlotValue) => setDraft((d) => ({ ...d, morning: v, afternoon: v }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold leading-tight">{title}</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`${basePath}?thang=${monthParam(prev.year, prev.month)}`}
            aria-label="Tháng trước"
            className="grid size-9 place-items-center rounded-[10px] border border-line-2 bg-surface text-ink-2 hover:border-blue hover:text-blue"
          >
            ‹
          </Link>
          <span className="min-w-[128px] text-center font-serif text-[17px] font-semibold">
            Tháng {month}/{year}
          </span>
          <Link
            href={`${basePath}?thang=${monthParam(next.year, next.month)}`}
            aria-label="Tháng sau"
            className="grid size-9 place-items-center rounded-[10px] border border-line-2 bg-surface text-ink-2 hover:border-blue hover:text-blue"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Counter label="Còn trống" value={counts.free} tone="text-in-ink" />
        <Counter label="Lịch NAGIH" value={counts.nagih} tone="text-blue" />
        <Counter label="Lịch ngoài" value={counts.external} tone="text-extra-ink" />
        <Counter label="Chưa điền" value={counts.unfilled} tone="text-ink-3" />
      </div>

      <Legend />

      <div className="mt-2 rounded-card border border-line bg-surface p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAY_SHORT.map((d) => (
            <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              {d}
            </div>
          ))}
          {Array.from({ length: lead }).map((_, i) => (
            <div key={`lead-${i}`} />
          ))}
          {keys.map((k) => {
            const c = cells[k];
            const isToday = k === todayKey;
            return (
              <button
                key={k}
                type="button"
                onClick={() => open(k)}
                aria-label={`Ngày ${Number(k.slice(8, 10))}`}
                className={`relative grid gap-1 rounded-[9px] border bg-surface px-1 pb-1.5 pt-1 text-left hover:border-blue ${
                  isToday ? "border-blue ring-2 ring-blue-soft" : "border-line"
                }`}
              >
                <span className="flex items-center justify-center text-[12px] font-medium text-ink-2">
                  {Number(k.slice(8, 10))}
                  {c?.note && <span aria-hidden className="absolute right-1 top-1 size-1.5 rounded-full bg-orange" />}
                </span>
                <span className={`h-2 rounded-sm border sm:h-2.5 ${slotClass(c?.morning ?? null)}`} title="Sáng" />
                <span className={`h-2 rounded-sm border sm:h-2.5 ${slotClass(c?.afternoon ?? null)}`} title="Chiều" />
              </button>
            );
          })}
        </div>
      </div>

      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
          <span>Điền nhanh cả tháng:</span>
          <button
            type="button"
            onClick={fillFree}
            disabled={pending}
            className="rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 font-medium text-ink hover:border-blue hover:text-blue disabled:opacity-60"
          >
            Mặc định Rảnh
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={pending}
            className="rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 font-medium text-ink hover:border-warn hover:text-warn disabled:opacity-60"
          >
            Xoá hết
          </button>
          <span className="text-ink-3">“Mặc định Rảnh” chỉ điền vào ô chưa điền, không đổi ô đã có.</span>
        </div>
      )}
      {error && !selected && (
        <p role="alert" className="mt-2 text-[13px] text-warn">
          {error}
        </p>
      )}

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-title"
          className="fixed inset-0 z-50 grid place-items-end bg-ink/50 sm:place-items-center sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-card sm:max-w-[440px] sm:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="day-title" className="font-serif text-[22px] font-semibold leading-tight">
                  {selected.slice(8, 10)}/{selected.slice(5, 7)}
                </h2>
                <p className="text-[12.5px] text-ink-3">
                  {title} · Tháng {month}/{year}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Đóng"
                className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-sunk hover:text-ink"
              >
                ×
              </button>
            </div>

            {editable ? (
              <>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip onClick={() => setBoth("FREE")}>Rảnh cả ngày</Chip>
                  <Chip onClick={() => setBoth("NAGIH")}>Lịch NAGIH cả ngày</Chip>
                  <Chip onClick={() => setBoth("BUSY")}>Bận cả ngày</Chip>
                </div>

                <HalfPicker label="Buổi sáng" value={draft.morning} onChange={(v) => setDraft((d) => ({ ...d, morning: v }))} />
                <HalfPicker label="Buổi chiều" value={draft.afternoon} onChange={(v) => setDraft((d) => ({ ...d, afternoon: v }))} />

                <label className="mt-4 grid gap-1">
                  <span className="text-xs font-medium text-ink-2">Ghi chú (tên group, địa điểm, giờ)</span>
                  <input
                    value={draft.note}
                    maxLength={NOTE_MAX}
                    onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                    placeholder="VD: NAGIH_FTU_HN_AN"
                    className="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-sm placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-3 focus:ring-blue-soft"
                  />
                  <small className="text-[11.5px] text-ink-3">
                    {draft.note.length}/{NOTE_MAX}
                  </small>
                </label>

                {error && (
                  <p role="alert" className="mt-2 text-[13px] text-warn">
                    {error}
                  </p>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={save}
                    disabled={pending}
                    className="rounded-[10px] border border-cta bg-cta px-5 py-2.5 font-medium text-white hover:bg-cta-hover disabled:opacity-60"
                  >
                    {pending ? "Đang lưu…" : "Xong"}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-3 grid gap-2 text-[14px]">
                <p>
                  Sáng: <b className="font-semibold">{draft.morning ? STATUS_LABEL[draft.morning] : "Chưa điền"}</b>
                </p>
                <p>
                  Chiều: <b className="font-semibold">{draft.afternoon ? STATUS_LABEL[draft.afternoon] : "Chưa điền"}</b>
                </p>
                {draft.note && <p className="text-ink-2">Ghi chú: {draft.note}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-card border border-line bg-surface px-3.5 py-3">
      <span className="block text-[12px] text-ink-3">{label}</span>
      <b className={`block font-serif text-[24px] font-semibold leading-tight tabular-nums ${tone}`}>{value}</b>
      <span className="text-[11.5px] text-ink-3">buổi</span>
    </div>
  );
}

export function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-ink-2">
      {STATUSES.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={`size-3 rounded-sm border ${slotClass(s)}`} />
          {STATUS_LABEL[s]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className={`size-3 rounded-sm border ${slotClass(null)}`} />
        Chưa điền
      </span>
    </div>
  );
}

function Chip({ children, onClick, active = false }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-[13px] font-medium ${
        active ? "border-blue bg-blue text-white" : "border-line-2 bg-surface text-ink hover:border-blue hover:text-blue"
      }`}
    >
      {children}
    </button>
  );
}

function HalfPicker({ label, value, onChange }: { label: string; value: SlotValue; onChange: (v: SlotValue) => void }) {
  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="mb-2 font-serif text-[15px] font-semibold">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <Chip key={s} active={value === s} onClick={() => onChange(s)}>
            {STATUS_LABEL[s]}
          </Chip>
        ))}
        <Chip active={value === null} onClick={() => onChange(null)}>
          Chưa điền
        </Chip>
      </div>
    </div>
  );
}
