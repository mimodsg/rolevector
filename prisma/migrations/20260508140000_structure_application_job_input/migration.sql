ALTER TABLE "applications"
RENAME COLUMN "original_job_description" TO "job_details";

ALTER TABLE "applications"
ADD COLUMN "salary" TEXT NOT NULL DEFAULT '';
