/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `body` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `image` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_consents` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "body" DROP CONSTRAINT "body_user_id_fkey";

-- DropForeignKey
ALTER TABLE "image" DROP CONSTRAINT "image_body_id_fkey";

-- DropForeignKey
ALTER TABLE "user_consents" DROP CONSTRAINT "user_consents_user_id_fkey";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AlterTable
ALTER TABLE "body" DROP CONSTRAINT "body_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "body_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "body_id_seq";

-- AlterTable
ALTER TABLE "image" DROP CONSTRAINT "image_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "body_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "image_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "image_id_seq";

-- AlterTable
ALTER TABLE "user_consents" DROP CONSTRAINT "user_consents_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "user_consents_id_seq";

-- AddForeignKey
ALTER TABLE "body" ADD CONSTRAINT "body_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image" ADD CONSTRAINT "image_body_id_fkey" FOREIGN KEY ("body_id") REFERENCES "body"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
