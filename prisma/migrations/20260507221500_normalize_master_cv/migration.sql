-- CreateTable
CREATE TABLE "master_cv_work_experiences" (
    "id" TEXT NOT NULL,
    "master_cv_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "start_date" TEXT NOT NULL DEFAULT '',
    "end_date" TEXT NOT NULL DEFAULT '',
    "current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL DEFAULT '',
    "achievements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "master_cv_work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_cv_projects" (
    "id" TEXT NOT NULL,
    "master_cv_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "technologies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "master_cv_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_cv_education" (
    "id" TEXT NOT NULL,
    "master_cv_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL DEFAULT '',
    "start_date" TEXT NOT NULL DEFAULT '',
    "end_date" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "master_cv_education_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "master_cvs" ADD COLUMN "full_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "location" TEXT NOT NULL DEFAULT '',
ADD COLUMN "linkedin" TEXT NOT NULL DEFAULT '',
ADD COLUMN "website" TEXT NOT NULL DEFAULT '',
ADD COLUMN "summary" TEXT NOT NULL DEFAULT '',
ADD COLUMN "core_skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "technical_languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "technical_frameworks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "technical_cms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "technical_tools" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "hidden_additional_experience" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "hidden_keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill scalar and array columns from the existing JSON payload.
UPDATE "master_cvs" AS mc
SET
  "full_name" = COALESCE(
    NULLIF(BTRIM(mc."content"->'basics'->>'full_name'), ''),
    NULLIF(BTRIM(u."name"), ''),
    SPLIT_PART(u."email", '@', 1)
  ),
  "title" = COALESCE(mc."content"->'basics'->>'title', ''),
  "email" = u."email",
  "phone" = COALESCE(mc."content"->'basics'->>'phone', ''),
  "location" = COALESCE(mc."content"->'basics'->>'location', ''),
  "linkedin" = COALESCE(mc."content"->'basics'->>'linkedin', ''),
  "website" = COALESCE(mc."content"->'basics'->>'website', ''),
  "summary" = COALESCE(mc."content"->>'summary', ''),
  "core_skills" = COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(mc."content"->'core_skills', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  ),
  "technical_languages" = COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(mc."content"->'technical_skills'->'languages', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  ),
  "technical_frameworks" = COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(mc."content"->'technical_skills'->'frameworks', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  ),
  "technical_cms" = COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(mc."content"->'technical_skills'->'cms', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  ),
  "technical_tools" = COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(mc."content"->'technical_skills'->'tools', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  ),
  "certifications" = COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(mc."content"->'certifications', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  ),
  "languages" = COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(mc."content"->'languages', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  ),
  "hidden_additional_experience" = COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(mc."content"->'hidden_context'->'additional_experience', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  ),
  "hidden_keywords" = COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(mc."content"->'hidden_context'->'keywords', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  )
FROM "users" AS u
WHERE u."id" = mc."user_id";

-- Backfill nested rows from the existing JSON payload.
INSERT INTO "master_cv_work_experiences" (
  "id",
  "master_cv_id",
  "sort_order",
  "company",
  "title",
  "location",
  "start_date",
  "end_date",
  "current",
  "description",
  "achievements"
)
SELECT
  md5(random()::text || clock_timestamp()::text),
  mc."id",
  item.ord - 1,
  NULLIF(BTRIM(item.value->>'company'), ''),
  NULLIF(BTRIM(item.value->>'title'), ''),
  COALESCE(item.value->>'location', ''),
  COALESCE(item.value->>'start_date', ''),
  COALESCE(item.value->>'end_date', ''),
  CASE
    WHEN LOWER(BTRIM(COALESCE(item.value->>'current', ''))) IN ('true', 't', '1', 'yes', 'y') THEN true
    WHEN LOWER(BTRIM(COALESCE(item.value->>'current', ''))) IN ('false', 'f', '0', 'no', 'n') THEN false
    ELSE false
  END,
  COALESCE(item.value->>'description', ''),
  COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(item.value->'achievements', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  )
FROM "master_cvs" AS mc
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mc."content"->'work_experience', '[]'::jsonb)) WITH ORDINALITY AS item(value, ord)
WHERE NULLIF(BTRIM(item.value->>'company'), '') IS NOT NULL
  AND NULLIF(BTRIM(item.value->>'title'), '') IS NOT NULL;

INSERT INTO "master_cv_projects" (
  "id",
  "master_cv_id",
  "sort_order",
  "title",
  "description",
  "technologies"
)
SELECT
  md5(random()::text || clock_timestamp()::text),
  mc."id",
  item.ord - 1,
  NULLIF(BTRIM(item.value->>'title'), ''),
  COALESCE(item.value->>'description', ''),
  COALESCE(
    ARRAY(
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(item.value->'technologies', '[]'::jsonb)) AS value
      WHERE NULLIF(BTRIM(value), '') IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  )
FROM "master_cvs" AS mc
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mc."content"->'projects', '[]'::jsonb)) WITH ORDINALITY AS item(value, ord)
WHERE NULLIF(BTRIM(item.value->>'title'), '') IS NOT NULL;

INSERT INTO "master_cv_education" (
  "id",
  "master_cv_id",
  "sort_order",
  "institution",
  "degree",
  "start_date",
  "end_date"
)
SELECT
  md5(random()::text || clock_timestamp()::text),
  mc."id",
  item.ord - 1,
  NULLIF(BTRIM(item.value->>'institution'), ''),
  COALESCE(item.value->>'degree', ''),
  COALESCE(item.value->>'start_date', ''),
  COALESCE(item.value->>'end_date', '')
FROM "master_cvs" AS mc
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mc."content"->'education', '[]'::jsonb)) WITH ORDINALITY AS item(value, ord)
WHERE NULLIF(BTRIM(item.value->>'institution'), '') IS NOT NULL;

-- Remove the JSON payload once it has been normalized.
ALTER TABLE "master_cvs" DROP COLUMN "content";

-- CreateIndex
CREATE INDEX "master_cv_work_experiences_master_cv_id_sort_order_idx" ON "master_cv_work_experiences"("master_cv_id", "sort_order");

-- CreateIndex
CREATE INDEX "master_cv_projects_master_cv_id_sort_order_idx" ON "master_cv_projects"("master_cv_id", "sort_order");

-- CreateIndex
CREATE INDEX "master_cv_education_master_cv_id_sort_order_idx" ON "master_cv_education"("master_cv_id", "sort_order");

-- AddForeignKey
ALTER TABLE "master_cv_work_experiences" ADD CONSTRAINT "master_cv_work_experiences_master_cv_id_fkey" FOREIGN KEY ("master_cv_id") REFERENCES "master_cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_cv_projects" ADD CONSTRAINT "master_cv_projects_master_cv_id_fkey" FOREIGN KEY ("master_cv_id") REFERENCES "master_cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_cv_education" ADD CONSTRAINT "master_cv_education_master_cv_id_fkey" FOREIGN KEY ("master_cv_id") REFERENCES "master_cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
