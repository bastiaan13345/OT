#!/bin/sh
set -eu

DATA_DIR=${DATA_DIR:-/data}
BACKUP_DIR=${BACKUP_DIR:?Set BACKUP_DIR to an off-host or mounted backup directory.}
BACKUP_RECIPIENT=${BACKUP_RECIPIENT:?Set BACKUP_RECIPIENT to an age public key.}

command -v sqlite3 >/dev/null 2>&1 || { echo "sqlite3 is required." >&2; exit 1; }
command -v age >/dev/null 2>&1 || { echo "age is required." >&2; exit 1; }
command -v flock >/dev/null 2>&1 || { echo "flock is required." >&2; exit 1; }
command -v sha256sum >/dev/null 2>&1 || { echo "sha256sum is required." >&2; exit 1; }

database_path=$DATA_DIR/infini.db
[ -f "$database_path" ] || { echo "Database not found at $database_path." >&2; exit 1; }
mkdir -p "$BACKUP_DIR"

exec 9>"$DATA_DIR/.infini-runtime.lock"
if ! flock --exclusive --nonblock 9; then
  echo "Refusing to back up while an Infini runtime is using $DATA_DIR. Stop the app before retrying." >&2
  exit 1
fi

work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT
snapshot_dir=$work_dir/infini
mkdir -p "$snapshot_dir"

# SQLite's online backup avoids copying a partially-written database. Media is
# copied after the snapshot, so a restored backup can contain harmless orphans
# but never a database reference to media missing from the archive.
sqlite3 "$database_path" ".backup '$snapshot_dir/infini.db'"
if [ -d "$DATA_DIR/media" ]; then
  tar -C "$DATA_DIR" --exclude='./infini.db' --exclude='./infini.db-*' -cf - media \
    | tar -C "$snapshot_dir" -xf -
fi

archive="$work_dir/infini-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
tar -C "$work_dir" -czf "$archive" infini
output="$BACKUP_DIR/$(basename "$archive").age"
age -r "$BACKUP_RECIPIENT" -o "$output" "$archive"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$output")" > "$(basename "$output").sha256")
printf '%s\n' "Created encrypted backup: $output"
