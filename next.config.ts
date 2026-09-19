import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image Docker gọn (~150 MB thay vì ~1 GB). Xem PLAN.md mục 3.
  output: "standalone",

  // Ảnh portfolio đã được sharp resize sẵn thành 3 cỡ WebP lúc upload
  // và do Nginx serve trực tiếp, nên không cần optimizer chạy lúc request.
  images: {
    unoptimized: true,
  },

  // Nginx đứng trước nên Next không cần tự nén.
  compress: false,

  poweredByHeader: false,

  // Admin upload ảnh portfolio qua server action; mặc định chỉ 1 MB nên phải nâng.
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },

  // README.md và PLAN.md đã mô tả dự án, không cần Next tự sinh AGENTS.md/CLAUDE.md.
  agentRules: false,
};

export default nextConfig;
