#!/bin/sh
set -eu

container_name=${INFINI_CONTAINER_NAME:-traycer-ot-zealous-panda-infini-1}
public_url=${INFINI_PUBLIC_URL:-https://infini.lousbussy.uk/api/health}
backup_dir=${INFINI_BACKUP_DIR:-$(pwd)/backups}
log_dir=${INFINI_MONITOR_LOG_DIR:-$HOME/Library/Logs/Infini}
min_free_bytes=${INFINI_MIN_FREE_BYTES:-10737418240}
max_backup_age_seconds=${INFINI_MAX_BACKUP_AGE_SECONDS:-129600}
state_file="$log_dir/monitor.state"
log_file="$log_dir/monitor.log"
failures=""

mkdir -p "$log_dir"

fail() {
  if [ -n "$failures" ]; then
    failures="$failures; $1"
  else
    failures=$1
  fi
}

notify() {
  INFINI_MONITOR_MESSAGE=$1 /usr/bin/osascript \
    -e 'display notification (system attribute "INFINI_MONITOR_MESSAGE") with title "Infini beta monitor"' \
    >/dev/null 2>&1 || true
}

container_state=$(docker inspect --format '{{.State.Running}} {{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container_name" 2>/dev/null || true)
[ "$container_state" = "true healthy" ] || fail "container is not running and healthy ($container_state)"

local_health=$(curl -fsS --max-time 15 http://127.0.0.1:3000/api/health 2>/dev/null || true)
[ "$local_health" = '{"status":"ok"}' ] || fail "loopback health check failed"

public_host=$(printf '%s\n' "$public_url" | sed -E 's#^https://([^/]+)/.*#\1#')
public_ip=$(/usr/bin/dig @1.1.1.1 +short "$public_host" A 2>/dev/null | sed -n '1p')
if [ -n "$public_ip" ]; then
  public_health=$(curl -fsS --max-time 20 --resolve "$public_host:443:$public_ip" "$public_url" 2>/dev/null || true)
else
  public_health=""
fi
[ "$public_health" = '{"status":"ok"}' ] || fail "public HTTPS health check failed"

free_bytes=$(docker exec "$container_name" node -e \
  "require('fs').statfs('/data',(error,stats)=>{if(error)process.exit(1);console.log(Number(stats.bavail)*Number(stats.bsize))})" \
  2>/dev/null || true)
case "$free_bytes" in
  ''|*[!0-9]*) fail "could not read /data free space" ;;
  *) [ "$free_bytes" -ge "$min_free_bytes" ] || fail "/data free space is below $min_free_bytes bytes" ;;
esac

latest_backup=$(find "$backup_dir" -maxdepth 1 -type f -name 'infini-*.tar.gz.age' ! -name '*.offhost.age' \
  -print 2>/dev/null | sort | tail -n 1)
if [ -z "$latest_backup" ]; then
  fail "no encrypted backup was found"
else
  checksum_file="$latest_backup.sha256"
  offhost_copy="$latest_backup.offhost.age"
  if [ ! -f "$checksum_file" ] || ! (cd "$backup_dir" && shasum -a 256 -c "$(basename "$checksum_file")" >/dev/null 2>&1); then
    fail "latest backup checksum failed"
  fi
  if [ ! -f "$offhost_copy" ] || ! cmp -s "$latest_backup" "$offhost_copy"; then
    fail "verified off-host copy is missing or differs"
  else
    now=$(date +%s)
    offhost_modified=$(stat -f %m "$offhost_copy" 2>/dev/null || printf '0')
    offhost_age=$((now - offhost_modified))
    [ "$offhost_age" -le "$max_backup_age_seconds" ] || fail "verified off-host copy is stale ($offhost_age seconds)"
  fi
fi

timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
previous=$(cat "$state_file" 2>/dev/null || true)
if [ -n "$failures" ]; then
  printf '{"timestamp":"%s","status":"failed","message":"%s"}\n' "$timestamp" "$(printf '%s' "$failures" | sed 's/"/\\"/g')" >>"$log_file"
  printf 'failed\n' >"$state_file"
  [ "$previous" = "failed" ] || notify "$failures"
  exit 1
fi

printf '{"timestamp":"%s","status":"ok","freeBytes":%s,"backup":"%s"}\n' \
  "$timestamp" "$free_bytes" "$(basename "$latest_backup")" >>"$log_file"
printf 'ok\n' >"$state_file"
[ "$previous" != "failed" ] || notify "All Infini beta host checks recovered."

