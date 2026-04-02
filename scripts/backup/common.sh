#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEFAULT_BACKUP_ENV_FILE="${SCRIPT_DIR}/backup.env"
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-$DEFAULT_BACKUP_ENV_FILE}"

log() {
  printf '[backup] %s\n' "$*"
}

warn() {
  printf '[backup] warning: %s\n' "$*" >&2
}

die() {
  printf '[backup] error: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Command '$1' not found."
}

require_file() {
  [ -f "$1" ] || die "File '$1' not found."
}

resolve_path_from_repo() {
  local candidate="$1"

  if [[ "$candidate" = /* ]]; then
    printf '%s' "$candidate"
    return
  fi

  printf '%s/%s' "$REPO_ROOT" "$candidate"
}

compose() {
  (
    cd "$REPO_ROOT"
    docker compose -f "$BACKUP_COMPOSE_FILE" "$@"
  )
}

compose_service_running() {
  local service_name="$1"
  local container_id

  container_id="$(compose ps -q "$service_name" 2>/dev/null || true)"
  [ -n "$container_id" ]
}

remote_base_path() {
  if [ -n "${BACKUP_GOOGLE_DRIVE_PATH:-}" ]; then
    printf '%s:%s' "$BACKUP_GOOGLE_DRIVE_REMOTE" "${BACKUP_GOOGLE_DRIVE_PATH#/}"
    return
  fi

  printf '%s:' "$BACKUP_GOOGLE_DRIVE_REMOTE"
}

remote_snapshots_root() {
  printf '%s/snapshots' "$(remote_base_path)"
}

remote_snapshot_path() {
  local snapshot_id="$1"
  printf '%s/%s' "$(remote_snapshots_root)" "$snapshot_id"
}

remote_latest_marker() {
  printf '%s/latest.txt' "$(remote_base_path)"
}

discover_latest_snapshot() {
  local latest_marker
  local latest_directory

  latest_marker="$(rclone cat "$(remote_latest_marker)" 2>/dev/null | tr -d '\r' || true)"
  if [ -n "$latest_marker" ]; then
    printf '%s' "$latest_marker"
    return 0
  fi

  latest_directory="$(rclone lsf "$(remote_snapshots_root)" --dirs-only 2>/dev/null | sed 's:/$::' | sort | tail -n 1)"
  [ -n "$latest_directory" ] || return 1

  printf '%s' "$latest_directory"
}

build_temp_dir() {
  local tmp_root="${BACKUP_TMP_DIR%/}"

  mkdir -p "$tmp_root"
  mktemp -d "${tmp_root}/retold-backup.XXXXXX"
}

cleanup_dir() {
  local target="${1:-}"

  if [ -n "$target" ] && [ -d "$target" ]; then
    rm -rf "$target"
  fi
}

load_backup_env() {
  local compose_file_path

  require_file "$BACKUP_ENV_FILE"

  set -a
  # shellcheck disable=SC1090
  . "$BACKUP_ENV_FILE"
  set +a

  BACKUP_GOOGLE_DRIVE_REMOTE="${BACKUP_GOOGLE_DRIVE_REMOTE:-}"
  BACKUP_GOOGLE_DRIVE_PATH="${BACKUP_GOOGLE_DRIVE_PATH:-retold}"
  BACKUP_COMPOSE_FILE="${BACKUP_COMPOSE_FILE:-compose.prod.yaml}"
  BACKUP_POSTGRES_SERVICE="${BACKUP_POSTGRES_SERVICE:-database}"
  BACKUP_REDIS_SERVICE="${BACKUP_REDIS_SERVICE:-redis}"
  BACKUP_REDIS="${BACKUP_REDIS:-false}"
  BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
  BACKUP_TMP_DIR="${BACKUP_TMP_DIR:-/tmp}"
  BACKUP_WRITE_LATEST_MARKER="${BACKUP_WRITE_LATEST_MARKER:-true}"

  [ -n "$BACKUP_GOOGLE_DRIVE_REMOTE" ] || die "BACKUP_GOOGLE_DRIVE_REMOTE is required in '$BACKUP_ENV_FILE'."

  compose_file_path="$(resolve_path_from_repo "$BACKUP_COMPOSE_FILE")"
  require_file "$compose_file_path"
}
