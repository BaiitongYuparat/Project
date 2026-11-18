-- Try-on: cache key สำหรับคืนผลเดิมเมื่อ input ชุดเดิม (ลดค่า API)
ALTER TABLE "try_on_logs" ADD COLUMN "cache_key" TEXT;

CREATE INDEX "try_on_logs_cache_key_created_at_idx" ON "try_on_logs"("cache_key", "created_at");
