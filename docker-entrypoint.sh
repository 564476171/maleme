#!/bin/sh
set -e

if [ -z "${APP_SECRET:-}" ]; then
  secret_file="${APP_SECRET_FILE:-/data/app-secret}"
  secret_dir=$(dirname "$secret_file")

  mkdir -p "$secret_dir"

  if [ ! -s "$secret_file" ]; then
    if command -v openssl >/dev/null 2>&1; then
      openssl rand -hex 32 > "$secret_file"
    else
      od -An -N 32 -tx1 /dev/urandom | tr -d ' \n' > "$secret_file"
    fi

    chmod 600 "$secret_file" || true
  fi

  export APP_SECRET
  APP_SECRET=$(cat "$secret_file")
fi

case "${ADMIN_PASSWORD:-}" in
  ""|"choose-your-own-admin-password"|"change-me"|"change-me-now")
  echo "ADMIN_PASSWORD is required. Set it in .env before starting." >&2
  exit 1
  ;;
esac

./node_modules/.bin/prisma migrate deploy
node scripts/bootstrap.mjs
node server.js
