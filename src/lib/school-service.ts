import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { GuardError, canManageSchools, canReview, type AdminUser } from "@/lib/admin-guard";
import { todayVN } from "@/lib/availability";
import {
  assertAcceptableUpload,
  deleteImage,
  moveImage,
  pendingDir,
  processImage,
  schoolDir,
  type ProcessedImage,
} from "@/lib/images";
import { revalidateSchools } from "@/lib/revalidate-public";
import { slugify } from "@/lib/slug";
import {
  ANGLE_NAME_MAX,
  LIVE_THRESHOLD,
  MAX_FILES_PER_SUBMIT,
  MAX_PENDING_PER_PHOTOGRAPHER,
  MIN_YEAR,
  NOTE_MAX,
  REJECT_REASON_MAX,
  REJECT_REASON_MIN,
  angleKey,
  normalizeAngleName,
  shareText,
} from "@/lib/school-shared";
import type { SchoolStatus, ShotKind } from "@/generated/prisma/enums";

/**
 * Mọi luật nghiệp vụ của Chọn trường nằm ở đây. Server action của giao diện
 * chỉ lấy user từ guard (requirePhotographer, requireReviewer, requireAdmin…)
 * rồi gọi hàm ở đây; hàm tự kiểm tra lại vai, không tin giao diện.
 * Xem docs/chon-truong.md.
 *
 * Lỗi cho người dùng đọc được ném ra bằng SchoolError (chữ tiếng Việt).
 * Server action bắt lỗi rồi trả { error: err.message } như các action khác.
 * Hằng số và hàm thuần (giới hạn, nhãn, so tên góc) nằm ở school-shared.ts.
 */

export class SchoolError extends Error {}

/**
 * Chữ lỗi cho server action của Chọn trường: chỉ đưa ra lỗi nghiệp vụ
 * (SchoolError) và lỗi phiên/quyền (GuardError). Lỗi khác (DB, sharp) chỉ ghi
 * log, người dùng thấy câu chung `fallback`, không thấy chữ tiếng Anh của Prisma.
 */
export function schoolActionError(err: unknown, fallback: string): string {
  if (err instanceof SchoolError || err instanceof GuardError) return err.message;
  console.error("[school] action lỗi", err);
  return fallback;
}

// ---------------------------------------------------------------- tiện ích

function fail(message: string): never {
  throw new SchoolError(message);
}

function assertPhotographer(user: AdminUser): string {
  if (user.role !== "PHOTOGRAPHER" || !user.photographerId) fail("Chỉ tài khoản Photo được nộp ảnh trường.");
  return user.photographerId;
}

function assertReviewer(user: AdminUser): void {
  if (!canReview(user.role)) fail("Tài khoản này không được duyệt ảnh trường.");
}

function assertSchoolManager(user: AdminUser): void {
  if (!canManageSchools(user.role)) fail("Chỉ chủ studio được thêm, sửa hoặc xoá trường.");
}

function maxYear(): number {
  return Number(todayVN().slice(0, 4)) + 1;
}

