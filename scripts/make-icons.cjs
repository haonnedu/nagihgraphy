/**
 * Sinh icon cho tab trình duyệt và màn hình chính từ seed-assets/logo.png.
 * Next.js tự gắn <link rel="icon"> cho các file đặt trong src/app theo tên:
 *   icon.png, apple-icon.png, favicon.ico
 *
 *   node scripts/make-icons.cjs
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SRC = path.join(__dirname, "..", "seed-assets", "logo.png");
const OUT = path.join(__dirname, "..", "src", "app");

/** Đặt logo vào khung vuông, giữ tỉ lệ, chừa lề `pad` mỗi bên. */
async function square(size, pad, background) {
  const inner = size - pad * 2;
  return sharp(SRC)
    .resize({ width: inner, height: inner, fit: "contain", background })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background })
    .png()
    .toBuffer();
}

/**
 * ICO chứa PNG bên trong (Windows Vista trở lên và mọi trình duyệt hiện đại
 * đều đọc được). Cấu trúc: ICONDIR 6 byte + ICONDIRENTRY 16 byte mỗi ảnh + dữ liệu.
 */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(pngs.length, 4);

  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += buf.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
}

(async () => {
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const white = { r: 255, g: 255, b: 255, alpha: 1 };

  const icon512 = await square(512, 40, transparent);
  const apple180 = await square(180, 18, white);
  const ico32 = await square(32, 1, transparent);
  const ico16 = await square(16, 0, transparent);

  fs.writeFileSync(path.join(OUT, "icon.png"), icon512);
  fs.writeFileSync(path.join(OUT, "apple-icon.png"), apple180);
  fs.writeFileSync(path.join(OUT, "favicon.ico"), ico([{ size: 16, buf: ico16 }, { size: 32, buf: ico32 }]));

  for (const f of ["icon.png", "apple-icon.png", "favicon.ico"]) {
    const p = path.join(OUT, f);
    const meta = f.endsWith(".ico") ? null : await sharp(p).metadata();
    console.log(`${f.padEnd(15)} ${fs.statSync(p).size.toString().padStart(6)} B${meta ? `  ${meta.width}x${meta.height} ${meta.hasAlpha ? "alpha" : "opaque"}` : ""}`);
  }
})();
