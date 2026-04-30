#!/bin/sh
set -e

./node_modules/.bin/prisma migrate deploy
node scripts/bootstrap.mjs
node server.js
