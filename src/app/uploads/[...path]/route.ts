import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { uploadDir } from "@/lib/images";

/**
 * Trên server thật, Nginx bắt /uploads/ trước và trả file thẳng từ đĩa.
 * Route này chỉ chạy khi dev ở máy cá nhân, hoặc làm lưới an toàn nếu
 * Nginx cấu hình sai. Xem deploy/nagih-common.inc.
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
  const root = path.resolve(uploadDir());
  const target = path.resolve(root, ...segments);

  // Chặn path traversal: file phải nằm trong UPLOAD_DIR.
  if (target !== root && !target.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // originals/ là bản gốc, không phục vụ ra ngoài.
  if (segments[0] === "originals") {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(target).toLowerCase()];
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("not a file");
    const stream = Readable.toWeb(createReadStream(target)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
