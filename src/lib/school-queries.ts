import "server-only";
import { db } from "@/lib/db";
import { priceOf } from "@/lib/pricing";
import { MAX_PENDING_PER_PHOTOGRAPHER, angleKey, shareWarningFrom } from "@/lib/school-shared";
import type { SchoolStatus, ShotKind, SubmissionStatus } from "@/generated/prisma/enums";

/**
 * Truy vấn đọc của Chọn trường. Trang khách chỉ đọc school_photos (ảnh đã duyệt)
 * của Photo đang hiện; bài nộp chờ duyệt không bao giờ đi ra trang khách.
 * Xem docs/chon-truong.md mục 3.
 */

type Stem = { stem: string; width: number; height: number };

// ---------------------------------------------------------------- trang khách

export type PublicSchoolCard = {
  id: string;
  slug: string;
  name: string;
  short: string;
  city: string;
  status: SchoolStatus;
  /** ảnh bìa; null khi trường chưa có ảnh nào */
  cover: Stem | null;
  photoCount: number;
  photographerCount: number;
};

export type PublicSchoolList = {
  /** hiện ở lưới chính */
  live: PublicSchoolCard[];
  /** "Sắp có ảnh", dồn xuống khu riêng, card không bấm vào được */
  soon: PublicSchoolCard[];
  /** thành phố lấy từ dữ liệu, không hard-code */
  cities: string[];
};

/** Chỉ ảnh của Photo đang hiện trên site mới lên trang khách. */
const visiblePhoto = { photographer: { published: true } } as const;