/** Làm mới các trang admin của tính năng, để số chờ duyệt và danh sách đổi ngay. */
function revalidateAdmin(): void {
  revalidatePath("/admin", "layout");
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Tìm góc của trường theo tên, so không dấu không hoa thường. */
async function findAngleByName(client: Tx | typeof db, schoolId: string, name: string) {
  const key = angleKey(name);
  const angles = await client.schoolAngle.findMany({ where: { schoolId }, select: { id: true, name: true } });
  return angles.find((a) => angleKey(a.name) === key) ?? null;
}

/** Xoá file từng ảnh một, không để lỗi xoá file làm hỏng thao tác đã ghi DB. */
async function deleteImagesQuietly(stems: string[]): Promise<void> {
  for (const stem of stems) {
    try {
      await deleteImage(stem);
    } catch (err) {
      console.error("[school] không xoá được file", stem, err);
    }
  }
}

const kindSchema = z.enum(["INDIVIDUAL", "GROUP"], { message: "Chọn kiểu chụp" });

function yearSchema() {
  const max = maxYear();
  return z.coerce
    .number({ message: "Năm chụp chưa đúng" })
    .int("Năm chụp chưa đúng")
    .min(MIN_YEAR, `Năm chụp từ ${MIN_YEAR} trở đi`)
    .max(max, `Năm chụp không quá ${max}`);
}

/** Phần thông tin chung của một lần nộp và một lần sửa nộp lại. */
function submissionFieldsSchema() {
  return z
    .object({
      schoolId: z.string().trim().min(1, "Chọn trường"),
      angleId: z.string().trim().nullish(),
      angleText: z.string().max(200).nullish(),
      year: yearSchema(),
      kind: kindSchema,
      note: z.string().trim().max(NOTE_MAX, `Ghi chú tối đa ${NOTE_MAX} ký tự`).nullish(),
      consent: z.literal(true, { message: "Cần tick cam kết khách trong ảnh đã đồng ý cho NAGIH đăng ảnh." }),
    })
    .transform((d) => ({
      ...d,
      angleId: d.angleId || null,
      angleText: normalizeAngleName(d.angleText ?? ""),
      note: d.note ?? "",
    }))
    .refine((d) => d.angleId || d.angleText, { message: "Chọn góc có sẵn hoặc gõ tên góc mới", path: ["angleText"] })
    .refine((d) => d.angleText.length <= ANGLE_NAME_MAX, {
      message: `Tên góc tối đa ${ANGLE_NAME_MAX} ký tự`,
      path: ["angleText"],
    });
}

export type SubmissionFields = {
  schoolId: string;
  /** góc chọn từ danh mục; có thì bỏ qua angleText */
  angleId?: string | null;
  /** góc tự gõ khi chưa có trong danh mục */
  angleText?: string | null;
  year: number | string;
  kind: ShotKind | string;
  note?: string | null;
  /** phải là true */
  consent: boolean;
};

type CleanFields = {
  schoolId: string;
  angleId: string | null;
  angleText: string;
  year: number;
  kind: ShotKind;
  note: string;
};

function parseFields(input: SubmissionFields): CleanFields {
  const parsed = submissionFieldsSchema().safeParse(input);
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ");
  const d = parsed.data;
  return { schoolId: d.schoolId, angleId: d.angleId, angleText: d.angleText, year: d.year, kind: d.kind, note: d.note };
}

/**
 * Kiểm tra trường tồn tại và chốt góc: angleId phải thuộc đúng trường;
 * angleText trùng (không dấu) với góc có sẵn thì dùng luôn góc đó.
 */
async function resolveSubmissionAngle(f: CleanFields): Promise<{ angleId: string | null; angleText: string }> {
  const school = await db.school.findUnique({ where: { id: f.schoolId }, select: { id: true } });
  if (!school) fail("Không tìm thấy trường này.");
  if (f.angleId) {
    const angle = await db.schoolAngle.findFirst({ where: { id: f.angleId, schoolId: f.schoolId }, select: { id: true } });
    if (!angle) fail("Góc chụp này không thuộc trường đã chọn.");
    return { angleId: angle.id, angleText: "" };
  }
  const match = await findAngleByName(db, f.schoolId, f.angleText);
  return match ? { angleId: match.id, angleText: "" } : { angleId: null, angleText: f.angleText };
}

function pendingLimitMessage(current: number, adding: number): string {
  const room = Math.max(0, MAX_PENDING_PER_PHOTOGRAPHER - current);
  const base = `Bạn đang có ${current} ảnh chờ duyệt, tối đa ${MAX_PENDING_PER_PHOTOGRAPHER}. Đợi QC duyệt bớt rồi nộp tiếp.`;
  return room > 0 && adding > room ? `${base} Lúc này chỉ nộp thêm được ${room} ảnh.` : base;
}

async function assertPendingRoom(client: Tx | typeof db, photographerId: string, adding: number): Promise<void> {
  const current = await client.photoSubmission.count({ where: { photographerId, status: "PENDING" } });
  if (current + adding > MAX_PENDING_PER_PHOTOGRAPHER) fail(pendingLimitMessage(current, adding));
}

/**
 * Khoá theo Photo trong transaction (pg advisory lock, tự nhả khi transaction
 * xong): hai request nộp cùng lúc của một Photo phải xếp hàng ở bước đếm rồi
 * ghi, để giới hạn 10 ảnh chờ duyệt không bị vượt.
 */
async function lockPhotographerPending(tx: Tx, photographerId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pending:${photographerId}`}))`;
}

/**
 * Xếp hàng các lần nộp của cùng một Photo trong tiến trình này, để hai tab
 * gửi cùng lúc không giải mã ảnh song song trên server 2 GB. Phần chặn giới
 * hạn thật vẫn là lockPhotographerPending ở trên.
 */
const submitQueues = new Map<string, Promise<unknown>>();

async function serializeByPhotographer<T>(photographerId: string, fn: () => Promise<T>): Promise<T> {
  const prev = submitQueues.get(photographerId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => undefined);
  submitQueues.set(photographerId, tail);
  try {
    return await run;
  } finally {
    if (submitQueues.get(photographerId) === tail) submitQueues.delete(photographerId);
  }
}

/** Đọc và xử lý một file ảnh vào pending/<photographerId>/. Mỗi lần chỉ giữ một buffer. */
async function processSubmissionFile(file: File, photographerId: string) {
  const input = Buffer.from(await file.arrayBuffer());
  try {
    return await processImage(input, { dir: pendingDir(photographerId), jpegFallback: true });
  } catch (err) {
    if (err instanceof SchoolError) throw err;
    console.error("[school] xử lý ảnh lỗi", err);
    fail(`Không đọc được ảnh${file.name ? ` ${file.name}` : ""}. Thử xuất lại sang JPEG rồi nộp.`);
  }
}

// ---------------------------------------------------------------- Photo nộp ảnh

export type SubmitPhotosInput = SubmissionFields & { files: File[] };

/**
 * Photo nộp 1–5 ảnh của một trường, một góc. Mỗi file thành một bài nộp
 * PENDING. Chặn ở server: tối đa 5 ảnh một lần, tối đa 10 ảnh chờ duyệt.
 * Id Photo lấy từ user (phiên đăng nhập), không nhận từ form.
 */
export async function submitPhotos(user: AdminUser, input: SubmitPhotosInput): Promise<{ count: number }> {
  const photographerId = assertPhotographer(user);
  const fields = parseFields(input);

  const files = (input.files ?? []).filter((f) => f && f.size > 0);
  if (files.length === 0) fail("Chọn ít nhất 1 ảnh.");
  if (files.length > MAX_FILES_PER_SUBMIT) fail(`Mỗi lần nộp tối đa ${MAX_FILES_PER_SUBMIT} ảnh.`);
  for (const f of files) {
    try {
      assertAcceptableUpload(f);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Ảnh chưa hợp lệ.");
    }
  }

  const angle = await resolveSubmissionAngle(fields);

  const processed = await serializeByPhotographer(photographerId, () =>
    processAndInsertSubmissions(user, photographerId, fields, angle, files),
  );

  await db.auditLog.create({
    data: {
      actorId: user.id,
      entity: "photo_submission",
      entityId: fields.schoolId,
      action: "submit",
      diff: { count: processed.length, angleId: angle.angleId, angleText: angle.angleText },
    },
  });
  revalidateAdmin();
  return { count: processed.length };
}

async function processAndInsertSubmissions(
  user: AdminUser,
  photographerId: string,
  fields: CleanFields,
  angle: { angleId: string | null; angleText: string },
  files: File[],
): Promise<ProcessedImage[]> {
  // Đếm sớm cho Photo biết ngay, khỏi chờ xử lý ảnh rồi mới bị chặn.
  await assertPendingRoom(db, photographerId, files.length);

  // Xử lý tuần tự từng ảnh: server 2 GB RAM, không giải mã nhiều ảnh cùng lúc.
  const processed: ProcessedImage[] = [];
  try {
    for (const file of files) processed.push(await processSubmissionFile(file, photographerId));

    const now = new Date();
    await db.$transaction(async (tx) => {
      // Đếm lại dưới khoá rồi mới ghi: chặn thật ở đây, không phải ở lần đếm sớm.
      await lockPhotographerPending(tx, photographerId);
      await assertPendingRoom(tx, photographerId, processed.length);
      await tx.photoSubmission.createMany({
        data: processed.map((img) => ({
          schoolId: fields.schoolId,
          angleId: angle.angleId,
          angleText: angle.angleText,
          photographerId,
          year: fields.year,
          kind: fields.kind,
          note: fields.note,
          path: img.stem,
          width: img.width,
          height: img.height,
          consent: true,
          consentAt: now,
          consentById: user.id,
          status: "PENDING" as const,
        })),
      });
    });
  } catch (err) {
    await deleteImagesQuietly(processed.map((p) => p.stem));
    if (err instanceof SchoolError) throw err;
    console.error("[school] nộp ảnh lỗi", err);
    fail("Chưa lưu được ảnh, thử lại sau ít phút.");
  }
  return processed;
}

/**
 * Photo sửa một ảnh bị trả lại rồi nộp lại: về PENDING, xoá lý do trả.
 * Có thể kèm một file thay ảnh cũ. Tính vào giới hạn 10 ảnh chờ duyệt.
 */
export async function resubmitRejected(
  user: AdminUser,
  submissionId: string,
  fields: SubmissionFields,
  file?: File | null,
): Promise<void> {
  const photographerId = assertPhotographer(user);
  const sub = await db.photoSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, photographerId: true, status: true, path: true },
  });
  // Ảnh của Photo khác trả như không tồn tại, không lộ là có.
  if (!sub || sub.photographerId !== photographerId) fail("Không tìm thấy ảnh này.");
  if (sub.status !== "REJECTED") fail("Chỉ sửa và nộp lại được ảnh bị trả lại.");

  const f = parseFields(fields);
  const replacement = file && file.size > 0 ? file : null;
  if (replacement) {
    try {
      assertAcceptableUpload(replacement);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Ảnh chưa hợp lệ.");
    }
  }
  const angle = await resolveSubmissionAngle(f);
  const img = await serializeByPhotographer(photographerId, async () => {
    await assertPendingRoom(db, photographerId, 1);

    const img = replacement ? await processSubmissionFile(replacement, photographerId) : null;
    const now = new Date();
    try {
      await db.$transaction(async (tx) => {
        // Đếm lại dưới khoá theo Photo, cùng khoá với lúc nộp mới.
        await lockPhotographerPending(tx, photographerId);
        await assertPendingRoom(tx, photographerId, 1);
        const { count } = await tx.photoSubmission.updateMany({
          where: { id: sub.id, photographerId, status: "REJECTED" },
          data: {
            schoolId: f.schoolId,
            angleId: angle.angleId,
            angleText: angle.angleText,
            year: f.year,
            kind: f.kind,
            note: f.note,
            consent: true,
            consentAt: now,
            consentById: user.id,
            status: "PENDING",
            rejectReason: "",
            reviewedById: null,
            reviewedAt: null,
            ...(img ? { path: img.stem, width: img.width, height: img.height } : {}),
          },
        });
        if (count === 0) fail("Ảnh này vừa được xử lý ở chỗ khác, tải lại trang.");
      });
    } catch (err) {
      if (img) await deleteImagesQuietly([img.stem]);
      if (err instanceof SchoolError) throw err;
      console.error("[school] nộp lại lỗi", err);
      fail("Chưa lưu được, thử lại sau ít phút.");
    }
    return img;
  });
  if (img) await deleteImagesQuietly([sub.path]);

  await db.auditLog.create({
    data: { actorId: user.id, entity: "photo_submission", entityId: sub.id, action: "resubmit", diff: { replacedFile: !!img } },
  });
  revalidateAdmin();
}

