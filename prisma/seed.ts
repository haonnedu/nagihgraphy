import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { FeatureStatus } from "../src/generated/prisma/enums";
import { photographerDir, processImage } from "../src/lib/images";
import { slugify, uniqueSlug } from "../src/lib/slug";

/**
 * Seed dữ liệu thật trích từ bản artifact của khách (seed-data.json).
 * Chạy lại nhiều lần được: mọi thứ dùng upsert theo slug/key.
 *
 * Ảnh: đọc từ seed-assets/, chạy qua sharp, ghi vào UPLOAD_DIR.
 * Đặt SEED_SKIP_PHOTOS=1 để bỏ qua bước ảnh khi chỉ muốn làm mới dữ liệu chữ.
 */

type RawStudio = {
  name: string;
  logo: string;
  kicker: string;
  pageTitle: string;
  headline: string;
  intro: string;
  priceNote: string;
  cities: string[];
  contacts: Record<string, string>;
  bookingLead: string;
  steps: { title: string; text: string }[];
  maxPeople: number;
};

type RawTier = {
  id: string;
  name: string;
  price: number;
  note: string;
  group: number[];
  hideInTable?: boolean;
};

type RawPhotographer = {
  id: string;
  name: string;
  tier: string;
  city: string;
  style: string;
  rating: number;
  sessions: number;
  tags: string[];
  features: Record<string, string>;
  photos: string[];
  price: number;
  availableOn: string;
  hidden?: boolean;
  sample?: boolean;
  drive: string;
};

type RawData = {
  studio: RawStudio;
  tags: string[];
  features: { key: string; label: string; short?: string }[];
  tiers: RawTier[];
  photographers: RawPhotographer[];
  travel: {
    note: string;
    rows: { name: string; min: number; max: number; note: string }[];
    policies: string[];
  };
};

const FEATURE_STATUS: Record<string, FeatureStatus> = {
  in: "IN",
  extra: "EXTRA",
  no: "NO",
};

