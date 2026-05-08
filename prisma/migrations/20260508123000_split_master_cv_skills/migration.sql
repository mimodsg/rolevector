ALTER TABLE "master_cvs"
RENAME COLUMN "core_skills" TO "hard_skills";

ALTER TABLE "master_cvs"
ADD COLUMN "soft_skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "applications"
SET "optimized_cv_json" =
  ("optimized_cv_json" - 'core_skills') ||
  jsonb_build_object(
    'hard_skills',
    COALESCE(
      "optimized_cv_json"->'hard_skills',
      "optimized_cv_json"->'core_skills',
      '[]'::jsonb
    ),
    'soft_skills',
    COALESCE("optimized_cv_json"->'soft_skills', '[]'::jsonb)
  )
WHERE "optimized_cv_json" ? 'core_skills'
  OR NOT ("optimized_cv_json" ? 'hard_skills')
  OR NOT ("optimized_cv_json" ? 'soft_skills');
