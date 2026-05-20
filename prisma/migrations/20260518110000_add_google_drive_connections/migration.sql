CREATE TABLE "google_drive_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "google_email" TEXT NOT NULL DEFAULT '',
    "google_subject" TEXT NOT NULL DEFAULT '',
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT,
    "scope" TEXT NOT NULL DEFAULT '',
    "token_type" TEXT NOT NULL DEFAULT '',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_drive_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_drive_connections_user_id_key" ON "google_drive_connections"("user_id");

ALTER TABLE "google_drive_connections"
ADD CONSTRAINT "google_drive_connections_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
