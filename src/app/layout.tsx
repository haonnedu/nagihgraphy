import type { Metadata } from "next";
import { Lora, Dancing_Script, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600"],
  display: "swap",
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  display: "swap",
});

/**
 * Poppins trên Google Fonts không có bộ ký tự tiếng Việt, nên chữ có dấu
 * rơi về font hệ thống và trông bể. Be Vietnam Pro cùng dáng hình học,
 * nhưng vẽ riêng cho tiếng Việt.
 */
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-bvp",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteUrl = process.env.SITE_DOMAIN
  ? `https://${process.env.SITE_DOMAIN}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NAGIH GRAPHY — Chọn thợ chụp kỷ yếu",
    template: "%s · NAGIH GRAPHY",
  },
  description:
    "Xem portfolio từng thợ, giá theo hạng ekip và phụ phí di chuyển tỉnh thành, rồi nhắn NAGIH để giữ lịch.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "NAGIH GRAPHY",
    url: siteUrl,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${lora.variable} ${dancingScript.variable} ${beVietnamPro.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
