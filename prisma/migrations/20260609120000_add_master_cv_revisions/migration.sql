CREATE TABLE "master_cv_revisions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_master_cv_id" TEXT NOT NULL,
    "revision_number" INTEGER NOT NULL DEFAULT 1,
    "cv_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_cv_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "master_cv_revisions_user_id_created_at_idx" ON "master_cv_revisions"("user_id", "created_at");
CREATE INDEX "master_cv_revisions_user_id_revision_number_idx" ON "master_cv_revisions"("user_id", "revision_number");

ALTER TABLE "master_cv_revisions"
ADD CONSTRAINT "master_cv_revisions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
