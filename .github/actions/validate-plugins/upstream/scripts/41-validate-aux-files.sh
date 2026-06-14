#!/usr/bin/env bash
# For each CHANGED in-repo plugin folder: parse the auxiliary JSON files the
# runtime loader always-probes (.mcp.json, .lsp.json, hooks/hooks.json).
# A malformed file here is a runtime crash that `claude plugin validate` may
# not surface as an error.

source "$ACTION_PATH/lib/common.sh"

: "${VALIDATE_TMP:?}"
CHANGES="$VALIDATE_TMP/changes.json"
AUX_FILES=(".mcp.json" ".lsp.json" "hooks/hooks.json")

group_start "Aux-file JSON parse (changed in-repo plugin folders)"

count="$(jq '.folders | length' -- "$CHANGES")"
if [[ "$count" -eq 0 ]]; then
  log "No changed in-repo plugin folders; skipping."
  record_result "aux-files" "skip" "summary" "no changed local plugin folders"
  group_end
  exit 0
fi

failures=0

while IFS= read -r folder; do
  assert_safe_path "$folder"
  for aux in "${AUX_FILES[@]}"; do
    f="$folder/$aux"
    [[ -f "$f" ]] || continue
    if err="$(jq -e 'type' -- "$f" 2>&1 >/dev/null)"; then
      log "  ✓ $f parses"
      record_result "aux-files" "pass" "$f" ""
    else
      error "$f: invalid JSON"
      log "$err"
      record_result "aux-files" "fail" "$f" "$err"
      failures=$((failures+1))
    fi
  done
done < <(jq -r '.folders[]' -- "$CHANGES")

if (( failures > 0 )); then
  die "$failures auxiliary file(s) failed to parse"
fi

log "All auxiliary files parse OK"
group_end
