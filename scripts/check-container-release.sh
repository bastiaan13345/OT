#!/bin/sh
set -eu

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }

suffix=$$
image="infini:release-check-$suffix"
live_container="infini-release-live-$suffix"
restore_container="infini-release-restored-$suffix"
data_volume="infini-release-data-$suffix"
backup_volume="infini-release-backups-$suffix"
restore_volume="infini-release-restore-$suffix"
nextauth_secret=$(openssl rand -hex 32)

cleanup() {
  docker rm --force "$live_container" "$restore_container" >/dev/null 2>&1 || true
  docker volume rm "$data_volume" "$backup_volume" "$restore_volume" >/dev/null 2>&1 || true
  docker image rm "$image" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

app_env() {
  printf '%s\n' \
    --env DATABASE_URL=file:/data/infini.db \
    --env MEDIA_ROOT=/data/media \
    --env NEXTAUTH_URL=https://beta.infini.example \
    --env "NEXTAUTH_SECRET=$nextauth_secret" \
    --env SUPPORT_EMAIL=support@infini.example
}

wait_for_health() {
  container=$1
  attempt=0
  while [ "$attempt" -lt 30 ]; do
    if docker exec "$container" node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  echo "Health check failed for $container." >&2
  docker logs "$container" >&2 || true
  return 1
}

docker build --tag "$image" .
docker volume create "$data_volume" >/dev/null
docker volume create "$backup_volume" >/dev/null
docker volume create "$restore_volume" >/dev/null
docker run --rm --user root --entrypoint sh \
  --volume "$backup_volume:/backups" \
  --volume "$restore_volume:/restore" \
  "$image" -c 'chown node:node /backups /restore'

key_output=$(docker run --rm --entrypoint age-keygen \
  --volume "$backup_volume:/backups" \
  "$image" -o /backups/identity.txt 2>&1)
recipient=$(printf '%s\n' "$key_output" | sed -n 's/^Public key: //p')
[ -n "$recipient" ] || { echo "Could not generate an age recipient." >&2; exit 1; }

# shellcheck disable=SC2046
docker run --detach --name "$live_container" $(app_env) \
  --volume "$data_volume:/data" "$image" >/dev/null
wait_for_health "$live_container"

docker exec \
  --env PROVISION_EMAIL=creator.release-check@infini.example \
  --env PROVISION_NAME='Release Check Creator' \
  --env PROVISION_PASSWORD='ReleaseCheck-Password-2026!' \
  --env PROVISION_ROLE=CREATOR \
  "$live_container" node scripts/provision-user.mjs >/dev/null

if docker run --rm --entrypoint ./scripts/backup-data.sh \
  --env DATA_DIR=/data --env BACKUP_DIR=/backups --env "BACKUP_RECIPIENT=$recipient" \
  --volume "$data_volume:/data" --volume "$backup_volume:/backups" "$image"; then
  echo "Backup unexpectedly succeeded while the application held the data lock." >&2
  exit 1
fi

docker stop "$live_container" >/dev/null
backup_output=$(docker run --rm --entrypoint ./scripts/backup-data.sh \
  --env DATA_DIR=/data --env BACKUP_DIR=/backups --env "BACKUP_RECIPIENT=$recipient" \
  --volume "$data_volume:/data" --volume "$backup_volume:/backups" "$image")
backup_file=$(printf '%s\n' "$backup_output" | sed -n 's/^Created encrypted backup: //p')
[ -n "$backup_file" ] || { echo "Backup output did not identify an archive." >&2; exit 1; }

docker run --rm --entrypoint ./scripts/restore-data.sh \
  --env DATA_DIR=/restore --env "BACKUP_FILE=$backup_file" \
  --env BACKUP_IDENTITY=/backups/identity.txt \
  --volume "$restore_volume:/restore" --volume "$backup_volume:/backups:ro" "$image"

# shellcheck disable=SC2046
docker run --detach --name "$restore_container" $(app_env) \
  --volume "$restore_volume:/data" "$image" >/dev/null
wait_for_health "$restore_container"

restored_creator=$(docker exec "$restore_container" sqlite3 /data/infini.db \
  "select count(*) from User where email='creator.release-check@infini.example' and role='CREATOR';")
[ "$restored_creator" = "1" ] || { echo "Restored creator record is missing." >&2; exit 1; }

echo "Container release gate passed: build, migration, health, quiesced encrypted backup, checksum, and restore."
