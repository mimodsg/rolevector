import { Prisma } from "@prisma/client";

export function isMissingTableError(
  error: unknown,
  tableName?: string
): error is Prisma.PrismaClientKnownRequestError {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2021") {
    return false;
  }

  if (!tableName) {
    return true;
  }

  return String(error.meta?.table ?? "").includes(tableName);
}

export function optimizedMasterCvMigrationMessage() {
  return "The optimized Master CV database table is not available yet. Run the latest Prisma migration to enable this feature.";
}
