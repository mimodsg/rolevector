ALTER TABLE "applications"
ADD COLUMN IF NOT EXISTS "optimized_cv_text" TEXT NOT NULL DEFAULT '';
