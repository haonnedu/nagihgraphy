/**
 * Bỏ dấu tiếng Việt. Dùng cho cả slug và tìm kiếm không dấu,
 * giống hàm norm() trong bản artifact cũ.
 */
export function deaccent(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function slugify(input: string): string {
  return deaccent(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Chuẩn hoá chuỗi để so khớp tìm kiếm: bỏ dấu, thường hoá, gộp khoảng trắng. */
export function normalizeForSearch(input: string): string {
  return deaccent(input).toLowerCase().replace(/\s+/g, " ").trim();
}

/** Thêm hậu tố -2, -3… khi slug đã tồn tại trong tập đã dùng. */
export function uniqueSlug(base: string, used: Set<string>): string {
  const slug = slugify(base) || "item";
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  let n = 2;
  while (used.has(`${slug}-${n}`)) n += 1;
  const next = `${slug}-${n}`;
  used.add(next);
  return next;
}
