import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { todayVN } from "@/lib/availability";
import { countMonth, parseMonth, STATUS_SHORT, weekdayVN, WEEKDAY_SHORT, type SlotValue } from "@/lib/schedule";
import { loadMonthAll } from "@/lib/schedule-queries";

export const dynamic = "force-dynamic";

/** Màu ô Excel theo trạng thái, cùng tông với web. */
const FILL: Record<string, string> = {
  FREE: "FF9FDCB6",
  NAGIH: "FF9CC8EF",
  EXTERNAL: "FFFFB894",
  BUSY: "FFB9C4CF",
};

/**
 * Xuất lịch cả tháng ra Excel: mỗi thợ một hàng, mỗi ngày hai cột S và C,
 * cuối hàng là tổng theo trạng thái và ghi chú các ngày có ghi chú.
 * Chỉ nhân sự studio tải được; thợ không có quyền.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "PHOTOGRAPHER") {
    return new NextResponse("Không có quyền", { status: 403 });
  }

  const url = new URL(req.url);
  const { year, month } = parseMonth(url.searchParams.get("thang") ?? undefined, todayVN());
  const tier = url.searchParams.get("ekip") || undefined;
  const { photographers, cells, keys } = await loadMonthAll(year, month, { tier });

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAGIH GRAPHY";
  const ws = wb.addWorksheet(`Thang ${month}-${year}`, { views: [{ state: "frozen", xSplit: 3, ySplit: 2 }] });

  // Hàng 1: ngày, gộp hai cột S và C. Hàng 2: S / C.
  const header1: (string | number)[] = ["Photo", "Tên thật", "Hạng"];
  const header2: string[] = ["", "", ""];
  for (const k of keys) {
    header1.push(`${WEEKDAY_SHORT[weekdayVN(k)]} ${Number(k.slice(8, 10))}`, "");
    header2.push("S", "C");
  }
  header1.push("Rảnh", "NAGIH", "Ngoài", "Bận", "Chưa điền", "Ghi chú");
  header2.push("", "", "", "", "", "");
  ws.addRow(header1);
  ws.addRow(header2);
  for (let i = 0; i < keys.length; i++) {
    const col = 4 + i * 2;
    ws.mergeCells(1, col, 1, col + 1);
  }
  ws.getRow(1).font = { bold: true };
  ws.getRow(2).font = { bold: true, color: { argb: "FF7E8C9A" } };
  ws.getRow(1).alignment = { horizontal: "center" };
  ws.getRow(2).alignment = { horizontal: "center" };

  const label = (v: SlotValue) => (v ? STATUS_SHORT[v] : "");

  for (const ph of photographers) {
    const m = cells.get(ph.id) ?? {};
    const c = countMonth(m, keys);
    const notes = keys
      .filter((k) => m[k]?.note)
      .map((k) => `${Number(k.slice(8, 10))}: ${m[k].note}`)
      .join("; ");
    const row: (string | number)[] = [ph.name, ph.realName, ph.tierName];
    for (const k of keys) row.push(label(m[k]?.morning ?? null), label(m[k]?.afternoon ?? null));
    row.push(c.free, c.nagih, c.external, c.busy, c.unfilled, notes);
    const r = ws.addRow(row);
    keys.forEach((k, i) => {
      for (const [j, v] of [m[k]?.morning ?? null, m[k]?.afternoon ?? null].entries()) {
        if (!v) continue;
        const cell = r.getCell(4 + i * 2 + j);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL[v] } };
      }
    });
  }

  ws.getColumn(1).width = 16;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 10;
  for (let i = 0; i < keys.length * 2; i++) ws.getColumn(4 + i).width = 7;
  ws.getColumn(4 + keys.length * 2 + 5).width = 40;

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="lich-tho-${year}-${String(month).padStart(2, "0")}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
