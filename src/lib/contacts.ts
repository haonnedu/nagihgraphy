/**
 * Kênh liên hệ. Không có sale: khách nhắn thẳng cho thợ, nên mỗi thợ có
 * Zalo, Messenger, Instagram, số điện thoại riêng. Trống thì rơi về liên hệ
 * chung của studio để nút không bao giờ biến mất.
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

export const EMPTY_CONTACTS: Contacts = { zalo: "", phone: "", facebook: "", instagram: "" };

/** Từng kênh: thợ có thì lấy của thợ, không thì lấy của studio. */
export function mergeContacts(own: Partial<Contacts> | null | undefined, fallback: Contacts): Contacts {
  return {
    zalo: own?.zalo || fallback.zalo,
    phone: own?.phone || fallback.phone,
    facebook: own?.facebook || fallback.facebook,
    instagram: own?.instagram || fallback.instagram,
    tiktok: own?.tiktok || fallback.tiktok || "",
  };
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
