#!/usr/bin/env bash
# Compute the set of changed marketplace entries, changed external sources,
# and changed in-repo plugin folders by diffing against BASE_REF.
#
# Inputs (env):
#   BASE_REF           git ref to diff against
#   MARKETPLACE_PATH   path to marketplace.json
#   ENTRIES_DIR        if set, per-file mode (e.g. plugins/)
#
# Outputs (files under $VALIDATE_TMP, and GITHUB_OUTPUT):
#   changes.json       { entries:[], external:[], folders:[] }
#   marketplace.json   assembled marketplace (per-file mode) or copy (single-file)

source "$ACTION_PATH/lib/common.sh"

: "${BASE_REF:?BASE_REF is required}"
: "${MARKETPLACE_PATH:?MARKETPLACE_PATH is required}"
: "${VALIDATE_TMP:?VALIDATE_TMP is required}"

mkdir -p "$VALIDATE_TMP"

group_start "Detect changes vs $BASE_REF"

ALL_CHANGED=0
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  warn "BASE_REF '$BASE_REF' not resolvable; fetching"
  if ! git fetch --depth=1 origin "$BASE_REF" 2>/dev/null; then
    warn "fetch of $BASE_REF failed; treating ALL entries and folders as changed"
    ALL_CHANGED=1
  fi
fi

if (( ALL_CHANGED )); then
  DIFF_FILES=""
elif ! DIFF_FILES="$(git diff --name-only "$BASE_REF"...HEAD 2>&1)"; then
  warn "git diff failed ($DIFF_FILES); treating ALL entries and folders as changed"
  ALL_CHANGED=1
  DIFF_FILES=""
fi
log "Changed files:"
log "$DIFF_FILES"

# ---- assemble / copy marketplace ------------------------------------------

if [[ -n "${ENTRIES_DIR:-}" ]]; then
  log "Per-file mode: assembling marketplace from $ENTRIES_DIR/*.json"
  manifest_header="{}"
  if [[ -f "$(dirname "$MARKETPLACE_PATH")/manifest.json" ]]; then
    manifest_header="$(cat "$(dirname "$MARKETPLACE_PATH")/manifest.json")"
  fi
  jq -s --argjson hdr "$manifest_header" \
    '$hdr + {plugins: (. | sort_by(.name))}' \
    "$ENTRIES_DIR"/*.json > "$VALIDATE_TMP/marketplace.json"
else
  cp -- "$MARKETPLACE_PATH" "$VALIDATE_TMP/marketplace.json"
fi

# ---- changed entries -------------------------------------------------------

changed_entries_json='[]'

if [[ -n "${ENTRIES_DIR:-}" ]]; then
  # Per-file: changed entries = changed files under ENTRIES_DIR
  if (( ALL_CHANGED )); then
    src_files="$(ls "$ENTRIES_DIR"/*.json 2>/dev/null || true)"
  else
    src_files="$(printf '%s\n' "$DIFF_FILES" | grep -E "^${ENTRIES_DIR%/}/[^/]+\.json$" || true)"
  fi
  changed_entries_json="$(
    printf '%s\n' "$src_files" \
      | sed -E 's|.*/([^/]+)\.json$|\1|' \
      | jq -R -s -c 'split("\n") | map(select(length > 0))'
  )"
else
  # Single-file: diff plugins[] between base and head. Use file inputs (not
  # --argjson) because the marketplace can be >1MB and would overflow argv.
  if git cat-file -e "$BASE_REF:$MARKETPLACE_PATH" 2>/dev/null; then
    git show "$BASE_REF:$MARKETPLACE_PATH" > "$VALIDATE_TMP/marketplace.base.json"
  else
    echo '{"plugins":[]}' > "$VALIDATE_TMP/marketplace.base.json"
  fi
  changed_entries_json="$(
    jq -c -s \
      '(.[0].plugins | map({(.name): .}) | add // {}) as $bmap
       | [.[1].plugins[] | select(($bmap[.name] // null) != .)]
       | map(.name)' \
      "$VALIDATE_TMP/marketplace.base.json" "$VALIDATE_TMP/marketplace.json"
  )"
fi

log "Changed entries: $changed_entries_json"

# ---- changed external sources ---------------------------------------------
# Subset of changed entries whose source is an object (url / git-subdir).

changed_external_json="$(
  jq -c \
    --argjson names "$changed_entries_json" \
    '[.plugins[]
      | select(.name as $n | $names | index($n))
      | select(.source | type == "object")
      | {name, source, strict}]' \
    "$VALIDATE_TMP/marketplace.json"
)"

log "Changed external entries: $(jq 'length' <<<"$changed_external_json")"

# ---- changed in-repo plugin folders ---------------------------------------
# For each changed file, walk up the directory tree to the nearest ancestor
# containing .claude-plugin/plugin.json. Handles nested plugins
# (e.g. partner-built/slack/).

folders=()
if (( ALL_CHANGED )); then
  while IFS= read -r pj; do
    folders+=("$(dirname "$(dirname "$pj")")")
  done < <(find . -mindepth 2 -path '*/.claude-plugin/plugin.json' -not -path './.git/*' | sed 's|^\./||')
else
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    d="$(dirname "$f")"
    while [[ "$d" != "." && "$d" != "/" ]]; do
      if [[ -f "$d/.claude-plugin/plugin.json" ]]; then
        folders+=("$d"); break
      fi
      d="$(dirname "$d")"
    done
  done <<<"$DIFF_FILES"
fi
changed_folders_json="$(printf '%s\n' "${folders[@]+"${folders[@]}"}" | sort -u | jq -R -s -c 'split("\n") | map(select(length>0))')"

log "Changed in-repo plugin folders: $changed_folders_json"

# ---- write outputs ---------------------------------------------------------

# Assemble changes.json via FILE inputs (--slurpfile), NOT --argjson: a large
# changed-set (e.g. a bulk SHA bump touching ~900 entries) makes these arrays
# exceed the kernel single-arg limit (MAX_ARG_STRLEN, ~128KB), so --argjson dies
# with "Argument list too long" (exit 126). Mirrors the file-input pattern used
# for the >1MB marketplace above. Each file holds one JSON array → $var[0].
printf '%s' "$changed_entries_json"  > "$VALIDATE_TMP/_changed-entries.json"
printf '%s' "$changed_external_json" > "$VALIDATE_TMP/_changed-external.json"
printf '%s' "$changed_folders_json"  > "$VALIDATE_TMP/_changed-folders.json"
jq -n \
  --slurpfile entries  "$VALIDATE_TMP/_changed-entries.json" \
  --slurpfile external "$VALIDATE_TMP/_changed-external.json" \
  --slurpfile folders  "$VALIDATE_TMP/_changed-folders.json" \
  '{entries:$entries[0], external:$external[0], folders:$folders[0]}' \
  > "$VALIDATE_TMP/changes.json"

{
  echo "changed-entries=$changed_entries_json"
  echo "changed-external=$changed_external_json"
  echo "changed-folders=$changed_folders_json"
} >> "${GITHUB_OUTPUT:-/dev/stdout}"

group_end
