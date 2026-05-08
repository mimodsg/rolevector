ALTER TABLE "master_cv_education"
ADD COLUMN "location" TEXT NOT NULL DEFAULT '';

UPDATE "applications"
SET "optimized_cv_json" = jsonb_set(
  "optimized_cv_json",
  '{education}',
  COALESCE(
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(item.value) = 'object' AND NOT (item.value ? 'location')
            THEN item.value || jsonb_build_object('location', '')
          ELSE item.value
        END
        ORDER BY item.ordinality
      )
      FROM jsonb_array_elements(COALESCE("optimized_cv_json"->'education', '[]'::jsonb))
        WITH ORDINALITY AS item(value, ordinality)
    ),
    '[]'::jsonb
  )
)
WHERE jsonb_typeof("optimized_cv_json"->'education') = 'array';
