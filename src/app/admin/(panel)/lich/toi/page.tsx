import { redirect } from "next/navigation";
import { ScheduleMonth } from "@/components/admin/schedule-month";
import { db } from "@/lib/db";
import { canEditSchedule, requireAdmin } from "@/lib/admin-guard";
import { todayVN } from "@/lib/availability";
import { parseMonth } from "@/lib/schedule";
import { loadMonth } from "@/lib/schedule-queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Lịch của chính thợ đang đăng nhập. Id thợ lấy từ phiên, không từ URL,
 * nên thợ không có cách nào mở lịch người khác. Nhân sự studio không gắn
 * với thợ nào thì chuyển sang màn quản lý.
 */
export default async function MySchedulePage(props: { searchParams: SearchParams }) {
  const user = await requireAdmin({ allowPhotographer: true });
  if (!user.photographerId) redirect("/admin/lich");

  const photographer = await db.photographer.findUnique({
    where: { id: user.photographerId },
    select: { id: true, name: true, realName: true },
  });
  if (!photographer) redirect("/admin/login");

  const sp = await props.searchParams;
  const todayKey = todayVN();
  const { year, month } = parseMonth(typeof sp.thang === "string" ? sp.thang : undefined, todayKey);
  const cells = await loadMonth(photographer.id, year, month);

  return (
    <div className="max-w-[880px]">
      <ScheduleMonth
        key={`${photographer.id}-${year}-${month}`}
        photographerId={photographer.id}
        title={`Chào ${photographer.name}`}
        subtitle="Bấm vào từng ngày để điền buổi sáng và buổi chiều. Chỉ bạn và quản lý thấy lịch này."
        year={year}
        month={month}
        cells={cells}
        editable={canEditSchedule(user, photographer.id)}
        todayKey={todayKey}
        basePath="/admin/lich/toi"
      />
    </div>
  );
}
