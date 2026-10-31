import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadDir } from "@/lib/images";

/**
 * Trên server thật, Nginx bắt /uploads/ trước và trả file thẳng từ đĩa.
 * Route này chỉ chạy khi dev ở máy cá nhân, hoặc làm lưới an toàn nếu
 * Nginx cấu hình sai. Xem deploy/nagih-common.inc.
 *
 * pending/ là ảnh trường Photo nộp, chưa duyệt: chỉ trả cho người đã đăng nhập
 * admin. Photo chỉ xem được pending/<id thợ của mình>/. Proxy đứng trước
 * KHÔNG được tự phục vụ pending/ từ đĩa, phải để request đi qua route này.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;

  // Next giải mã từng đoạn của catch-all, nên %2F thành "/" ngay trong một đoạn.
  // Đoạn nào có dấu gạch, rỗng, "." hay ".." đều là đường dẫn lạ: trả 404 luôn.
  if (segments.some((s) => !s || s === "." || s === ".." || /[\\/\0]/.test(s))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const root = path.resolve(uploadDir());
  const target = path.resolve(root, ...segments);

  // Chặn path traversal: file phải nằm trong UPLOAD_DIR.
  if (target !== root && !target.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Mọi quyết định quyền dựa trên đường dẫn ĐÃ resolve, không dựa trên URL thô.
  const rel = path.relative(root, target).split(path.sep);

  // originals/ là bản gốc (còn EXIF, GPS), không phục vụ ra ngoài.
  if (rel[0] === "originals") {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(target).toLowerCase()];
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Ảnh chờ duyệt: kiểm tra phiên, trả 404 thay vì 403 để không lộ file có tồn tại.
  const isPending = rel[0] === "pending";
  if (isPending) {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return new NextResponse("Not found", { status: 404 });
    if (user.role === "PHOTOGRAPHER" && (!user.photographerId || rel[1] !== user.photographerId)) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("not a file");
    const stream = Readable.toWeb(createReadStream(target)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Cache-Control": isPending ? "private, no-store" : "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
