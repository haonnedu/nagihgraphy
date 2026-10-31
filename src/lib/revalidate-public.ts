import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Gọi sau mỗi lần admin lưu để trang khách thấy đổi ngay, thay vì chờ
 * hết 5 phút ISR. Truyền slug thợ nếu có để làm mới cả trang chi tiết.
 */
export function revalidatePublic(photographerSlug?: string): void {
  revalidatePath("/");
  revalidatePath("/tho");
  revalidatePath("/bang-gia");
  revalidatePath("/lien-he");
  if (photographerSlug) revalidatePath(`/tho/${photographerSlug}`);
  else revalidatePath("/tho/[slug]", "page");
  // Trang trường hiện tên, hạng, giá và ảnh đại diện của Photo, đổi Photo thì làm mới theo.
  revalidatePath("/truong");
  revalidatePath("/truong/[slug]", "page");
}

/**
 * Làm mới trang Chọn trường sau khi duyệt, gỡ ảnh hoặc sửa trường.
 * Truyền slug để làm mới đúng trang trường đó; không truyền thì làm mới mọi
 * trang trường. Trang chủ có lối vào Chọn trường nên làm mới luôn, và sitemap.
 */
export function revalidateSchools(schoolSlug?: string): void {
  revalidatePath("/");
  revalidatePath("/truong");
  revalidatePath("/sitemap.xml");
  if (schoolSlug) revalidatePath(`/truong/${schoolSlug}`);
  else revalidatePath("/truong/[slug]", "page");
}
