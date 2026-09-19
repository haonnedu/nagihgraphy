import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { getSettings } from "@/lib/settings";

/** Khung chung cho trang khách. Admin sẽ có layout riêng ở /admin. */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();

  return (
    <>
      <SmoothScroll />
      <SiteHeader studio={settings.studio} />
      {children}
      <SiteFooter studio={settings.studio} contacts={settings.contacts} />
    </>
  );
}
