-- CreateTable
CREATE TABLE "clothings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT,
    "category" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "clothings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clothings_user_id_idx" ON "clothings"("user_id");