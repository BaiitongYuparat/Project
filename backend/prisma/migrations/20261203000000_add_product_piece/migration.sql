-- รองรับหมวด pajamas (สินค้า 1 ชุด): ระบุชนิดรูป SET (รูปรวมทั้งชุด, รูปหลัก) / TOP / BOTTOM (รูปแยกท่อน)
CREATE TYPE "ProductPiece" AS ENUM ('SET', 'TOP', 'BOTTOM');

ALTER TABLE "product_images" ADD COLUMN "piece" "ProductPiece";
