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

  ensure_file "${ROOT_DIR}/${ENV_FILE}"
  ensure_target_branch
  ensure_clean_worktree

  if (( SKIP_FETCH == 0 )); then
    log "Fetching origin/${TARGET_BRANCH}"
    fetch_target_branch
  fi

  ensure_no_local_commits_ahead


  log "Validating Docker Compose configuration"
  validate_compose_config

  log "Preflight OK"
  log "Current commit: $(resolve_current_sha)"
  log "Target commit:  $(resolve_target_sha)"
}

main "$@"
