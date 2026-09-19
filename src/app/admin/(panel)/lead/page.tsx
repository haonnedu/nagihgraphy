import { SubmitButton, inputClass } from "@/components/admin/form-bits";
import { db } from "@/lib/db";
import { requireAdmin, canEdit } from "@/lib/admin-guard";
import { formatDateVN } from "@/lib/availability";
import { money } from "@/lib/pricing";
import { updateLeadStatus } from "./actions";
import type { LeadStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  QUOTED: "Đã báo giá",
  DEPOSITED: "Đã cọc",
  CONFIRMED: "Đã chốt lịch",
  DONE: "Đã chụp",
  LOST: "Mất khách",
};

const CHANNEL_LABEL: Record<string, string> = {
  ZALO: "Zalo",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Messenger",
  PHONE: "Gọi",
  SMS: "SMS",
  FORM: "Nút sao chép",
  MANUAL: "Nhập tay",
};

export default async function LeadsPage(props: PageProps<"/admin/lead">) {
  const user = await requireAdmin();
  const editable = canEdit(user.role);
  const sp = await props.searchParams;
  const filter: LeadStatus | "" =
    typeof sp.status === "string" && sp.status in STATUS_LABEL ? (sp.status as LeadStatus) : "";
  const where: Prisma.LeadWhereInput = filter ? { status: filter } : {};

  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      photographer: { select: { name: true } },
      travelZone: { select: { name: true } },
    },
  });

  const counts = await db.lead.groupBy({ by: ["status"], _count: { _all: true } });
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div className="max-w-[1080px]">
      <h1 className="font-serif text-[26px] font-semibold leading-tight">Khách để lại thông tin</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Khách đã nhắn thẳng cho thợ rồi, đây chỉ là bản ghi để theo dõi. Có thể ghi chú và đổi trạng thái.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5 text-[12.5px]">
        <a href="/admin/lead" className={`rounded-full border px-3 py-1 ${!filter ? "border-blue bg-blue text-white" : "border-line-2 bg-surface"}`}>
          Tất cả {leads.length >= 200 ? "200+" : counts.reduce((s, c) => s + c._count._all, 0)}
        </a>
        {Object.entries(STATUS_LABEL).map(([k, label]) => (
          <a
            key={k}
            href={`/admin/lead?status=${k}`}
            className={`rounded-full border px-3 py-1 ${filter === k ? "border-blue bg-blue text-white" : "border-line-2 bg-surface"}`}
          >
            {label} {countOf(k)}
          </a>
        ))}
      </div>

      {leads.length === 0 ? (
        <p className="mt-5 rounded-card border border-dashed border-line-2 px-4 py-8 text-center text-ink-2">
          Chưa có khách nào để lại thông tin{filter ? " ở trạng thái này" : ""}.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2.5">
          {leads.map((l) => (
            <li key={l.id} className="rounded-card border border-line bg-surface p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {l.customerName}{" "}
                    <a href={`tel:${l.phone}`} className="font-normal text-blue">
                      {l.phone}
                    </a>
                    <span className="ml-2 rounded-md bg-sunk px-1.5 py-0.5 text-[11px] font-medium text-ink-2">{l.code}</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-2">
                    {l.photographer?.name ?? "chưa chọn thợ"} · {l.shootType === "FULL_DAY" ? "cả ngày" : "nửa ngày"}
                    {l.eveningAddon && " + tối"} · {l.people} người
                    {l.shootDate && ` · ${formatDateVN(l.shootDate.toISOString().slice(0, 10))}`}
                    {l.travelZone && ` · ${l.travelZone.name}`}
                    {l.placeDetail && ` · ${l.placeDetail}`}
                  </p>
                  {l.concept && <p className="mt-0.5 text-[12.5px] text-ink-2">Concept: {l.concept}</p>}
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    Tạm tính lúc đó từ {money(l.quotedTotal)} · qua {CHANNEL_LABEL[l.channel] ?? l.channel} ·{" "}
                    {l.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                  </p>
                  {l.internalNote && <p className="mt-1 text-[12.5px] text-ink">Ghi chú: {l.internalNote}</p>}
                </div>
                <span className="rounded-full border border-line-2 px-2.5 py-1 text-[12px] font-medium">
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
              </div>

              {editable && (
                <form action={updateLeadStatus} className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                  <input type="hidden" name="id" value={l.id} />
                  <select name="status" defaultValue={l.status} className={inputClass}>
                    {Object.entries(STATUS_LABEL).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input name="note" placeholder="Ghi chú nội bộ (tuỳ chọn)" maxLength={500} className={inputClass} />
                  <SubmitButton tone="ghost">Cập nhật</SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
