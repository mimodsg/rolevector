CREATE TABLE "cover_letter_templates" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cover_letter_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cover_letter_templates_user_id_key" ON "cover_letter_templates"("user_id");

ALTER TABLE "cover_letter_templates"
ADD CONSTRAINT "cover_letter_templates_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