/**
 * Photo rút một ảnh của mình đang chờ duyệt hoặc bị trả lại (xoá luôn file).
 * Ảnh đã lên web thì không rút được, phải nhắn QC gỡ.
 */
export async function withdrawSubmission(user: AdminUser, submissionId: string): Promise<void> {
  const photographerId = assertPhotographer(user);
  const sub = await db.photoSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, photographerId: true, status: true, path: true },
  });
  if (!sub || sub.photographerId !== photographerId) fail("Không tìm thấy ảnh này.");
  if (sub.status === "APPROVED") fail("Ảnh đã lên web, muốn gỡ thì nhắn QC.");

  const { count } = await db.photoSubmission.deleteMany({
    where: { id: sub.id, photographerId, status: { in: ["PENDING", "REJECTED"] } },
  });
  if (count === 0) fail("Ảnh này vừa được duyệt, muốn gỡ thì nhắn QC.");
  await deleteImagesQuietly([sub.path]);

  await db.auditLog.create({
    data: { actorId: user.id, entity: "photo_submission", entityId: sub.id, action: "withdraw", diff: { status: sub.status } },
  });
  revalidateAdmin();
}

// ---------------------------------------------------------------- QC duyệt

/**
 * Cảnh báo luật 40% NẾU duyệt thêm một ảnh của Photo này vào trường này.
 * Hàng đợi gọi trước khi QC bấm duyệt. Trả null khi không vượt.
 */
