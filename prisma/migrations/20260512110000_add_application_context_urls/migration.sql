ALTER TABLE "applications"
ADD COLUMN "job_application_url" TEXT NOT NULL DEFAULT '',
ADD COLUMN "company_url" TEXT NOT NULL DEFAULT '',
ADD COLUMN "job_context" TEXT NOT NULL DEFAULT '',
ADD COLUMN "company_context" TEXT NOT NULL DEFAULT '';
