-- ════════════════════════════════════════════════════════
--  Migration: 20260701000000_regulatory_access
--  Adds the regulatory_access table that maps organizations
--  to specific regulatory officers who are allowed to view them.
-- ════════════════════════════════════════════════════════

-- CreateTable
CREATE TABLE "regulatory_access" (
    "id"              TEXT NOT NULL,
    "organizationId"  TEXT NOT NULL,
    "regulatorUserId" TEXT NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "regulatory_access_pkey" PRIMARY KEY ("id")
);

-- Unique pair: one record per org-regulator combination
CREATE UNIQUE INDEX "regulatory_access_organizationId_regulatorUserId_key"
    ON "regulatory_access"("organizationId", "regulatorUserId");

-- Performance indexes
CREATE INDEX "regulatory_access_organizationId_idx"  ON "regulatory_access"("organizationId");
CREATE INDEX "regulatory_access_regulatorUserId_idx" ON "regulatory_access"("regulatorUserId");
CREATE INDEX "regulatory_access_status_idx"          ON "regulatory_access"("status");

-- FK to organizations (cascade: if org is deleted, remove access records)
ALTER TABLE "regulatory_access"
    ADD CONSTRAINT "regulatory_access_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
