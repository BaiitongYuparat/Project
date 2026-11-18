-- เปลี่ยนสถานะรายงาน AI จาก PENDING/IN_REVIEW/RESOLVED
-- เป็น PENDING/APPROVED/REJECTED (อนุมัติ = คืนเครดิต 1 เครดิตให้ผู้ใช้)

CREATE TYPE "AiReportStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "ai_reports" ALTER COLUMN "status" DROP DEFAULT;

-- แปลงข้อมูลเดิม: IN_REVIEW (กำลังแก้ไข) → PENDING, RESOLVED (แก้ไขแล้ว) → APPROVED
ALTER TABLE "ai_reports"
  ALTER COLUMN "status" TYPE "AiReportStatus_new"
  USING (
    CASE "status"::text
      WHEN 'IN_REVIEW' THEN 'PENDING'
      WHEN 'RESOLVED' THEN 'APPROVED'
      ELSE "status"::text
    END
  )::"AiReportStatus_new";

ALTER TABLE "ai_reports" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "AiReportStatus";
ALTER TYPE "AiReportStatus_new" RENAME TO "AiReportStatus";
