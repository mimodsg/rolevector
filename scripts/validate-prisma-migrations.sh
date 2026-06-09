#!/bin/sh

set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

if [ -z "${VALIDATION_DATABASE_URL:-}" ]; then
  echo "VALIDATION_DATABASE_URL is required"
  exit 1
fi

echo "Validating Prisma migration chain against: $VALIDATION_DATABASE_URL"
DATABASE_URL="$VALIDATION_DATABASE_URL" npx prisma migrate deploy
DATABASE_URL="$VALIDATION_DATABASE_URL" npx prisma migrate status
