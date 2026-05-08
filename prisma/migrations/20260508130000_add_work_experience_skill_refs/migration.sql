ALTER TABLE "master_cv_work_experiences"
DROP COLUMN "achievements",
ADD COLUMN "hard_skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "soft_skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "programming_languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "frameworks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "cms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "tools" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "applications"
SET "optimized_cv_json" = jsonb_set(
  "optimized_cv_json",
  '{work_experience}',
  COALESCE(
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(item.value) = 'object'
            THEN (item.value - 'achievements') ||
              jsonb_build_object(
                'hard_skills', COALESCE(item.value->'hard_skills', '[]'::jsonb),
                'soft_skills', COALESCE(item.value->'soft_skills', '[]'::jsonb),
                'programming_languages', COALESCE(item.value->'programming_languages', '[]'::jsonb),
                'frameworks', COALESCE(item.value->'frameworks', '[]'::jsonb),
                'cms', COALESCE(item.value->'cms', '[]'::jsonb),
                'tools', COALESCE(item.value->'tools', '[]'::jsonb)
              )
          ELSE item.value
        END
        ORDER BY item.ordinality
      )
      FROM jsonb_array_elements(COALESCE("optimized_cv_json"->'work_experience', '[]'::jsonb))
        WITH ORDINALITY AS item(value, ordinality)
    ),
    '[]'::jsonb
  )
)
WHERE jsonb_typeof("optimized_cv_json"->'work_experience') = 'array';
