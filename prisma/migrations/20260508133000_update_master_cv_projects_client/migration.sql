ALTER TABLE "master_cv_projects"
DROP COLUMN "technologies",
ADD COLUMN "client" TEXT NOT NULL DEFAULT '';

UPDATE "applications"
SET "optimized_cv_json" = jsonb_set(
  "optimized_cv_json",
  '{projects}',
  COALESCE(
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(item.value) = 'object'
            THEN (item.value - 'technologies') ||
              jsonb_build_object('client', COALESCE(item.value->'client', '""'::jsonb))
          ELSE item.value
        END
        ORDER BY item.ordinality
      )
      FROM jsonb_array_elements(COALESCE("optimized_cv_json"->'projects', '[]'::jsonb))
        WITH ORDINALITY AS item(value, ordinality)
    ),
    '[]'::jsonb
  )
)
WHERE jsonb_typeof("optimized_cv_json"->'projects') = 'array';
