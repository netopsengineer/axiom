#!/usr/bin/env bash
# Aggregate results.jsonl into a markdown table for $GITHUB_STEP_SUMMARY
# and set the final `result` output.

source "$ACTION_PATH/lib/common.sh"

: "${VALIDATE_TMP:?}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
RESULTS="$VALIDATE_TMP/results.jsonl"

[[ -f "$RESULTS" ]] || touch "$RESULTS"

any_fail="$(jq -s 'map(select(.status=="fail")) | length' -- "$RESULTS" 2>/dev/null || echo 0)"

{
  echo "## Plugin validation report"
  echo
  echo "| Step | Subject | Status | Detail |"
  echo "|---|---|---|---|"
  jq -r '"| \(.step) | \(.subject) | \(.status) | \((.detail // "") | gsub("\n"; "<br>") | .[0:200]) |"' -- "$RESULTS"
  echo
  if [[ "$any_fail" -gt 0 ]]; then
    echo "**Result: FAIL** ($any_fail failure(s))"
  else
    echo "**Result: PASS**"
  fi
} >> "$SUMMARY"

result="pass"
[[ "$any_fail" -gt 0 ]] && result="fail"

echo "result=$result" >> "${GITHUB_OUTPUT:-/dev/stdout}"
echo "report-path=$SUMMARY" >> "${GITHUB_OUTPUT:-/dev/stdout}"

# ---- machine-readable verdicts for the bump-revert loop --------------------
# Emitted on EVERY exit path (this step is `if: always()`), BEFORE the exit 1
# below, so the failing path — the only one the revert loop consumes — always
# produces them. The bump-plugin-shas / revert-failed-bumps workflows read these.
#
# Parse results.jsonl ONCE (capture-then-explicit-gate; no `|| default` feeding a
# gate). A parse error OR an empty file ⇒ completed=false — the signal the revert
# loop treats as an INFRA ERROR (do nothing), never confusable with a clean
# all-pass (which is completed=true + empty failed list). Without this, an
# unhandled crash that leaves results.jsonl empty would read as "all green".
set +e
rows="$(jq -s -c '.' -- "$RESULTS" 2>/dev/null)"; jq_rc=$?
set -e
# `if` (not `A || B && C`) — a bare compound returning non-zero would abort under
# the sourced `set -euo pipefail` exactly on the healthy all-pass path.
if [ "$jq_rc" -ne 0 ] || [ -z "$rows" ]; then rows='[]'; fi
row_count="$(jq 'length' <<<"$rows")"
completed=true
if [ "$jq_rc" -ne 0 ] || [ "$row_count" -eq 0 ]; then completed=false; fi

# Revertable failures map to a marketplace ENTRY NAME the revert loop can drop:
#   - cli-external fails: `subject` IS the entry name.
#   - per-entry invariant fails: `subject` is the CODE, `entry` carries the name.
failed_entries="$(jq -c '
  [ .[] | select(.status=="fail")
    | if .step=="cli-external" then .subject
      elif (.entry // "") != "" then .entry
      else empty end ] | unique' <<<"$rows")"
# Non-revertable failures cannot be cleared by dropping one entry's source.sha
# (whole-marketplace I1 sort / I2 dups / I7, marketplace-schema). The revert loop
# must ABORT + alert on these, not spin its pass budget on a red PR.
# EXCLUDE step=="fatal": die() records a synthetic {step:"fatal",subject:"die"}
# terminator row AFTER the real per-entry fails (steps 11 and 30 both die at the
# end of a failing run). It is NOT a distinct non-revertable failure — counting it
# would make EVERY failing run look non-revertable and the loop would never revert.
nonrevertable="$(jq -c '
  [ .[] | select(.status=="fail")
    | select(.step != "cli-external")
    | select(.step != "fatal")
    | select((.entry // "") == "")
    | .subject ] | unique' <<<"$rows")"

mkdir -p "$VALIDATE_TMP"
printf '%s\n' "$failed_entries" > "$VALIDATE_TMP/run-failed.json"
jq -c '[ .[] | select(.status=="fail") ]' <<<"$rows" > "$VALIDATE_TMP/run-verdicts.json"
jq -cn --argjson completed "$completed" --argjson nonrevertable "$nonrevertable" \
  '{completed:$completed, nonrevertable:$nonrevertable}' > "$VALIDATE_TMP/run-meta.json"

{
  echo "completed=$completed"
  echo "failed-subjects=$failed_entries"
  echo "nonrevertable=$nonrevertable"
} >> "${GITHUB_OUTPUT:-/dev/stdout}"

[[ "$result" == "pass" ]] || exit 1
