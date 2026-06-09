ALTER TABLE "applications"
ADD COLUMN IF NOT EXISTS "analysis_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb;