export async function listSchoolsPublic(): Promise<PublicSchoolList> {
  const [schools, groups] = await Promise.all([
    db.school.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        short: true,
        city: true,
        status: true,
        cover: { select: { path: true, width: true, height: true, photographer: { select: { published: true } } } },
      },
    }),
    db.schoolPhoto.groupBy({
      by: ["schoolId", "photographerId"],
      where: visiblePhoto,
      _count: { _all: true },
    }),
  ]);

  const photoCount = new Map<string, number>();
  const photographerCount = new Map<string, number>();
  for (const g of groups) {
    photoCount.set(g.schoolId, (photoCount.get(g.schoolId) ?? 0) + g._count._all);
    photographerCount.set(g.schoolId, (photographerCount.get(g.schoolId) ?? 0) + 1);
  }

  // Bìa trỏ vào ảnh của Photo đang ẩn thì lấy ảnh đầu tiên còn hiện của trường.
  const needFallback = schools
    .filter((s) => (!s.cover || !s.cover.photographer.published) && (photoCount.get(s.id) ?? 0) > 0)
    .map((s) => s.id);
  const fallback = new Map<string, Stem>();
  if (needFallback.length) {
    const rows = await db.schoolPhoto.findMany({
      where: { schoolId: { in: needFallback }, ...visiblePhoto },
      orderBy: [{ sortOrder: "asc" }, { approvedAt: "asc" }],
      select: { schoolId: true, path: true, width: true, height: true },
    });
    for (const r of rows) {
      if (!fallback.has(r.schoolId)) fallback.set(r.schoolId, { stem: r.path, width: r.width, height: r.height });
    }
  }

  const cards: PublicSchoolCard[] = schools.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    short: s.short,
    city: s.city,
    status: s.status,
    cover:
      s.cover && s.cover.photographer.published
        ? { stem: s.cover.path, width: s.cover.width, height: s.cover.height }
        : (fallback.get(s.id) ?? null),
    photoCount: photoCount.get(s.id) ?? 0,
    photographerCount: photographerCount.get(s.id) ?? 0,
  }));

  const cities = [...new Set(cards.map((c) => c.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  return {
    live: cards.filter((c) => c.status === "LIVE"),
    soon: cards.filter((c) => c.status === "SOON"),
    cities,
  };
}

export type PublicSchoolPhotographer = {
  slug: string;
  name: string;
  /** tên hạng: Ekip 1/2/3… */
  tierName: string;
  /** giá khởi điểm nửa ngày 1 người, 0 = Liên hệ (dùng money() để hiện) */
  priceFrom: number;
  /** ảnh portfolio đầu tiên làm avatar, null nếu chưa có */
  avatar: string | null;
};

export type PublicSchoolPhoto = Stem & {
  id: string;
  angle: { id: string; name: string };
  /** khoá vào PublicSchoolDetail.photographers */
  photographerSlug: string;
  year: number;
  kind: ShotKind;
  note: string;
};

export type PublicSchoolDetail = {
  id: string;
  slug: string;
  name: string;
  short: string;
  city: string;
  intro: string;
  status: SchoolStatus;
  cover: Stem | null;
  /** ảnh đã duyệt, theo thứ tự QC xếp */
  photos: PublicSchoolPhoto[];
  /** Photo có ảnh ở trường này, theo slug */
  photographers: Record<string, PublicSchoolPhotographer>;
  /** góc có ảnh, nhiều ảnh trước */
  angles: { id: string; name: string; count: number }[];
  /** năm có ảnh, mới nhất trước */
  years: number[];
  /** kiểu chụp có ảnh */
  kinds: ShotKind[];
  /** X ảnh · Y góc · Z Photo */
  stats: { photos: number; angles: number; photographers: number };
  /** lần cuối có thay đổi, cho sitemap và metadata */
  updatedAt: Date;
};

/** Một trường cho trang /truong/[slug]. null khi không có slug này. */
export async function getSchoolPublic(slug: string): Promise<PublicSchoolDetail | null> {
  const school = await db.school.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      short: true,
      city: true,
      intro: true,
      status: true,
      updatedAt: true,
      coverPhotoId: true,
      photos: {
        where: visiblePhoto,
        orderBy: [{ sortOrder: "asc" }, { approvedAt: "asc" }],
        select: {
          id: true,
          path: true,
          width: true,
          height: true,
          year: true,
          kind: true,
          note: true,
          approvedAt: true,
          angle: { select: { id: true, name: true } },
          photographer: {
            select: {
              slug: true,
              name: true,
              priceOverride: true,
              tier: { select: { name: true, basePrice: true } },
              photos: { select: { path: true }, orderBy: { order: "asc" }, take: 1 },
            },
          },
        },
      },
    },
  });
  if (!school) return null;

  const photographers: Record<string, PublicSchoolPhotographer> = {};
  const angleCount = new Map<string, { id: string; name: string; count: number }>();
  const years = new Set<number>();
  const kinds = new Set<ShotKind>();
  let updatedAt = school.updatedAt;

  const photos: PublicSchoolPhoto[] = school.photos.map((p) => {
    const ph = p.photographer;
    if (!photographers[ph.slug]) {
      photographers[ph.slug] = {
        slug: ph.slug,
        name: ph.name,
        tierName: ph.tier.name,
        priceFrom: priceOf({ priceOverride: ph.priceOverride, tier: { basePrice: ph.tier.basePrice, fullDayPrice: 0, groupPrices: [] } }),
        avatar: ph.photos[0]?.path ?? null,
      };
    }
    const a = angleCount.get(p.angle.id) ?? { ...p.angle, count: 0 };
    a.count += 1;
    angleCount.set(p.angle.id, a);
    years.add(p.year);
    kinds.add(p.kind);
    if (p.approvedAt > updatedAt) updatedAt = p.approvedAt;
    return {
      id: p.id,
      stem: p.path,
      width: p.width,
      height: p.height,
      angle: p.angle,
      photographerSlug: ph.slug,
      year: p.year,
      kind: p.kind,
      note: p.note,
    };
  });

  const coverPhoto = photos.find((p) => p.id === school.coverPhotoId) ?? photos[0] ?? null;
  const angles = [...angleCount.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));

  return {
    id: school.id,
    slug: school.slug,
    name: school.name,
    short: school.short,
    city: school.city,
    intro: school.intro,
    status: school.status,
    cover: coverPhoto ? { stem: coverPhoto.stem, width: coverPhoto.width, height: coverPhoto.height } : null,
    photos,
    photographers,
    angles,
    years: [...years].sort((a, b) => b - a),
    kinds: (["INDIVIDUAL", "GROUP"] as const).filter((k) => kinds.has(k)),
    stats: { photos: photos.length, angles: angles.length, photographers: Object.keys(photographers).length },
    updatedAt,
  };
}

