-- CreateEnum
CREATE TYPE "OwnerTransferRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "owner_transfer_requests" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "current_owner_member_id" TEXT NOT NULL,
    "current_owner_email" TEXT NOT NULL,
    "new_owner_email" TEXT NOT NULL,
    "status" "OwnerTransferRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" TEXT NOT NULL,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "owner_transfer_requests_brand_id_status_idx" ON "owner_transfer_requests"("brand_id", "status");

-- CreateIndex
CREATE INDEX "owner_transfer_requests_status_idx" ON "owner_transfer_requests"("status");

-- AddForeignKey
ALTER TABLE "owner_transfer_requests" ADD CONSTRAINT "owner_transfer_requests_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_transfer_requests" ADD CONSTRAINT "owner_transfer_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_transfer_requests" ADD CONSTRAINT "owner_transfer_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