export async function shareWarning(schoolId: string, photographerId: string): Promise<string | null> {
  const [total, mine, ph] = await Promise.all([
    db.schoolPhoto.count({ where: { schoolId } }),
    db.schoolPhoto.count({ where: { schoolId, photographerId } }),
    db.photographer.findUnique({ where: { id: photographerId }, select: { name: true } }),
  ]);
  return shareText(ph?.name ?? "Photo này", mine + 1, total + 1);
}

export type ApproveInput = {
  /** góc chuẩn có sẵn của trường */
  angleId?: string | null;
  /** hoặc tên góc mới; trùng (không dấu) với góc có sẵn thì dùng góc đó */
  newAngleName?: string | null;
};

export type ApproveResult = {
  photoId: string;
  /** có khi Photo này chiếm quá 40% số ảnh của trường sau khi duyệt */
  warning?: string;
  /** true khi lần duyệt này làm trường chuyển từ "Sắp có" sang hiện chính */
  wentLive: boolean;
};

/**
 * Duyệt một ảnh: chốt góc chuẩn (tạo góc mới nếu cần), tạo SchoolPhoto,
 * đánh dấu bài nộp APPROVED, tự đặt bìa và tự chuyển LIVE khi đủ 4 ảnh.
 * Ghi DB trong một transaction trước, chuyển file pending/ → schools/ sau;
 * chuyển file lỗi thì hoàn lại DB để không có ảnh trỏ vào file không tồn tại.
 */