function client() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Thiếu DATABASE_URL trong .env");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function main() {
  const db = client();
  const root = process.cwd();
  const raw: RawData = JSON.parse(await readFile(path.join(root, "seed-data.json"), "utf8"));
  const skipPhotos = process.env.SEED_SKIP_PHOTOS === "1";

  // ---------------------------------------------------------------- logo
  let logoStem = "";
  if (raw.studio.logo && !skipPhotos) {
    const buf = await readFile(path.join(root, raw.studio.logo));
    logoStem = (await processImage(buf, { dir: "brand", id: "logo" })).stem;
  } else {
    // Bỏ qua bước ảnh thì giữ nguyên logo đã có, đừng xoá mất.
    const existing = await db.siteSetting.findUnique({ where: { key: "studio" } });
    const value = existing?.value as { logo?: string } | null;
    logoStem = value?.logo ?? "";
  }

  // ---------------------------------------------------------------- settings
  const settings: Record<string, unknown> = {
    studio: {
      name: raw.studio.name,
      logo: logoStem,
      kicker: raw.studio.kicker,
      pageTitle: raw.studio.pageTitle,
      headline: raw.studio.headline,
      intro: raw.studio.intro,
      priceNote: raw.studio.priceNote,
      cities: raw.studio.cities,
      maxPeople: raw.studio.maxPeople,
    },
    contacts: raw.studio.contacts,
    booking: { lead: raw.studio.bookingLead, steps: raw.studio.steps },
    travel: { note: raw.travel.note },
    /// phụ phí chụp thêm buổi tối đến 20h, lấy từ chính sách bản cũ
    pricing: { eveningAddon: 500_000 },
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.siteSetting.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });
  }
  console.log(`settings: ${Object.keys(settings).length}`);

  // ---------------------------------------------------------------- tiers
  const tierBySlug = new Map<string, string>();
  for (const [i, t] of raw.tiers.entries()) {
    const row = await db.tier.upsert({
      where: { slug: t.id },
      update: {
        name: t.name,
        basePrice: t.price,
        note: t.note,
        hiddenInTable: Boolean(t.hideInTable),
        order: i,
      },
      create: {
        slug: t.id,
        name: t.name,
        basePrice: t.price,
        note: t.note,
        hiddenInTable: Boolean(t.hideInTable),
        order: i,
      },
    });
    tierBySlug.set(t.id, row.id);

    // group[] trong bản cũ là giá cho 2..n người, index 0 ứng với 2 người
    for (const [gi, price] of (t.group ?? []).entries()) {
      if (!price) continue;
      const people = gi + 2;
      await db.groupPrice.upsert({
        where: { tierId_people: { tierId: row.id, people } },
        update: { price },
        create: { tierId: row.id, people, price },
      });
    }
  }
  console.log(`tiers: ${tierBySlug.size}`);

  // ---------------------------------------------------------------- features
  const featureByKey = new Map<string, string>();
  for (const [i, f] of raw.features.entries()) {
    const row = await db.feature.upsert({
      where: { key: f.key },
      update: { label: f.label, shortLabel: f.short ?? "", order: i },
      create: { key: f.key, label: f.label, shortLabel: f.short ?? "", order: i },
    });
    featureByKey.set(f.key, row.id);
  }
  console.log(`features: ${featureByKey.size}`);

  // ---------------------------------------------------------------- tags
  // Gồm cả tag chỉ xuất hiện trên thợ (VD "Nhận đi tỉnh") chứ không có trong danh sách chung.
  const allTagNames = [...new Set([...raw.tags, ...raw.photographers.flatMap((p) => p.tags)])];
  const tagByName = new Map<string, string>();
  for (const [i, name] of allTagNames.entries()) {
    const row = await db.tag.upsert({
      where: { slug: slugify(name) },
      update: { name, order: i },
      create: { slug: slugify(name), name, order: i },
    });
    tagByName.set(name, row.id);
  }
  console.log(`tags: ${tagByName.size}`);

  // ---------------------------------------------------------------- travel
  const zoneSlugs = new Set<string>();
  for (const [i, r] of raw.travel.rows.entries()) {
    const slug = uniqueSlug(r.name, zoneSlugs);
    await db.travelZone.upsert({
      where: { slug },
      update: { name: r.name, minFee: r.min, maxFee: r.max, note: r.note, order: i },
      create: { slug, name: r.name, minFee: r.min, maxFee: r.max, note: r.note, order: i },
    });
  }
  await db.policy.deleteMany({});
  await db.policy.createMany({
    data: raw.travel.policies.map((text, order) => ({ text, order })),
  });
  console.log(`travel zones: ${zoneSlugs.size}, policies: ${raw.travel.policies.length}`);

  // ---------------------------------------------------------------- photographers
  const photographerSlugs = new Set<string>();
  let photoCount = 0;
  let availabilityCount = 0;

  for (const [i, p] of raw.photographers.entries()) {
    const tierId = tierBySlug.get(p.tier);
    if (!tierId) throw new Error(`Thợ ${p.name} trỏ tới hạng không tồn tại: ${p.tier}`);
    const slug = uniqueSlug(p.name, photographerSlugs);

    const data = {
      name: p.name,
      tierId,
      city: p.city,
      style: p.style,
      rating: p.rating,
      sessions: p.sessions,
      priceOverride: p.price || 0,
      driveUrl: p.drive || "",
      published: !p.hidden,
      isSample: Boolean(p.sample),
      order: i,
    };
    const row = await db.photographer.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data },
    });

    await db.photographerTag.deleteMany({ where: { photographerId: row.id } });
    await db.photographerTag.createMany({
      data: p.tags
        .map((name) => tagByName.get(name))
        .filter((id): id is string => Boolean(id))
        .map((tagId) => ({ photographerId: row.id, tagId })),
    });

    await db.photographerFeature.deleteMany({ where: { photographerId: row.id } });
    await db.photographerFeature.createMany({
      data: Object.entries(p.features)
        .map(([key, value]) => {
          const featureId = featureByKey.get(key);
          if (!featureId) return null;
          return {
            photographerId: row.id,
            featureId,
            status: FEATURE_STATUS[value] ?? "NO",
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    });

    // Bản cũ chỉ có một cờ "còn lịch ngày X". Dịch thành hai ô trống cả ngày.
    // Lịch thật do admin tự cập nhật trong dashboard.
    if (/^\d{4}-\d{2}-\d{2}$/.test(p.availableOn || "")) {
      const date = new Date(`${p.availableOn}T00:00:00Z`);
      for (const half of ["MORNING", "AFTERNOON"] as const) {
        await db.availability.upsert({
          where: { photographerId_date_half: { photographerId: row.id, date, half } },
          update: { status: "OPEN" },
          create: { photographerId: row.id, date, half, status: "OPEN" },
        });
      }
      availabilityCount += 2;
    }

    if (!skipPhotos) {
      await db.photo.deleteMany({ where: { photographerId: row.id } });
      for (const [pi, rel] of p.photos.entries()) {
        const buf = await readFile(path.join(root, rel));
        const processed = await processImage(buf, {
          dir: photographerDir(row.id),
          id: `${slug}-${pi + 1}`,
        });
        await db.photo.create({
          data: {
            photographerId: row.id,
            path: processed.stem,
            width: processed.width,
            height: processed.height,
            alt: `Ảnh portfolio của ${p.name}`,
            order: pi,
          },
        });
        photoCount += 1;
      }
    }
  }
  console.log(
    `photographers: ${photographerSlugs.size}` +
      (skipPhotos ? " (bỏ qua ảnh)" : `, photos: ${photoCount}`) +
      `, ô lịch: ${availabilityCount}`,
  );

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
