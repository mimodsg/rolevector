CREATE TABLE "optimized_master_cvs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "master_cv_id" TEXT NOT NULL,
    "revision_number" INTEGER NOT NULL DEFAULT 1,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "cv_json" JSONB NOT NULL,
    "applied_suggestion_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "promoted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "optimized_master_cvs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "optimized_master_cvs_user_id_is_main_idx" ON "optimized_master_cvs"("user_id", "is_main");
CREATE INDEX "optimized_master_cvs_user_id_created_at_idx" ON "optimized_master_cvs"("user_id", "created_at");
CREATE INDEX "optimized_master_cvs_master_cv_id_revision_number_idx" ON "optimized_master_cvs"("master_cv_id", "revision_number");

ALTER TABLE "optimized_master_cvs"
ADD CONSTRAINT "optimized_master_cvs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "optimized_master_cvs"
ADD CONSTRAINT "optimized_master_cvs_master_cv_id_fkey"
FOREIGN KEY ("master_cv_id") REFERENCES "master_cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