export async function approveSubmission(user: AdminUser, submissionId: string, input: ApproveInput): Promise<ApproveResult> {
  assertReviewer(user);
  const sub = await db.photoSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      status: true,
      schoolId: true,
      angleId: true,
      angleText: true,
      photographerId: true,
      year: true,
      kind: true,
      note: true,
      path: true,
      width: true,
      height: true,
      consentAt: true,
      consentById: true,
      updatedAt: true,
      school: { select: { slug: true } },
      photographer: { select: { name: true } },
    },
  });
  if (!sub) fail("Không tìm thấy ảnh này.");
  if (sub.status !== "PENDING") fail("Ảnh này đã được xử lý rồi, tải lại trang.");

  const newName = normalizeAngleName(input.newAngleName ?? "");
  if (!input.angleId && !newName) fail("Chọn hoặc gõ tên góc chuẩn trước khi duyệt.");
  if (newName.length > ANGLE_NAME_MAX) fail(`Tên góc tối đa ${ANGLE_NAME_MAX} ký tự.`);

  const newStem = `${schoolDir(sub.schoolId)}/${sub.path.split("/").pop()}`;
  const now = new Date();

  const result = await db.$transaction(async (tx) => {
    // Khoá hàng trường: hai QC duyệt hai ảnh cùng trường thì xếp hàng, để đếm
    // đủ 4 ảnh, thứ tự ảnh, bìa và góc mới đều thấy lần duyệt của người kia.
    await tx.$executeRaw`SELECT id FROM schools WHERE id = ${sub.schoolId} FOR UPDATE`;

    // Giành bài nộp trước: hai QC bấm cùng lúc thì chỉ một người thắng.
    // So cả path và updatedAt: bài bị trả rồi Photo sửa nộp lại thì bản QC đang xem đã cũ.
    const claim = await tx.photoSubmission.updateMany({
      where: { id: sub.id, status: "PENDING", path: sub.path, updatedAt: sub.updatedAt },
      data: { status: "APPROVED", reviewedById: user.id, reviewedAt: now, rejectReason: "", path: newStem },
    });
    if (claim.count === 0) fail("Ảnh này vừa được người khác xử lý, tải lại trang.");

    let angleId: string;
    let createdAngle = false;
    if (input.angleId) {
      const a = await tx.schoolAngle.findFirst({ where: { id: input.angleId, schoolId: sub.schoolId }, select: { id: true } });
      if (!a) fail("Góc này không thuộc trường của ảnh.");
      angleId = a.id;
    } else {
      const existing = await findAngleByName(tx, sub.schoolId, newName);
      if (existing) angleId = existing.id;
      else {
        angleId = (await tx.schoolAngle.create({ data: { schoolId: sub.schoolId, name: newName }, select: { id: true } })).id;
        createdAngle = true;
      }
    }
    await tx.photoSubmission.update({ where: { id: sub.id }, data: { angleId, angleText: "" } });

    const last = await tx.schoolPhoto.findFirst({
      where: { schoolId: sub.schoolId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const photo = await tx.schoolPhoto.create({
      data: {
        schoolId: sub.schoolId,
        angleId,
        photographerId: sub.photographerId,
        year: sub.year,
        kind: sub.kind,
        note: sub.note,
        path: newStem,
        width: sub.width,
        height: sub.height,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        approvedAt: now,
        approvedById: user.id,
        consentAt: sub.consentAt,
        consentById: sub.consentById,
      },
      select: { id: true },
    });

    const [school, total, mine] = await Promise.all([
      tx.school.findUniqueOrThrow({ where: { id: sub.schoolId }, select: { status: true, coverPhotoId: true } }),
      tx.schoolPhoto.count({ where: { schoolId: sub.schoolId } }),
      tx.schoolPhoto.count({ where: { schoolId: sub.schoolId, photographerId: sub.photographerId } }),
    ]);
    const wentLive = school.status === "SOON" && total >= LIVE_THRESHOLD;
    if (wentLive || !school.coverPhotoId) {
      await tx.school.update({
        where: { id: sub.schoolId },
        data: {
          ...(wentLive ? { status: "LIVE" as const } : {}),
          ...(!school.coverPhotoId ? { coverPhotoId: photo.id } : {}),
        },
      });
    }
    return { photoId: photo.id, angleId, createdAngle, wentLive, total, mine };
  });

  try {
    await moveImage(sub.path, schoolDir(sub.schoolId));
  } catch (err) {
    console.error("[school] chuyển file duyệt lỗi", err);
    // Hoàn lại: đưa file đã chuyển (nếu có) về chỗ cũ, gỡ ảnh vừa tạo, bài nộp về chờ duyệt.
    try {
      await moveImage(newStem, sub.path.split("/").slice(0, -1).join("/"));
    } catch (e) {
      console.error("[school] hoàn file lỗi", e);
    }
    await db.$transaction([
      db.schoolPhoto.delete({ where: { id: result.photoId } }),
      db.photoSubmission.update({
        where: { id: sub.id },
        data: { status: "PENDING", reviewedById: null, reviewedAt: null, path: sub.path, angleId: sub.angleId, angleText: sub.angleText },
      }),
      ...(result.wentLive ? [db.school.update({ where: { id: sub.schoolId }, data: { status: "SOON" } })] : []),
    ]);
    fail("Chưa chuyển được file ảnh, thử duyệt lại.");
  }

  await db.auditLog.create({
    data: {
      actorId: user.id,
      entity: "photo_submission",
      entityId: sub.id,
      action: "approve",
      diff: { photoId: result.photoId, angleId: result.angleId, createdAngle: result.createdAngle, wentLive: result.wentLive },
    },
  });
  revalidateSchools(sub.school.slug);
  revalidateAdmin();

  const warning = shareText(sub.photographer.name, result.mine, result.total);
  return { photoId: result.photoId, wentLive: result.wentLive, ...(warning ? { warning } : {}) };
}

/** Trả ảnh về Photo, bắt buộc lý do ngắn 3–300 ký tự. */
export async function rejectSubmission(user: AdminUser, submissionId: string, reason: string): Promise<void> {
  assertReviewer(user);
  const text = (reason ?? "").replace(/\s+/g, " ").trim();
  if (text.length < REJECT_REASON_MIN) fail(`Nhập lý do trả ảnh (ít nhất ${REJECT_REASON_MIN} ký tự).`);
  if (text.length > REJECT_REASON_MAX) fail(`Lý do tối đa ${REJECT_REASON_MAX} ký tự.`);

  const { count } = await db.photoSubmission.updateMany({
    where: { id: submissionId, status: "PENDING" },
    data: { status: "REJECTED", rejectReason: text, reviewedById: user.id, reviewedAt: new Date() },
  });
  if (count === 0) fail("Ảnh này đã được xử lý rồi, tải lại trang.");

  await db.auditLog.create({
    data: { actorId: user.id, entity: "photo_submission", entityId: submissionId, action: "reject", diff: { reason: text } },
  });
  revalidateAdmin();
}

/**
 * Gỡ một ảnh đã lên web, một bấm. Xoá luôn file và bài nộp đã duyệt tương ứng.
 * Ảnh đang làm bìa thì lấy ảnh kế tiếp làm bìa. Trường hết ảnh thì về "Sắp có".
 */
export async function removeSchoolPhoto(user: AdminUser, photoId: string): Promise<void> {
  assertReviewer(user);
  const photo = await db.schoolPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, path: true, schoolId: true, photographerId: true, school: { select: { slug: true, coverPhotoId: true } } },
  });
  if (!photo) fail("Không tìm thấy ảnh này, có thể đã được gỡ.");

  await db.$transaction(async (tx) => {
    await tx.schoolPhoto.delete({ where: { id: photo.id } });
    await tx.photoSubmission.deleteMany({ where: { path: photo.path, status: "APPROVED" } });
    const next = await tx.schoolPhoto.findFirst({
      where: { schoolId: photo.schoolId },
      orderBy: [{ sortOrder: "asc" }, { approvedAt: "asc" }],
      select: { id: true },
    });
    await tx.school.update({
      where: { id: photo.schoolId },
      data: {
        ...(photo.school.coverPhotoId === photo.id || !photo.school.coverPhotoId ? { coverPhotoId: next?.id ?? null } : {}),
        ...(next ? {} : { status: "SOON" as const }),
      },
    });
  });
  await deleteImagesQuietly([photo.path]);

  await db.auditLog.create({
    data: {
      actorId: user.id,
      entity: "school_photo",
      entityId: photo.id,
      action: "remove",
      diff: { schoolId: photo.schoolId, photographerId: photo.photographerId },
    },
  });
  revalidateSchools(photo.school.slug);
  revalidateAdmin();
}

