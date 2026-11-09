-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "BrandStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TryOnStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "BrandMemberRole" AS ENUM ('OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gender" "Gender",

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "height" DECIMAL(5,2),
    "weight" DECIMAL(5,2),
    "chest" DECIMAL(5,2),
    "waist" DECIMAL(5,2),
    "hips" DECIMAL(5,2),
    "recorded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image" (
    "id" TEXT NOT NULL,
    "body_id" TEXT NOT NULL,
    "s3" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "quality_status" TEXT,
    "uploaded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "granted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(6),

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "color" TEXT,
    "style" TEXT,
    "image_url" TEXT NOT NULL,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "clothings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "email" TEXT,
    "phone_number" TEXT,
    "store_url" TEXT,
    "slug" TEXT,
    "ebiz_reg_no" TEXT,
    "ebiz_registration" TEXT,
    "status" "BrandStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_size_charts" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "chest" DECIMAL(5,2),
    "waist" DECIMAL(5,2),
    "hips" DECIMAL(5,2),
    "length" DECIMAL(5,2),

    CONSTRAINT "product_size_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_members" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "BrandMemberRole" NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_invites" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "BrandMemberRole" NOT NULL DEFAULT 'OWNER',
    "token_hash" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_customers" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "try_on_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "brand_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "try_on_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "brand_id" TEXT NOT NULL,
    "product_id" TEXT,
    "model_id" TEXT,
    "status" "TryOnStatus" NOT NULL,
    "error_code" TEXT,
    "cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "try_on_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_clicks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "brand_id" TEXT NOT NULL,
    "product_id" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "try_on_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender",
    "body_type" TEXT NOT NULL,
    "height" DECIMAL(5,2) NOT NULL,
    "image_url" TEXT NOT NULL,
    "supported_sizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_selectable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "try_on_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_type" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body_type" TEXT NOT NULL,
    "description" TEXT,
    "analyzed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "image_body_id_angle_key" ON "image"("body_id", "angle");

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_user_id_type_key" ON "user_consents"("user_id", "type");

-- CreateIndex
CREATE INDEX "clothings_user_id_idx" ON "clothings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_brand_name_key" ON "brands"("brand_name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_email_key" ON "brands"("email");

-- CreateIndex
CREATE UNIQUE INDEX "brands_store_url_key" ON "brands"("store_url");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_status_idx" ON "brands"("status");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE UNIQUE INDEX "product_size_charts_product_id_size_key" ON "product_size_charts"("product_id", "size");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE INDEX "brand_members_user_id_idx" ON "brand_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_members_brand_id_user_id_key" ON "brand_members"("brand_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_invites_token_hash_key" ON "brand_invites"("token_hash");

-- CreateIndex
CREATE INDEX "brand_invites_brand_id_status_idx" ON "brand_invites"("brand_id", "status");

-- CreateIndex
CREATE INDEX "brand_invites_email_idx" ON "brand_invites"("email");

-- CreateIndex
CREATE INDEX "brand_customers_brand_id_last_seen_at_idx" ON "brand_customers"("brand_id", "last_seen_at");

-- CreateIndex
CREATE INDEX "brand_customers_brand_id_first_seen_at_idx" ON "brand_customers"("brand_id", "first_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "brand_customers_brand_id_user_id_key" ON "brand_customers"("brand_id", "user_id");

-- CreateIndex
CREATE INDEX "try_on_logs_brand_id_created_at_idx" ON "try_on_logs"("brand_id", "created_at");

-- CreateIndex
CREATE INDEX "try_on_logs_user_id_created_at_idx" ON "try_on_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "try_on_logs_status_created_at_idx" ON "try_on_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "product_clicks_brand_id_created_at_idx" ON "product_clicks"("brand_id", "created_at");

-- CreateIndex
CREATE INDEX "product_clicks_product_id_created_at_idx" ON "product_clicks"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "try_on_models_gender_idx" ON "try_on_models"("gender");

-- CreateIndex
CREATE INDEX "try_on_models_body_type_idx" ON "try_on_models"("body_type");

-- CreateIndex
CREATE INDEX "try_on_models_is_active_is_selectable_idx" ON "try_on_models"("is_active", "is_selectable");

-- CreateIndex
CREATE UNIQUE INDEX "body_type_user_id_key" ON "body_type"("user_id");

-- AddForeignKey
ALTER TABLE "body" ADD CONSTRAINT "body_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image" ADD CONSTRAINT "image_body_id_fkey" FOREIGN KEY ("body_id") REFERENCES "body"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size_charts" ADD CONSTRAINT "product_size_charts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_members" ADD CONSTRAINT "brand_members_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_members" ADD CONSTRAINT "brand_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_invites" ADD CONSTRAINT "brand_invites_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_invites" ADD CONSTRAINT "brand_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_customers" ADD CONSTRAINT "brand_customers_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_customers" ADD CONSTRAINT "brand_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "try_on_logs" ADD CONSTRAINT "try_on_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "try_on_logs" ADD CONSTRAINT "try_on_logs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "try_on_logs" ADD CONSTRAINT "try_on_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_clicks" ADD CONSTRAINT "product_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_clicks" ADD CONSTRAINT "product_clicks_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_clicks" ADD CONSTRAINT "product_clicks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_type" ADD CONSTRAINT "body_type_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