/** Slug mọi trường, cho generateStaticParams. */
export async function listSchoolSlugs(): Promise<string[]> {
  const rows = await db.school.findMany({ select: { slug: true } });
  return rows.map((r) => r.slug);
}

/** Trường đang hiện (LIVE) cho sitemap, kèm lần cuối có ảnh mới hoặc sửa thông tin. */
export async function listSchoolsForSitemap(): Promise<{ slug: string; lastModified: Date }[]> {
  const [schools, latest] = await Promise.all([
    db.school.findMany({ where: { status: "LIVE" }, orderBy: { order: "asc" }, select: { id: true, slug: true, updatedAt: true } }),
    db.schoolPhoto.groupBy({ by: ["schoolId"], _max: { approvedAt: true } }),
  ]);
  const last = new Map(latest.map((l) => [l.schoolId, l._max.approvedAt]));
  return schools.map((s) => {
    const a = last.get(s.id);
    return { slug: s.slug, lastModified: a && a > s.updatedAt ? a : s.updatedAt };
  });
}

// ---------------------------------------------------------------- form nộp ảnh và chọn góc

export type SchoolOption = {
  id: string;
  name: string;
  short: string;
  city: string;
  angles: { id: string; name: string }[];
};

/** Mọi trường kèm danh mục góc, cho ô chọn trường/góc ở form nộp và gợi ý góc của QC. */
export async function listSchoolOptions(): Promise<SchoolOption[]> {
  return db.school.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      short: true,
      city: true,
      angles: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });
}

// ---------------------------------------------------------------- khu của Photo

export type OwnSubmission = Stem & {
  id: string;
  status: SubmissionStatus;
  school: { id: string; name: string; short: string; slug: string };
  angleId: string | null;
  /** tên góc chuẩn nếu có, không thì chữ Photo đã gõ */
  angleName: string;
  angleText: string;
  year: number;
  kind: ShotKind;
  note: string;
  rejectReason: string;
  createdAt: Date;
  reviewedAt: Date | null;
};

export type PhotographerSchoolDashboard = {
  /** ảnh đã lên web */
  approved: number;
  /** ảnh đang chờ duyệt */
  pending: number;
  /** tổng lượt khách mở ảnh của mình */
  views: number;
  /** tổng lượt khách bấm Đặt từ ảnh của mình */
  bookClicks: number;
  /** giới hạn để giao diện báo trước, server vẫn chặn riêng */
  maxPending: number;
  /** chờ duyệt + bị trả lại (tất cả) và đã duyệt gần đây (tối đa 30), mới nhất trước */
  submissions: OwnSubmission[];
};

/**
 * Bốn số và danh sách ảnh đã nộp của MỘT Photo. Luôn truyền id lấy từ phiên
 * (user.photographerId), không bao giờ từ URL.
 */