/** Đặt một ảnh đã duyệt của trường làm ảnh bìa. */
export async function setCover(user: AdminUser, schoolId: string, photoId: string): Promise<void> {
  assertReviewer(user);
  const photo = await db.schoolPhoto.findFirst({
    where: { id: photoId, schoolId },
    select: { id: true, school: { select: { slug: true } } },
  });
  if (!photo) fail("Ảnh này không thuộc trường.");
  await db.school.update({ where: { id: schoolId }, data: { coverPhotoId: photo.id } });
  await db.auditLog.create({
    data: { actorId: user.id, entity: "school", entityId: schoolId, action: "setCover", diff: { photoId } },
  });
  revalidateSchools(photo.school.slug);
  revalidateAdmin();
}

// ---------------------------------------------------------------- danh mục góc

async function loadAngle(angleId: string) {
  const angle = await db.schoolAngle.findUnique({
    where: { id: angleId },
    select: { id: true, name: true, schoolId: true, school: { select: { slug: true } } },
  });
  if (!angle) fail("Không tìm thấy góc này.");
  return angle;
}

/** QC thêm sẵn một góc chuẩn cho trường. Trùng tên (không dấu) thì báo. */
export async function createAngle(user: AdminUser, schoolId: string, name: string): Promise<{ id: string }> {
  assertReviewer(user);
  const clean = normalizeAngleName(name ?? "");
  if (!clean) fail("Nhập tên góc.");
  if (clean.length > ANGLE_NAME_MAX) fail(`Tên góc tối đa ${ANGLE_NAME_MAX} ký tự.`);
  const school = await db.school.findUnique({ where: { id: schoolId }, select: { id: true } });
  if (!school) fail("Không tìm thấy trường này.");
  const clash = await findAngleByName(db, schoolId, clean);
  if (clash) fail(`Trường đã có góc "${clash.name}".`);

  const created = await db.schoolAngle.create({ data: { schoolId, name: clean }, select: { id: true } });
  await db.auditLog.create({
    data: { actorId: user.id, entity: "school_angle", entityId: created.id, action: "create", diff: { schoolId, name: clean } },
  });
  revalidateAdmin();
  return created;
}

