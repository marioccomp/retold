#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
TARGET_BRANCH="${TARGET_BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yaml}"
ENV_FILE="${ENV_FILE:-.env}"
STATE_DIR="${STATE_DIR:-${ROOT_DIR}/.deploy-state}"
BUILD_NODE_OPTIONS="${BUILD_NODE_OPTIONS:---max-old-space-size=2560}"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

ensure_file() {
  [[ -f "$1" ]] || fail "Missing required file: $1"
}

ensure_clean_worktree() {
  if [[ -n "$(git -C "${ROOT_DIR}" status --porcelain)" ]]; then
    fail "Working tree must be clean before running deploy."
  fi
}

ensure_target_branch() {
  local current_branch

  current_branch="$(git -C "${ROOT_DIR}" branch --show-current)"

  [[ "${current_branch}" == "${TARGET_BRANCH}" ]] || fail "Deploy must run from branch ${TARGET_BRANCH}."
}

fetch_target_branch() {
  git -C "${ROOT_DIR}" fetch origin "${TARGET_BRANCH}"
}

ensure_no_local_commits_ahead() {
  local counts ahead behind

  counts="$(git -C "${ROOT_DIR}" rev-list --left-right --count HEAD...origin/${TARGET_BRANCH})"
  ahead="${counts%% *}"
  behind="${counts##* }"

  if (( ahead > 0 )); then
    fail "Local ${TARGET_BRANCH} has commits not present on origin/${TARGET_BRANCH}. Push or reset before deploy."
  fi

  log "Remote comparison OK. Behind commits to deploy: ${behind}"
}

resolve_target_sha() {
  git -C "${ROOT_DIR}" rev-parse "origin/${TARGET_BRANCH}"
}

resolve_current_sha() {
  git -C "${ROOT_DIR}" rev-parse HEAD
}


validate_compose_config() {
  docker compose -f "${ROOT_DIR}/${COMPOSE_FILE}" config -q >/dev/null
}

ensure_state_dir() {
  mkdir -p "${STATE_DIR}"
}

write_state_file() {
  local file_path="$1"

  shift
  ensure_state_dir

  : > "${file_path}"

  while (($#)); do
    printf '%s\n' "$1" >> "${file_path}"
    shift
  done
}

wait_for_service() {
  local service="$1"
  local timeout="${2:-90}"
  local elapsed=0
  local container_id

  container_id="$(docker compose -f "${ROOT_DIR}/${COMPOSE_FILE}" ps -q "${service}")"
  [[ -n "${container_id}" ]] || fail "Service ${service} is not running under ${COMPOSE_FILE}."

  while (( elapsed < timeout )); do
    local state

    state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container_id}" 2>/dev/null || true)"

    if [[ "${state}" == "healthy" || "${state}" == "running" ]]; then
      log "Service ${service} is ${state}."
      return 0
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  fail "Service ${service} did not become healthy within ${timeout}s."
}
