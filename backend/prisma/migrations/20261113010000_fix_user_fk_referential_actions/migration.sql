-- Align FK referential actions with schema.prisma (they drifted from applied migrations):
--   body_type.user_id:      RESTRICT  -> CASCADE   (required relation, onDelete: Cascade)
--   try_on_logs.user_id:    NO ACTION -> SET NULL  (optional relation, onDelete: SetNull)
--   product_clicks.user_id: NO ACTION -> SET NULL  (optional relation, onDelete: SetNull)
-- Without this, deleting a shopper who has a body-type analysis / try-on logs /
-- product clicks fails with a FK restrict violation.

ALTER TABLE "body_type" DROP CONSTRAINT "body_type_user_id_fkey";
ALTER TABLE "body_type" ADD CONSTRAINT "body_type_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "try_on_logs" DROP CONSTRAINT "try_on_logs_user_id_fkey";
ALTER TABLE "try_on_logs" ADD CONSTRAINT "try_on_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_clicks" DROP CONSTRAINT "product_clicks_user_id_fkey";
ALTER TABLE "product_clicks" ADD CONSTRAINT "product_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
