-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Authenticated', 'Admin');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'Authenticated';
