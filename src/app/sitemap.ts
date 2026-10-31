import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";
import { listPhotographerSlugs } from "@/lib/queries";
import { listSchoolSlugs, listSchoolsForSitemap } from "@/lib/school-queries";

// Đọc database mỗi request, không chạy lúc build (CI không có database).
// Thêm trường hay Photo là sitemap tự có, không cần build lại.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/tho"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/truong"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/bang-gia"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/lien-he"), changeFrequency: "monthly", priority: 0.6 },
  ];

  try {
    const [photographers, allSchools, liveSchools] = await Promise.all([
      listPhotographerSlugs(),
      listSchoolSlugs(),
      listSchoolsForSitemap(),
    ]);
    for (const slug of photographers) {
      pages.push({ url: absoluteUrl(`/tho/${slug}`), changeFrequency: "weekly", priority: 0.8 });
    }
    // Trường đã có ảnh kèm ngày có ảnh mới nhất; trường "Sắp có ảnh" vẫn có trang riêng.
    const live = new Map(liveSchools.map((s) => [s.slug, s.lastModified]));
    for (const slug of allSchools) {
      const lastModified = live.get(slug);
      pages.push({
        url: absoluteUrl(`/truong/${slug}`),
        lastModified,
        changeFrequency: "weekly",
        priority: lastModified ? 0.8 : 0.4,
      });
    }
  } catch (err) {
    // Database lỗi thì vẫn trả các trang cố định, không để sitemap 500.
    console.error("[sitemap]", err);
  }

  return pages;
}
