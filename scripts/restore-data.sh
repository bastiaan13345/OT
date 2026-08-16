#!/bin/sh
set -eu

DATA_DIR=${DATA_DIR:-/data}
BACKUP_FILE=${BACKUP_FILE:?Set BACKUP_FILE to an encrypted Infini backup.}
BACKUP_IDENTITY=${BACKUP_IDENTITY:?Set BACKUP_IDENTITY to the age identity file.}

command -v age >/dev/null 2>&1 || { echo "age is required." >&2; exit 1; }
command -v sha256sum >/dev/null 2>&1 || { echo "sha256sum is required." >&2; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "tar is required." >&2; exit 1; }

checksum_file=${BACKUP_CHECKSUM_FILE:-$BACKUP_FILE.sha256}
[ -f "$checksum_file" ] || { echo "Backup checksum not found at $checksum_file." >&2; exit 1; }
(cd "$(dirname "$BACKUP_FILE")" && sha256sum -c "$(basename "$checksum_file")")

mkdir -p "$DATA_DIR"
if find "$DATA_DIR" -mindepth 1 -maxdepth 1 -print -quit | grep -q .; then
  echo "Refusing to restore into a non-empty DATA_DIR: $DATA_DIR" >&2
  exit 1
fi

work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT
archive="$work_dir/infini.tar.gz"
age -d -i "$BACKUP_IDENTITY" -o "$archive" "$BACKUP_FILE"
tar -xzf "$archive" -C "$work_dir"
[ -f "$work_dir/infini/infini.db" ] || { echo "Backup archive does not contain infini/infini.db." >&2; exit 1; }
cp -R "$work_dir/infini/." "$DATA_DIR/"
printf '%s\n' "Restored backup into $DATA_DIR. Run the health check before enabling traffic."
