ALTER TABLE "applications"
ADD COLUMN IF NOT EXISTS "optimized_cv_text" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "baseline_ats_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "optimized_at" TIMESTAMP(3);

UPDATE "applications"
SET "baseline_ats_score" = "ats_score"
WHERE "baseline_ats_score" = 0;
