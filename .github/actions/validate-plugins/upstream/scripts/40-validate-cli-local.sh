#!/usr/bin/env bash
# For each CHANGED in-repo plugin folder (folders containing
# .claude-plugin/plugin.json that the PR touched): run `claude plugin validate`.

source "$ACTION_PATH/lib/common.sh"

: "${VALIDATE_TMP:?}"
CHANGES="$VALIDATE_TMP/changes.json"

group_start "CLI: claude plugin validate (changed in-repo plugin folders)"

count="$(jq '.folders | length' -- "$CHANGES")"
if [[ "$count" -eq 0 ]]; then
  log "No changed in-repo plugin folders; skipping."
  record_result "cli-local" "skip" "summary" "no changed local plugin folders"
  group_end
  exit 0
fi

failures=0

while IFS= read -r folder; do
  assert_safe_path "$folder"
  manifest="$folder/.claude-plugin/plugin.json"
  log "---- $folder ----"

  if [[ ! -f "$manifest" ]]; then
    error "$folder: plugin.json missing (was present at detect time?)"
    record_result "cli-local" "fail" "$folder" "plugin.json missing"
    failures=$((failures+1))
    continue
  fi

  if ! cli_validate "cli-local" "$folder" "$manifest"; then
    failures=$((failures+1))
  fi
done < <(jq -r '.folders[]' -- "$CHANGES")

if (( failures > 0 )); then
  die "$failures in-repo plugin folder(s) failed validation"
fi

log "All $count changed in-repo plugin folder(s) validated OK"
group_end
