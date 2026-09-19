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
}
