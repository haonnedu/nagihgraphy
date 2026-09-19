-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FeatureStatus" AS ENUM ('IN', 'EXTRA', 'NO');

-- CreateEnum
CREATE TYPE "Half" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('OPEN', 'BUSY', 'OFF');

-- CreateEnum
CREATE TYPE "ShootType" AS ENUM ('FULL_DAY', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'DEPOSITED', 'CONFIRMED', 'DONE', 'LOST');

-- CreateEnum
CREATE TYPE "LeadChannel" AS ENUM ('ZALO', 'INSTAGRAM', 'FACEBOOK', 'PHONE', 'SMS', 'FORM', 'MANUAL');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'SALE', 'VIEWER');

-- CreateTable
CREATE TABLE "tiers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "hiddenInTable" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_prices" (
    "id" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "people" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "group_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photographers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "style" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "priceOverride" INTEGER NOT NULL DEFAULT 0,
    "driveUrl" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photographers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "photographerId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "blurHash" TEXT NOT NULL DEFAULT '',
    "alt" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shortLabel" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photographer_features" (
    "photographerId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "status" "FeatureStatus" NOT NULL DEFAULT 'NO',

    CONSTRAINT "photographer_features_pkey" PRIMARY KEY ("photographerId","featureId")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photographer_tags" (
    "photographerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "photographer_tags_pkey" PRIMARY KEY ("photographerId","tagId")
);

-- CreateTable
CREATE TABLE "travel_zones" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minFee" INTEGER NOT NULL DEFAULT 0,
    "maxFee" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "travel_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability" (
    "id" TEXT NOT NULL,
    "photographerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "half" "Half" NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "photographerId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "zalo" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "shootDate" DATE,
    "shootType" "ShootType" NOT NULL DEFAULT 'FULL_DAY',
    "people" INTEGER NOT NULL DEFAULT 1,
    "travelZoneId" TEXT,
    "placeDetail" TEXT NOT NULL DEFAULT '',
    "concept" TEXT NOT NULL DEFAULT '',
    "eveningAddon" BOOLEAN NOT NULL DEFAULT false,
    "quotedBase" INTEGER NOT NULL DEFAULT 0,
    "quotedTravel" INTEGER NOT NULL DEFAULT 0,
    "quotedTotal" INTEGER NOT NULL DEFAULT 0,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "channel" "LeadChannel" NOT NULL DEFAULT 'FORM',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "referrer" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" "LeadStatus",
    "toStatus" "LeadStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tiers_slug_key" ON "tiers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "group_prices_tierId_people_key" ON "group_prices"("tierId", "people");

-- CreateIndex
CREATE UNIQUE INDEX "photographers_slug_key" ON "photographers"("slug");

-- CreateIndex
CREATE INDEX "photographers_published_order_idx" ON "photographers"("published", "order");

-- CreateIndex
CREATE INDEX "photographers_city_idx" ON "photographers"("city");

-- CreateIndex
CREATE INDEX "photos_photographerId_order_idx" ON "photos"("photographerId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "features_key_key" ON "features"("key");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "travel_zones_slug_key" ON "travel_zones"("slug");

-- CreateIndex
CREATE INDEX "availability_date_status_idx" ON "availability"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "availability_photographerId_date_half_key" ON "availability"("photographerId", "date", "half");

-- CreateIndex
CREATE UNIQUE INDEX "leads_code_key" ON "leads"("code");

-- CreateIndex
CREATE INDEX "leads_status_createdAt_idx" ON "leads"("status", "createdAt");

-- CreateIndex
CREATE INDEX "leads_shootDate_idx" ON "leads"("shootDate");

-- CreateIndex
CREATE INDEX "lead_events_leadId_createdAt_idx" ON "lead_events"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "group_prices" ADD CONSTRAINT "group_prices_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photographers" ADD CONSTRAINT "photographers_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "photographers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photographer_features" ADD CONSTRAINT "photographer_features_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "photographers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photographer_features" ADD CONSTRAINT "photographer_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photographer_tags" ADD CONSTRAINT "photographer_tags_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "photographers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photographer_tags" ADD CONSTRAINT "photographer_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "availability_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "photographers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "photographers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_travelZoneId_fkey" FOREIGN KEY ("travelZoneId") REFERENCES "travel_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

