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

[[ "$result" == "pass" ]] || exit 1
