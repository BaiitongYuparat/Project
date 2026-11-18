-- เก็บกวาดหลัง split_admin_table: ลบแถวบัญชีเจ้าของร้าน/แอดมินที่ถูกย้ายไปตาราง "Admin" แล้ว
-- ออกจากตาราง "User" ทิ้ง (ตาราง User เหลือไว้สำหรับ shopper เท่านั้น)
-- ส่วนใหญ่เป็น ON DELETE CASCADE / SET NULL ยกเว้น body_type ที่เป็น RESTRICT จึงลบก่อน

BEGIN;

DELETE FROM "body_type"
WHERE "user_id" IN (
    SELECT u."id" FROM "User" u WHERE u."email" IN (SELECT "email" FROM "Admin")
);

DELETE FROM "User" WHERE "email" IN (SELECT "email" FROM "Admin");

COMMIT;