/** Đổi tên góc. Trùng (không dấu) với góc khác của trường thì bảo gộp. */
export async function renameAngle(user: AdminUser, angleId: string, name: string): Promise<void> {
  assertReviewer(user);
  const angle = await loadAngle(angleId);
  const clean = normalizeAngleName(name ?? "");
  if (!clean) fail("Nhập tên góc.");
  if (clean.length > ANGLE_NAME_MAX) fail(`Tên góc tối đa ${ANGLE_NAME_MAX} ký tự.`);
  if (clean === angle.name) return;
  const clash = await findAngleByName(db, angle.schoolId, clean);
  if (clash && clash.id !== angle.id) fail(`Trường đã có góc "${clash.name}", hãy gộp hai góc thay vì đổi tên.`);

  await db.schoolAngle.update({ where: { id: angle.id }, data: { name: clean } });
  await db.auditLog.create({
    data: { actorId: user.id, entity: "school_angle", entityId: angle.id, action: "rename", diff: { from: angle.name, to: clean } },
  });
  revalidateSchools(angle.school.slug);
  revalidateAdmin();
}

/** Gộp góc `fromId` vào `intoId` (cùng trường): chuyển ảnh và bài nộp sang rồi xoá góc cũ. */
export async function mergeAngles(user: AdminUser, fromId: string, intoId: string): Promise<{ moved: number }> {
  assertReviewer(user);
  if (fromId === intoId) fail("Chọn hai góc khác nhau để gộp.");
  const [from, into] = await Promise.all([loadAngle(fromId), loadAngle(intoId)]);
  if (from.schoolId !== into.schoolId) fail("Chỉ gộp được hai góc của cùng một trường.");

  const moved = await db.$transaction(async (tx) => {
    const photos = await tx.schoolPhoto.updateMany({ where: { angleId: from.id }, data: { angleId: into.id } });
    await tx.photoSubmission.updateMany({ where: { angleId: from.id }, data: { angleId: into.id } });
    await tx.schoolAngle.delete({ where: { id: from.id } });
    return photos.count;
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      entity: "school_angle",
      entityId: from.id,
      action: "merge",
      diff: { from: from.name, into: into.name, intoId: into.id, moved },
    },
  });
  revalidateSchools(from.school.slug);
  revalidateAdmin();
  return { moved };
}

/**
 * Xoá góc chưa có ảnh đã duyệt nào. Có ảnh thì phải gộp sang góc khác.
 * Bài nộp đang trỏ vào góc này giữ lại tên góc dưới dạng chữ để QC chốt lại.
 */
export async function deleteAngle(user: AdminUser, angleId: string): Promise<void> {
  assertReviewer(user);
  const angle = await loadAngle(angleId);
  const used = await db.schoolPhoto.count({ where: { angleId: angle.id } });
  if (used > 0) fail(`Góc "${angle.name}" đang có ${used} ảnh trên web, hãy gộp sang góc khác thay vì xoá.`);

  await db.$transaction([
    db.photoSubmission.updateMany({ where: { angleId: angle.id }, data: { angleId: null, angleText: angle.name } }),
    db.schoolAngle.delete({ where: { id: angle.id } }),
  ]);
  await db.auditLog.create({
    data: { actorId: user.id, entity: "school_angle", entityId: angle.id, action: "delete", diff: { name: angle.name } },
  });
  revalidateAdmin();
}

// ---------------------------------------------------------------- trường

const schoolSchema = z.object({
  name: z.string().trim().min(1, "Thiếu tên trường").max(120),
  short: z.string().trim().max(16, "Mã trường tối đa 16 ký tự").default(""),
  city: z.string().trim().max(40).default(""),
  slug: z.string().trim().max(80).default(""),
  intro: z.string().trim().max(1200, "Giới thiệu tối đa 1200 ký tự").default(""),
  status: z.enum(["LIVE", "SOON"]).default("SOON"),
  order: z.coerce.number().int().min(0).max(9999).default(0),
});

export type SchoolInput = {
  name: string;
  short?: string;
  city?: string;
  /** trống thì sinh từ tên */
  slug?: string;
  intro?: string;
  status?: SchoolStatus;
  /**
   * Trạng thái lúc mở form sửa. Có và bằng `status` nghĩa là OWNER không đổi
   * trạng thái: giữ nguyên giá trị trong DB, để form mở từ trước không kéo
   * trường vừa tự chuyển LIVE về lại SOON.
   */
  statusWas?: SchoolStatus;
  order?: number | string;
};

function parseSchool(input: SchoolInput) {
  const parsed = schoolSchema.safeParse(input);
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ");
  return parsed.data;
}

