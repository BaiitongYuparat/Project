-- Try-on: เก็บรายละเอียดการ generate + ตาราง config ของ AI (provider/prompt แก้ผ่าน super admin)
ALTER TABLE "try_on_logs"
  ADD COLUMN "view" "ImageView",
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "request_id" TEXT,
  ADD COLUMN "prompt" TEXT,
  ADD COLUMN "items" JSONB,
  ADD COLUMN "result_s3_key" TEXT,
  ADD COLUMN "duration_ms" INTEGER;

CREATE TABLE "ai_configs" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_by" TEXT,
  "updated_at" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "ai_configs_pkey" PRIMARY KEY ("key")
);