export async function getPhotographerSchoolDashboard(photographerId: string): Promise<PhotographerSchoolDashboard> {
  const select = {
    id: true,
    status: true,
    path: true,
    width: true,
    height: true,
    angleId: true,
    angleText: true,
    year: true,
    kind: true,
    note: true,
    rejectReason: true,
    createdAt: true,
    reviewedAt: true,
    school: { select: { id: true, name: true, short: true, slug: true } },
    angle: { select: { name: true } },
  } as const;

  const [approved, pending, stats, open, recent] = await Promise.all([
    db.schoolPhoto.count({ where: { photographerId } }),
    db.photoSubmission.count({ where: { photographerId, status: "PENDING" } }),
    db.photographerStat.aggregate({ where: { photographerId }, _sum: { views: true, bookClicks: true } }),
    db.photoSubmission.findMany({
      where: { photographerId, status: { in: ["PENDING", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      select,
    }),
    db.photoSubmission.findMany({
      where: { photographerId, status: "APPROVED" },
      orderBy: { reviewedAt: "desc" },
      take: 30,
      select,
    }),
  ]);

  return {
    approved,
    pending,
    views: stats._sum.views ?? 0,
    bookClicks: stats._sum.bookClicks ?? 0,
    maxPending: MAX_PENDING_PER_PHOTOGRAPHER,
    submissions: [...open, ...recent].map((s) => ({
      id: s.id,
      status: s.status,
      stem: s.path,
      width: s.width,
      height: s.height,
      school: s.school,
      angleId: s.angleId,
      angleName: s.angle?.name ?? s.angleText,
      angleText: s.angleText,
      year: s.year,
      kind: s.kind,
      note: s.note,
      rejectReason: s.rejectReason,
      createdAt: s.createdAt,
      reviewedAt: s.reviewedAt,
    })),
  };
}

// ---------------------------------------------------------------- khu QC

export type PendingItem = Stem & {
  id: string;
  school: { id: string; name: string; short: string; slug: string };
  photographer: { id: string; name: string; slug: string };
  /** góc Photo chọn từ danh mục, null nếu Photo gõ góc mới */
  angle: { id: string; name: string } | null;
  angleText: string;
  /** góc chuẩn trùng (không dấu) với chữ Photo gõ, để điền sẵn ô góc */
  suggestedAngleId: string | null;
  year: number;
  kind: ShotKind;
  note: string;
  createdAt: Date;
  /** cảnh báo luật 40% nếu duyệt ảnh này, tính trước khi QC bấm */
  warning: string | null;
};

export type PendingQueue = {
  /** cũ nhất trước */
  items: PendingItem[];
  /** danh mục góc của các trường có trong hàng đợi, cho ô gợi ý tên góc */
  anglesBySchool: Record<string, { id: string; name: string }[]>;
};

export async function listPendingSubmissions(): Promise<PendingQueue> {
  const rows = await db.photoSubmission.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      path: true,
      width: true,
      height: true,
      angleText: true,
      year: true,
      kind: true,
      note: true,
      createdAt: true,
      school: { select: { id: true, name: true, short: true, slug: true } },
      photographer: { select: { id: true, name: true, slug: true } },
      angle: { select: { id: true, name: true } },
    },
  });

  const schoolIds = [...new Set(rows.map((r) => r.school.id))];
  const [angles, counts] = await Promise.all([
    db.schoolAngle.findMany({
      where: { schoolId: { in: schoolIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, schoolId: true },
    }),
    db.schoolPhoto.groupBy({
      by: ["schoolId", "photographerId"],
      where: { schoolId: { in: schoolIds } },
      _count: { _all: true },
    }),
  ]);

  const anglesBySchool: Record<string, { id: string; name: string }[]> = {};
  for (const id of schoolIds) anglesBySchool[id] = [];
  for (const a of angles) anglesBySchool[a.schoolId].push({ id: a.id, name: a.name });

  const total = new Map<string, number>();
  const mine = new Map<string, number>();
  for (const c of counts) {
    total.set(c.schoolId, (total.get(c.schoolId) ?? 0) + c._count._all);
    mine.set(`${c.schoolId}:${c.photographerId}`, c._count._all);
  }

  const items = rows.map((r) => {
    const suggested = r.angle
      ? r.angle.id
      : (anglesBySchool[r.school.id].find((a) => angleKey(a.name) === angleKey(r.angleText))?.id ?? null);
    return {
      id: r.id,
      stem: r.path,
      width: r.width,
      height: r.height,
      school: r.school,
      photographer: r.photographer,
      angle: r.angle,
      angleText: r.angleText,
      suggestedAngleId: suggested,
      year: r.year,
      kind: r.kind,
      note: r.note,
      createdAt: r.createdAt,
      warning: shareWarningFrom(
        r.photographer.name,
        mine.get(`${r.school.id}:${r.photographer.id}`) ?? 0,
        total.get(r.school.id) ?? 0,
      ),
    };
  });
  return { items, anglesBySchool };
}

export type AdminSchoolRow = {
  id: string;
  slug: string;
  name: string;
  short: string;
  city: string;
  status: SchoolStatus;
  order: number;
  cover: Stem | null;
  photoCount: number;
  pendingCount: number;
  angleCount: number;
};

export async function listSchoolsAdmin(): Promise<AdminSchoolRow[]> {
  const rows = await db.school.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      short: true,
      city: true,
      status: true,
      order: true,
      cover: { select: { path: true, width: true, height: true } },
      _count: { select: { photos: true, angles: true, submissions: { where: { status: "PENDING" } } } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    short: s.short,
    city: s.city,
    status: s.status,
    order: s.order,
    cover: s.cover ? { stem: s.cover.path, width: s.cover.width, height: s.cover.height } : null,
    photoCount: s._count.photos,
    pendingCount: s._count.submissions,
    angleCount: s._count.angles,
  }));
}

