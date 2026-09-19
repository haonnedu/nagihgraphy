"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/admin-guard";
import { revalidatePath } from "next/cache";

const STATUSES = ["NEW", "CONTACTED", "QUOTED", "DEPOSITED", "CONFIRMED", "DONE", "LOST"] as const;

const schema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUSES),
  note: z.string().trim().max(500).default(""),
});

/** Đổi trạng thái một lead, ghi lại ai đổi và ghi chú vào LeadEvent. */
export async function updateLeadStatus(formData: FormData): Promise<void> {
  const user = await requireEditor();
  const parsed = schema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    note: formData.get("note"),
  });
  if (!parsed.success) return;
  const { id, status, note } = parsed.data;

  const lead = await db.lead.findUnique({ where: { id }, select: { status: true, internalNote: true } });
  if (!lead) return;

  await db.$transaction([
    db.lead.update({
      where: { id },
      data: { status, internalNote: note || lead.internalNote },
    }),
    db.leadEvent.create({
      data: { leadId: id, fromStatus: lead.status, toStatus: status, actorId: user.id, note },
    }),
  ]);
  revalidatePath("/admin/lead");
  revalidatePath("/admin");
}
