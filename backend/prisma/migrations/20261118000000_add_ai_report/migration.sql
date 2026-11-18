-- CreateEnum
CREATE TYPE "AiReportCategory" AS ENUM ('BODY_ANALYSIS', 'AI_STYLIST', 'TRY_ON', 'IMAGE_CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "AiReportStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED');

-- CreateTable
CREATE TABLE "ai_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" "AiReportCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "page_url" TEXT,
    "image_url" TEXT,
    "status" "AiReportStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "handled_by" TEXT,
    "handled_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_reports_user_id_idx" ON "ai_reports"("user_id");

-- CreateIndex
CREATE INDEX "ai_reports_status_idx" ON "ai_reports"("status");

-- AddForeignKey
ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

