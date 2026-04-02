#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

require_command docker
require_command gzip
require_command hostname
require_command rclone

load_backup_env

TMP_DIR="$(build_temp_dir)"
SNAPSHOT_ID="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
SNAPSHOT_DIR="${TMP_DIR}/${SNAPSHOT_ID}"
REMOTE_SNAPSHOT_PATH="$(remote_snapshot_path "$SNAPSHOT_ID")"
REDIS_INCLUDED="false"

trap 'cleanup_dir "$TMP_DIR"' EXIT

mkdir -p "$SNAPSHOT_DIR"

log "Creating PostgreSQL snapshot '${SNAPSHOT_ID}'."

if ! compose_service_running "$BACKUP_POSTGRES_SERVICE"; then
  die "Docker Compose service '$BACKUP_POSTGRES_SERVICE' is not running."
fi

compose exec -T "$BACKUP_POSTGRES_SERVICE" sh -lc \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  | gzip -9 > "${SNAPSHOT_DIR}/postgres.sql.gz"

if [ "$BACKUP_REDIS" = "true" ]; then
  if compose_service_running "$BACKUP_REDIS_SERVICE"; then
    log "Creating Redis snapshot."
    compose exec -T "$BACKUP_REDIS_SERVICE" sh -lc \
      'redis-cli SAVE >/dev/null && tar -C /data -czf - .' \
      > "${SNAPSHOT_DIR}/redis-data.tar.gz"
    REDIS_INCLUDED="true"
  else
    warn "Redis backup was enabled, but service '$BACKUP_REDIS_SERVICE' is not running. Skipping."
  fi
fi

{
  printf 'snapshot_id=%s\n' "$SNAPSHOT_ID"
  printf 'created_at_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'hostname=%s\n' "$(hostname)"
  printf 'compose_file=%s\n' "$BACKUP_COMPOSE_FILE"
  printf 'postgres_service=%s\n' "$BACKUP_POSTGRES_SERVICE"
  printf 'redis_service=%s\n' "$BACKUP_REDIS_SERVICE"
  printf 'redis_included=%s\n' "$REDIS_INCLUDED"
  printf 'git_commit=%s\n' "$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || printf 'unavailable')"
} > "${SNAPSHOT_DIR}/manifest.txt"

if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "$SNAPSHOT_DIR"
    sha256sum * > checksums.sha256
  )
fi

log "Uploading snapshot to Google Drive at '${REMOTE_SNAPSHOT_PATH}'."
rclone copy "$SNAPSHOT_DIR" "$REMOTE_SNAPSHOT_PATH" --create-empty-src-dirs --fast-list

if [ "$BACKUP_WRITE_LATEST_MARKER" = "true" ]; then
  printf '%s\n' "$SNAPSHOT_ID" | rclone rcat "$(remote_latest_marker)"
fi

log "Applying retention policy (${BACKUP_RETENTION_DAYS} days)."
rclone delete "$(remote_snapshots_root)" --min-age "${BACKUP_RETENTION_DAYS}d" --fast-list --drive-use-trash=false
rclone rmdirs "$(remote_snapshots_root)" --leave-root >/dev/null 2>&1 || true

log "Backup finished successfully."
log "Snapshot available at ${REMOTE_SNAPSHOT_PATH}"
