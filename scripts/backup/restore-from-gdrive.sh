#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/backup/restore-from-gdrive.sh [snapshot-id] [--force] [--skip-redis]
  bash scripts/backup/restore-from-gdrive.sh --latest --force [--skip-redis]

Options:
  --latest       Restores the snapshot referenced by latest.txt.
  --force        Required. The restore overwrites the current database.
  --skip-redis   Restores only PostgreSQL even if a Redis snapshot exists.
  --help         Shows this help message.
EOF
}

require_command docker
require_command gunzip
require_command rclone

load_backup_env

SNAPSHOT_ID=""
FORCE_RESTORE="false"
RESTORE_REDIS="$BACKUP_REDIS"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --latest)
      SNAPSHOT_ID="latest"
      shift
      ;;
    --force)
      FORCE_RESTORE="true"
      shift
      ;;
    --skip-redis)
      RESTORE_REDIS="false"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      if [[ "$1" == --* ]]; then
        die "Unknown option '$1'."
      fi

      if [ -n "$SNAPSHOT_ID" ]; then
        die "Snapshot ID was already provided."
      fi

      SNAPSHOT_ID="$1"
      shift
      ;;
  esac
done

[ "$FORCE_RESTORE" = "true" ] || die "Restore is destructive. Re-run with '--force'."

if [ -z "$SNAPSHOT_ID" ] || [ "$SNAPSHOT_ID" = "latest" ]; then
  SNAPSHOT_ID="$(discover_latest_snapshot)" || die "Could not find any snapshot in Google Drive."
fi

TMP_DIR="$(build_temp_dir)"
REMOTE_SNAPSHOT_PATH="$(remote_snapshot_path "$SNAPSHOT_ID")"

trap 'cleanup_dir "$TMP_DIR"' EXIT

log "Downloading snapshot '${SNAPSHOT_ID}' from Google Drive."
rclone copy "$REMOTE_SNAPSHOT_PATH" "$TMP_DIR" --fast-list

POSTGRES_ARCHIVE="${TMP_DIR}/postgres.sql.gz"
[ -f "$POSTGRES_ARCHIVE" ] || die "Snapshot '${SNAPSHOT_ID}' does not contain postgres.sql.gz."

if ! compose_service_running "$BACKUP_POSTGRES_SERVICE"; then
  die "Docker Compose service '$BACKUP_POSTGRES_SERVICE' is not running."
fi

log "Restoring PostgreSQL."
gunzip -c "$POSTGRES_ARCHIVE" | compose exec -T "$BACKUP_POSTGRES_SERVICE" sh -lc \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

if [ "$RESTORE_REDIS" = "true" ]; then
  REDIS_ARCHIVE="${TMP_DIR}/redis-data.tar.gz"

  if [ -f "$REDIS_ARCHIVE" ]; then
    REDIS_CONTAINER_ID="$(compose ps -q "$BACKUP_REDIS_SERVICE" 2>/dev/null || true)"

    if [ -z "$REDIS_CONTAINER_ID" ]; then
      log "Starting Redis service so the data volume can be restored."
      compose up -d "$BACKUP_REDIS_SERVICE" >/dev/null
      REDIS_CONTAINER_ID="$(compose ps -q "$BACKUP_REDIS_SERVICE" 2>/dev/null || true)"
    fi

    [ -n "$REDIS_CONTAINER_ID" ] || die "Could not resolve the Redis container for service '$BACKUP_REDIS_SERVICE'."

    REDIS_VOLUME_NAME="$(docker inspect "$REDIS_CONTAINER_ID" --format '{{ range .Mounts }}{{ if eq .Destination "/data" }}{{ .Name }}{{ end }}{{ end }}')"
    REDIS_IMAGE_NAME="$(docker inspect "$REDIS_CONTAINER_ID" --format '{{ .Config.Image }}')"

    [ -n "$REDIS_VOLUME_NAME" ] || die "Could not resolve the Redis volume mounted at /data."
    [ -n "$REDIS_IMAGE_NAME" ] || die "Could not resolve the Redis image name."

    log "Restoring Redis volume."
    compose stop "$BACKUP_REDIS_SERVICE" >/dev/null
    docker run --rm \
      -v "${REDIS_VOLUME_NAME}:/target" \
      -v "${TMP_DIR}:/backup:ro" \
      "$REDIS_IMAGE_NAME" \
      sh -lc 'find /target -mindepth 1 -delete && tar -xzf /backup/redis-data.tar.gz -C /target'
    compose up -d "$BACKUP_REDIS_SERVICE" >/dev/null
  else
    warn "Redis restore was requested, but this snapshot does not contain redis-data.tar.gz. Skipping."
  fi
fi

log "Restore finished successfully."
