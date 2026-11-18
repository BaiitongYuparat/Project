-- แยกตาราง Admin ออกจาก User: บัญชี SUPER_ADMIN และ shop admin (BrandMember) ย้ายไปตาราง "Admin"
-- BrandMember.user_id -> admin_id, BrandInvite.invited_by -> ชี้ไปที่ Admin, ลบ User.role

BEGIN;

-- 1. enum + ตาราง Admin
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'SHOP_ADMIN');

CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "googleId" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "role" "AdminRole" NOT NULL DEFAULT 'SHOP_ADMIN',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Admin_googleId_key" ON "Admin"("googleId");
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- 2. ย้ายบัญชี SUPER_ADMIN ไปตาราง Admin
INSERT INTO "Admin" ("id", "googleId", "name", "email", "status", "role", "created_at")
SELECT md5(random()::text || clock_timestamp()::text || u."id"),
       u."googleId", u."name", u."email", u."status", 'SUPER_ADMIN'::"AdminRole", u."created_at"
FROM "User" u
WHERE u."role" = 'SUPER_ADMIN';

-- 3. สร้างบัญชี Admin (SHOP_ADMIN) ให้ทุกคนที่เป็น BrandMember อยู่แล้ว
INSERT INTO "Admin" ("id", "googleId", "name", "email", "status", "role", "created_at")
SELECT DISTINCT ON (u."email")
       md5(random()::text || clock_timestamp()::text || u."id"),
       u."googleId", u."name", u."email", u."status", 'SHOP_ADMIN'::"AdminRole", u."created_at"
FROM "User" u
WHERE u."id" IN (SELECT DISTINCT "user_id" FROM "brand_members")
  AND u."role" <> 'SUPER_ADMIN';

-- 4. brand_members: user_id -> admin_id
ALTER TABLE "brand_members" ADD COLUMN "admin_id" TEXT;

UPDATE "brand_members" bm
SET "admin_id" = a."id"
FROM "Admin" a
JOIN "User" u ON u."email" = a."email"
WHERE bm."user_id" = u."id";

ALTER TABLE "brand_members" DROP CONSTRAINT IF EXISTS "brand_members_user_id_fkey";
ALTER TABLE "brand_members" DROP COLUMN "user_id";
ALTER TABLE "brand_members" ALTER COLUMN "admin_id" SET NOT NULL;
ALTER TABLE "brand_members" ADD CONSTRAINT "brand_members_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON UPDATE CASCADE ON DELETE CASCADE;

DROP INDEX IF EXISTS "brand_members_brand_id_user_id_key";
DROP INDEX IF EXISTS "brand_members_user_id_idx";
CREATE UNIQUE INDEX "brand_members_brand_id_admin_id_key" ON "brand_members"("brand_id", "admin_id");
CREATE INDEX "brand_members_admin_id_idx" ON "brand_members"("admin_id");

-- 5. brand_invites: invited_by (User) -> Admin
ALTER TABLE "brand_invites" ADD COLUMN "invited_by_admin_id" TEXT;

UPDATE "brand_invites" bi
SET "invited_by_admin_id" = a."id"
FROM "Admin" a
JOIN "User" u ON u."email" = a."email"
WHERE bi."invited_by" = u."id";

-- แถวที่ map หา Admin ไม่ได้ (ตารางนี้ยังไม่ถูกใช้งาน) ให้ลบทิ้ง
DELETE FROM "brand_invites" WHERE "invited_by_admin_id" IS NULL;

ALTER TABLE "brand_invites" DROP CONSTRAINT IF EXISTS "brand_invites_invited_by_fkey";
ALTER TABLE "brand_invites" DROP COLUMN "invited_by";
ALTER TABLE "brand_invites" ALTER COLUMN "invited_by_admin_id" SET NOT NULL;
ALTER TABLE "brand_invites" ADD CONSTRAINT "brand_invites_invited_by_admin_id_fkey"
    FOREIGN KEY ("invited_by_admin_id") REFERENCES "Admin"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX "brand_invites_invited_by_admin_id_idx" ON "brand_invites"("invited_by_admin_id");

-- 6. ลบ role ออกจาก User (User เหลือไว้สำหรับ shopper เท่านั้น)
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "UserRole";

COMMIT;
