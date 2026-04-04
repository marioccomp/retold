#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
STATE_FILE="${ROOT_DIR}/.deploy-state/last-success.env"

if [[ ! -f "${STATE_FILE}" ]]; then
  printf '[deploy] No successful deploy state file found at %s\n' "${STATE_FILE}" >&2
  exit 1
fi

cat "${STATE_FILE}"
