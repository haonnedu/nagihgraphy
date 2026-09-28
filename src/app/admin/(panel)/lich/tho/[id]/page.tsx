import Link from "next/link";
import { notFound } from "next/navigation";
import { ScheduleMonth } from "@/components/admin/schedule-month";
import { db } from "@/lib/db";
import { canEdit, requireAdmin } from "@/lib/admin-guard";
import { todayVN } from "@/lib/availability";
import { parseMonth } from "@/lib/schedule";
import { loadMonth } from "@/lib/schedule-queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Quản lý xem và sửa hộ lịch của một thợ. Vai thợ bị requireAdmin chặn từ đầu. */
export default async function PhotographerSchedulePage(props: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireAdmin();
  const { id } = await props.params;
  const photographer = await db.photographer.findUnique({
    where: { id },
    select: { id: true, name: true, realName: true, tier: { select: { name: true } } },
  });
  if (!photographer) notFound();

  const sp = await props.searchParams;
  const todayKey = todayVN();
  const { year, month } = parseMonth(typeof sp.thang === "string" ? sp.thang : undefined, todayKey);
  const cells = await loadMonth(photographer.id, year, month);
  const editable = canEdit(user.role);

  return (
    <div className="max-w-[880px]">
      <nav className="mb-3 text-[12.5px] text-ink-3">
        <Link href="/admin/lich" className="hover:text-blue">
          Lịch thợ
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink-2">{photographer.name}</span>
      </nav>
      <ScheduleMonth
        key={`${photographer.id}-${year}-${month}`}
        photographerId={photographer.id}
        title={photographer.name}
        subtitle={`${photographer.realName ? `${photographer.realName} · ` : ""}${photographer.tier.name}${
          editable ? " · bạn đang sửa hộ, mọi thay đổi có ghi tên bạn" : " · chỉ xem"
        }`}
        year={year}
        month={month}
        cells={cells}
        editable={editable}
        todayKey={todayKey}
        basePath={`/admin/lich/tho/${photographer.id}`}
      />
    </div>
  );
}
