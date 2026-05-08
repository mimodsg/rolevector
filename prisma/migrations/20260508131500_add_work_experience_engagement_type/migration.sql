ALTER TABLE "master_cv_work_experiences"
ADD COLUMN "engagement_type" TEXT NOT NULL DEFAULT '';

UPDATE "applications"
SET "optimized_cv_json" = jsonb_set(
  "optimized_cv_json",
  '{work_experience}',
  COALESCE(
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(item.value) = 'object' AND NOT (item.value ? 'engagement_type')
            THEN item.value || jsonb_build_object('engagement_type', '')
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