export type AdminSchoolDetail = {
  id: string;
  slug: string;
  name: string;
  short: string;
  city: string;
  intro: string;
  status: SchoolStatus;
  order: number;
  coverPhotoId: string | null;
  /** danh mục góc, kèm số ảnh đã duyệt và số bài nộp đang chờ dùng góc đó (kể cả bài gõ chữ trùng tên) */
  angles: { id: string; name: string; photoCount: number; pendingCount: number }[];
  /** ảnh đã lên web, theo thứ tự hiện */
  photos: (Stem & {
    id: string;
    angle: { id: string; name: string };
    photographer: { id: string; name: string; slug: string; published: boolean };
    year: number;
    kind: ShotKind;
    note: string;
    sortOrder: number;
    approvedAt: Date;
    approvedBy: string;
    consentAt: Date | null;
    consentBy: string;
    isCover: boolean;
  })[];
};

export async function getSchoolAdmin(id: string): Promise<AdminSchoolDetail | null> {
  const s = await db.school.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      short: true,
      city: true,
      intro: true,
      status: true,
      order: true,
      coverPhotoId: true,
      angles: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { photos: true, submissions: { where: { status: "PENDING" } } } },
        },
      },
      photos: {
        orderBy: [{ sortOrder: "asc" }, { approvedAt: "asc" }],
        select: {
          id: true,
          path: true,
          width: true,
          height: true,
          year: true,
          kind: true,
          note: true,
          sortOrder: true,
          approvedAt: true,
          consentAt: true,
          angle: { select: { id: true, name: true } },
          photographer: { select: { id: true, name: true, slug: true, published: true } },
          approvedBy: { select: { name: true, email: true } },
          consentBy: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!s) return null;

  // Bài chờ duyệt mà Photo gõ góc dạng chữ cũng tính vào góc chuẩn trùng tên (không dấu),
  // vì lúc duyệt service sẽ gắn chúng vào đúng góc đó.
  const typed = await db.photoSubmission.findMany({
    where: { schoolId: id, status: "PENDING", angleId: null },
    select: { angleText: true },
  });
  const typedCount = new Map<string, number>();
  for (const t of typed) {
    const k = angleKey(t.angleText);
    if (k) typedCount.set(k, (typedCount.get(k) ?? 0) + 1);
  }

  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    short: s.short,
    city: s.city,
    intro: s.intro,
    status: s.status,
    order: s.order,
    coverPhotoId: s.coverPhotoId,
    angles: s.angles.map((a) => ({
      id: a.id,
      name: a.name,
      photoCount: a._count.photos,
      pendingCount: a._count.submissions + (typedCount.get(angleKey(a.name)) ?? 0),
    })),
    photos: s.photos.map((p) => ({
      id: p.id,
      stem: p.path,
      width: p.width,
      height: p.height,
      angle: p.angle,
      photographer: p.photographer,
      year: p.year,
      kind: p.kind,
      note: p.note,
      sortOrder: p.sortOrder,
      approvedAt: p.approvedAt,
      approvedBy: p.approvedBy ? p.approvedBy.name || p.approvedBy.email : "",
      consentAt: p.consentAt,
      consentBy: p.consentBy ? p.consentBy.name || p.consentBy.email : "",
      isCover: p.id === s.coverPhotoId,
    })),
  };
}
