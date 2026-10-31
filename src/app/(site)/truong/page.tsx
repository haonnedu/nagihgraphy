import type { Metadata } from "next";
import Link from "next/link";
import { BrowseTabs } from "@/components/school/browse-tabs";
import { SchoolBrowser } from "@/components/school/school-browser";
import { listSchoolsPublic } from "@/lib/school-queries";

// Render động mỗi request, giống /tho: lúc build trong CI không có database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chọn trường",
  description:
    "Xem ảnh kỷ yếu thật NAGIH GRAPHY đã chụp tại trường của bạn, ưng góc nào thì chọn luôn Photo đã chụp góc đó.",
  alternates: { canonical: "/truong" },
};

/** Màn hình 1 của Chọn trường, xem docs/chon-truong.md. */
export default async function SchoolsPage() {
  const { live, soon, cities } = await listSchoolsPublic();

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-14">
      <BrowseTabs active="truong" className="pt-4" />

      <section className="pb-1.5 pt-4">
        <h1 className="font-serif text-[clamp(26px,6vw,36px)] font-semibold leading-tight tracking-tight text-balance">
          Chọn trường{" "}
          <span className="font-script text-[1.22em] leading-none text-blue">của bạn</span>
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-ink-2">
          Xem ảnh thật Photo NAGIH đã chụp ngay tại trường mình, ưng góc nào thì chọn luôn Photo đã chụp
          góc đó.
        </p>
      </section>

      <SchoolBrowser live={live} soon={soon} cities={cities} />

      <p className="mt-6 rounded-card border border-line bg-blue-soft px-5 py-5 text-center text-[14.5px] leading-relaxed text-ink-2 text-pretty">
        Chưa thấy trường của bạn?{" "}
        <Link href="/lien-he" className="font-medium text-blue underline underline-offset-2">
          Nhắn NAGIH
        </Link>
        , bọn mình nhận chụp ở mọi trường, chỉ là chưa kịp đưa ảnh lên web.
      </p>
    </main>
  );
}
