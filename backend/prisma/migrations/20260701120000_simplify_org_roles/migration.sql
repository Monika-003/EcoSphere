-- Simplify org-portal roles: replace ORG_* names with cleaner single names
-- ENV_OFFICER (was ORG_ENGINEER) — full access
-- ADMIN       (was ORG_ADMIN)    — full access
-- ENV_ENGINEER (was ORG_ANALYST / view-only engineer)
-- PRODUCTION_HEAD, QUALITY_HEAD, HR_HEAD — view only
--
-- NOTE: ADD VALUE steps were committed in a prior transaction; this migration
-- starts directly with data migration + enum swap.

-- Step 1: Migrate existing user rows to new role values
UPDATE "users" SET role = 'ENV_OFFICER'     WHERE role IN ('ORG_ENGINEER');
UPDATE "users" SET role = 'ADMIN'           WHERE role IN ('ORG_ADMIN');
UPDATE "users" SET role = 'ENV_ENGINEER'    WHERE role IN ('ORG_ANALYST', 'ORG_PURCHASE_HEAD', 'ORG_MAINTENANCE_HEAD');
UPDATE "users" SET role = 'PRODUCTION_HEAD' WHERE role IN ('ORG_PRODUCTION_HEAD');
UPDATE "users" SET role = 'QUALITY_HEAD'    WHERE role IN ('ORG_QUALITY_HEAD');
UPDATE "users" SET role = 'HR_HEAD'         WHERE role IN ('ORG_HR_HEAD');

-- Step 2: Recreate the enum without the old ORG_* values
--         PostgreSQL does not support DROP VALUE so we swap types.
CREATE TYPE "UserRole_new" AS ENUM (
  'SUPER_ADMIN',
  'ENV_OFFICER', 'ADMIN',
  'ENV_ENGINEER', 'PRODUCTION_HEAD', 'QUALITY_HEAD', 'HR_HEAD',
  'LAB_ADMIN', 'LAB_ANALYST', 'LAB_SENIOR_REVIEWER', 'LAB_QUALITY_MANAGER',
  'REG_OFFICER', 'REG_INSPECTOR', 'REG_REGIONAL_OFFICER', 'REG_GOVERNMENT_AUTHORITY',
  'CONSULTANT', 'AUDITOR'
);

ALTER TABLE "users" ALTER COLUMN role TYPE "UserRole_new"
  USING role::text::"UserRole_new";

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
