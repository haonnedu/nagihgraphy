import Link from "next/link";
import { requireEditor } from "@/lib/admin-guard";
import { loadFormOptions } from "../options";
import { PhotographerForm } from "../photographer-form";

export const dynamic = "force-dynamic";

export default async function NewPhotographerPage() {
  await requireEditor();
  const options = await loadFormOptions();

  return (
    <div className="max-w-[880px]">
      <nav className="text-[12.5px] text-ink-3">
        <Link href="/admin/tho" className="hover:text-blue">
          Thợ
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink-2">Thêm mới</span>
      </nav>
      <h1 className="mt-2 font-serif text-[26px] font-semibold leading-tight">Thêm thợ</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Điền thông tin rồi bấm “Tạo thợ”. Tạo xong sẽ chuyển sang trang sửa để tải ảnh portfolio lên.
      </p>

      <div className="mt-5">
        <PhotographerForm
          options={options}
          value={{
            id: "",
            name: "",
            tierId: options.tiers[0]?.id ?? "",
            city: "Hà Nội",
            style: "",
            bio: "",
            rating: 5,
            sessions: 0,
            priceOverride: 0,
            driveUrl: "",
            zalo: "",
            phone: "",
            facebook: "",
            instagram: "",
            published: false,
            isSample: false,
            tagIds: [],
            features: {},
          }}
        />
      </div>
    </div>
  );
}
