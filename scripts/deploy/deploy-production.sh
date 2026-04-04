#!/usr/bin/env bash

set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/common.sh"

SKIP_FETCH=0

if [[ "${1:-}" == "--skip-fetch" ]]; then
  SKIP_FETCH=1
fi

main() {
  require_command git
  require_command docker
  require_command pnpm
  require_command node
  require_command pm2

  ensure_file "${ROOT_DIR}/${ENV_FILE}"
  ensure_target_branch
  ensure_clean_worktree

  if (( SKIP_FETCH == 0 )); then
    log "Fetching origin/${TARGET_BRANCH}"
    fetch_target_branch
  fi

  ensure_no_local_commits_ahead
  validate_compose_config

  local previous_sha target_sha started_at

  previous_sha="$(resolve_current_sha)"
  target_sha="$(resolve_target_sha)"
  started_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  write_state_file \
    "${STATE_DIR}/last-attempt.env" \
    "DEPLOY_STARTED_AT=${started_at}" \
    "PREVIOUS_SHA=${previous_sha}" \
    "TARGET_SHA=${target_sha}" \
    "BRANCH=${TARGET_BRANCH}"

  if [[ "${previous_sha}" != "${target_sha}" ]]; then
    log "Fast-forwarding ${TARGET_BRANCH} to ${target_sha}"
    git -C "${ROOT_DIR}" merge --ff-only "origin/${TARGET_BRANCH}"
  else
    log "Local checkout already matches origin/${TARGET_BRANCH}"
  fi

  log "Installing dependencies with frozen lockfile"
  (cd "${ROOT_DIR}" && pnpm install --frozen-lockfile)

  log "Ensuring database and redis are running"
  docker compose -f "${ROOT_DIR}/${COMPOSE_FILE}" up -d database redis
  wait_for_service database 90
  wait_for_service redis 60

  log "Building application"
  (cd "${ROOT_DIR}" && NODE_OPTIONS="${BUILD_NODE_OPTIONS}" pnpm run build)

  log "Applying Prisma migrations"
  (cd "${ROOT_DIR}" && pnpm --filter @repo/database exec prisma migrate deploy)

  log "Restarting PM2 process"
  (cd "${ROOT_DIR}" && pm2 restart retold --update-env)

  write_state_file \
    "${STATE_DIR}/last-success.env" \
    "DEPLOY_FINISHED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    "PREVIOUS_SHA=${previous_sha}" \
    "DEPLOYED_SHA=$(resolve_current_sha)" \
    "BRANCH=${TARGET_BRANCH}" \
    "COMPOSE_FILE=${COMPOSE_FILE}" \
    "ENV_FILE=${ENV_FILE}"

  log "Deploy completed successfully"
  log "Rollback base SHA: ${previous_sha}"
}

main "$@"
