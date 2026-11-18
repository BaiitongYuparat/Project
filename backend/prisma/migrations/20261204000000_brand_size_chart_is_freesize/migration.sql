-- ตารางไซส์แบบ Free Size (ไซส์เดียว) — ใช้ได้กับทุกหมวด, pajamas ต้องมี entry ครบ top+bottom
ALTER TABLE "brand_size_charts" ADD COLUMN "is_freesize" BOOLEAN NOT NULL DEFAULT false;