async function uniqueSchoolSlug(source: string, excludeId: string): Promise<string> {
  const base = slugify(source) || "truong";
  let slug = base;
  for (let n = 2; ; n += 1) {
    // excludeId rỗng (thêm trường mới) thì không thêm NOT, vì NOT: {} có thể không khớp hàng nào.
    const clash = await db.school.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${n}`;
  }
}

/** OWNER thêm trường. Mặc định "Sắp có", đứng cuối danh sách nếu không nhập thứ tự. */
export async function createSchool(user: AdminUser, input: SchoolInput): Promise<{ id: string; slug: string }> {
  assertSchoolManager(user);
  const d = parseSchool(input);
  const slug = await uniqueSchoolSlug(d.slug || d.name, "");
  const order =
    input.order === undefined || input.order === ""
      ? ((await db.school.findFirst({ orderBy: { order: "desc" }, select: { order: true } }))?.order ?? 0) + 1
      : d.order;
  const created = await db.school.create({
    data: { name: d.name, short: d.short, city: d.city, intro: d.intro, status: d.status, order, slug },
    select: { id: true, slug: true },
  });
  await db.auditLog.create({
    data: { actorId: user.id, entity: "school", entityId: created.id, action: "create", diff: { name: d.name, slug } },
  });
  revalidateSchools(slug);
  revalidateAdmin();
  return created;
}

/** OWNER sửa tên, mã, thành phố, slug, giới thiệu, trạng thái, thứ tự. */
export async function updateSchool(user: AdminUser, schoolId: string, input: SchoolInput): Promise<{ slug: string }> {
  assertSchoolManager(user);
  const existing = await db.school.findUnique({ where: { id: schoolId }, select: { id: true, slug: true } });
  if (!existing) fail("Không tìm thấy trường này.");
  const d = parseSchool(input);
  const wanted = slugify(d.slug || d.name);
  const slug = wanted === existing.slug ? existing.slug : await uniqueSchoolSlug(wanted, schoolId);

  const statusChanged = input.statusWas === undefined || input.statusWas !== d.status;

  await db.school.update({
    where: { id: schoolId },
    data: {
      name: d.name,
      short: d.short,
      city: d.city,
      intro: d.intro,
      ...(statusChanged ? { status: d.status } : {}),
      order: d.order,
      slug,
    },
  });
  const { status, ...rest } = d;
  await db.auditLog.create({
    data: {
      actorId: user.id,
      entity: "school",
      entityId: schoolId,
      action: "update",
      diff: { ...rest, ...(statusChanged ? { status } : {}), slug },
    },
  });
  if (slug !== existing.slug) revalidateSchools(existing.slug);
  revalidateSchools(slug);
  revalidateAdmin();
  return { slug };
}

/** OWNER xoá trường: xoá luôn góc, ảnh đã duyệt, bài nộp và mọi file ảnh của chúng. */
export async function deleteSchool(user: AdminUser, schoolId: string): Promise<void> {
  assertSchoolManager(user);
  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      slug: true,
      name: true,
      photos: { select: { path: true } },
      submissions: { select: { path: true } },
    },
  });
  if (!school) fail("Không tìm thấy trường này.");

  // Xoá ảnh trước rồi mới xoá trường: ảnh trỏ góc bằng RESTRICT, để cascade
  // tự xoá góc và ảnh cùng lúc thì Postgres có thể chặn tuỳ thứ tự.
  await db.$transaction([
    db.school.update({ where: { id: school.id }, data: { coverPhotoId: null } }),
    db.schoolPhoto.deleteMany({ where: { schoolId: school.id } }),
    db.photoSubmission.deleteMany({ where: { schoolId: school.id } }),
    db.school.delete({ where: { id: school.id } }),
  ]);
  const stems = [...new Set([...school.photos.map((p) => p.path), ...school.submissions.map((s) => s.path)])];
  await deleteImagesQuietly(stems);

  await db.auditLog.create({
    data: {
      actorId: user.id,
      entity: "school",
      entityId: school.id,
      action: "delete",
      diff: { name: school.name, slug: school.slug, photos: school.photos.length, submissions: school.submissions.length },
    },
  });
  revalidateSchools(school.slug);
  revalidateAdmin();
}

// ---------------------------------------------------------------- thống kê

export type StatType = "view" | "book";

/**
 * Cộng một lượt khách mở ảnh (view) hoặc bấm Đặt (book) cho Photo, theo ngày
 * giờ Việt Nam. Một câu INSERT … ON CONFLICT nên hai request cùng lúc không đụng nhau.
 */
export async function recordStat(photographerId: string, type: StatType): Promise<void> {
  const date = new Date(`${todayVN()}T00:00:00Z`);
  const views = type === "view" ? 1 : 0;
  const books = type === "book" ? 1 : 0;
  await db.$executeRaw`
    INSERT INTO "photographer_stats" ("photographerId", "date", "views", "bookClicks")
    VALUES (${photographerId}, ${date}::date, ${views}::int, ${books}::int)
    ON CONFLICT ("photographerId", "date")
    DO UPDATE SET "views" = "photographer_stats"."views" + ${views}::int,
                  "bookClicks" = "photographer_stats"."bookClicks" + ${books}::int`;
}
