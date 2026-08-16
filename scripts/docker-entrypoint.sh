#!/bin/sh
set -eu

node scripts/validate-production-env.mjs

exec 9>/data/.infini-runtime.lock
if ! flock --exclusive --nonblock 9; then
  echo '{"event":"startup.data_lock_failed","message":"Another Infini runtime or backup owns /data."}' >&2
  exit 1
fi

if ! ./node_modules/.bin/prisma migrate deploy; then
  echo '{"event":"startup.migration_failed"}' >&2
  exit 1
fi
echo '{"event":"startup.migration_completed"}'
exec node server.js
