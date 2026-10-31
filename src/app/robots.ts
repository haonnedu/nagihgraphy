import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

// Đọc SITE_DOMAIN lúc chạy, không đóng băng giá trị lúc build (image Docker build không có .env).
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
