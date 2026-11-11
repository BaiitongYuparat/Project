-- Remove UNSPECIFIED from the Gender enum.
-- Gender is now strictly MALE / FEMALE (required choice in the body profile form).

-- 1. Reset any existing UNSPECIFIED rows to NULL (= "not yet chosen",
--    will be forced to re-pick by the UI).
UPDATE "User" SET "gender" = NULL WHERE "gender" = 'UNSPECIFIED';
UPDATE "try_on_models" SET "gender" = NULL WHERE "gender" = 'UNSPECIFIED';

-- 2. Recreate the enum without UNSPECIFIED and re-map both columns.
CREATE TYPE "Gender_new" AS ENUM ('MALE', 'FEMALE');
ALTER TABLE "User" ALTER COLUMN "gender" TYPE "Gender_new" USING ("gender"::text::"Gender_new");
ALTER TABLE "try_on_models" ALTER COLUMN "gender" TYPE "Gender_new" USING ("gender"::text::"Gender_new");
ALTER TYPE "Gender" RENAME TO "Gender_old";
ALTER TYPE "Gender_new" RENAME TO "Gender";
DROP TYPE "Gender_old";
