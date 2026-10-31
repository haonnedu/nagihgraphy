/**
 * Địa chỉ gốc của site: SITE_DOMAIN có thì https://<domain>, không thì
 * localhost lúc dev. Dùng cho metadataBase ở src/app/layout.tsx, sitemap,
 * robots và JSON-LD (cần URL tuyệt đối). Client không dùng được vì đọc env.
 */
export function siteUrl(): string {
  return process.env.SITE_DOMAIN ? `https://${process.env.SITE_DOMAIN}` : "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}
