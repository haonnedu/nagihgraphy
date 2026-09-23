/**
 * Kênh liên hệ chung của studio. Từ 2026-09-23 không còn kênh riêng theo thợ:
 * khách nhắn về studio hoặc chọn một tài khoản Instagram tư vấn trong popup.
 *
 * File này không import server, để client component dùng chung được.
 */

export type Contacts = {
  zalo: string;
  phone: string;
  facebook: string;
  instagram: string;
  tiktok?: string;
};

export type ContactLink = { key: string; label: string; href: string };

export type InstagramAccount = { label: string; url: string };

/**
 * Tài khoản Instagram tư vấn, khách chọn một trong popup ở form đặt lịch.
 * Là giá trị mặc định khi site_settings.contacts chưa có instagramAccounts;
 * đổi trong database là đổi được, không cần sửa code.
 */
export const DEFAULT_INSTAGRAM_ACCOUNTS: InstagramAccount[] = [
  { label: "NAGIH GRAPHY", url: "https://www.instagram.com/nagih.graphy/" },
  { label: "Trà My", url: "https://www.instagram.com/tramy.nagih/" },
  { label: "Ngọc Trinh", url: "https://www.instagram.com/nngoctrinhsale.nagih/" },
  { label: "Mita", url: "https://www.instagram.com/mitasale.nagih/" },
];

/** "https://www.instagram.com/tramy.nagih/" -> "@tramy.nagih" */
export function instagramHandle(url: string): string {
  const m = /instagram\.com\/([^/?#]+)/i.exec(url);
  return m ? `@${m[1]}` : url;
}

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Danh sách nút đã lọc bỏ link rỗng và link không phải https/tel. */
export function contactLinks(contacts: Contacts): ContactLink[] {
  const raw: ContactLink[] = [];

  if (contacts.zalo) {
    raw.push({ key: "zalo", label: "Zalo", href: `https://zalo.me/${digitsOnly(contacts.zalo)}` });
  }
  if (contacts.facebook) {
    raw.push({ key: "facebook", label: "Messenger", href: contacts.facebook });
  }
  if (contacts.instagram) {
    raw.push({ key: "instagram", label: "Instagram", href: contacts.instagram });
  }
  if (contacts.tiktok) {
    raw.push({ key: "tiktok", label: "TikTok", href: contacts.tiktok });
  }
  if (contacts.phone) {
    raw.push({
      key: "phone",
      label: `Gọi ${contacts.phone}`,
      href: `tel:${contacts.phone.replace(/[^\d+]/g, "")}`,
    });
  }

  return raw.filter((c) => /^(https:\/\/[^\s"<>]+|tel:[\d+]+)$/i.test(c.href));
}
