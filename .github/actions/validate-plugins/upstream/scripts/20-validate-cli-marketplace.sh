#!/usr/bin/env bash
# Run `claude plugin validate` on the full assembled marketplace.json.
# This is the canonical schema check — always current with the CLI.

source "$ACTION_PATH/lib/common.sh"

: "${VALIDATE_TMP:?}"
MP="$VALIDATE_TMP/marketplace.json"

group_start "CLI: claude plugin validate (marketplace)"

command -v claude >/dev/null 2>&1 || die "claude CLI not found on PATH"

cli_validate "cli-marketplace" "marketplace.json" "$MP" || exit 1

group_end
