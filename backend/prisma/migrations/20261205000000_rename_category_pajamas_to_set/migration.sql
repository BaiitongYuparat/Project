-- เปลี่ยนชื่อหมวดสินค้าจาก pajamas → set (สินค้า 1 ชุด: ท่อนบน + ท่อนล่าง)
-- data migration ล้วน — schema ไม่เปลี่ยน (products.category เป็น String ธรรมดา)
UPDATE "products" SET category = 'set' WHERE category = 'pajamas';
