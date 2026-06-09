#!/usr/bin/env bash
# eval-2: a NEW operational SKILL.md -> expect feat (or chore), NOT docs. On a feature branch.
# Seed history uses gitmoji+conventional style so the repo-convention sniff confirms emoji style.
set -euo pipefail
REPO="$1"
rm -rf "$REPO"; mkdir -p "$REPO"
git init -q -b main "$REPO"
cd "$REPO"
git config user.email dev@example.test
git config user.name "Eval Dev"
git config commit.gpgsign false
printf '# project\n\nA service.\n' > README.md
git add README.md
git commit -q -m "chore: 🔧 initialize repository"
printf 'VERSION = "0.1.0"\n' > version.py
git add version.py
git commit -q -m "feat: ✨ add version constant"
git switch -q -c feat/deploy-skill
mkdir -p .claude/skills/deploy-helper
cat > .claude/skills/deploy-helper/SKILL.md <<'SK'
---
name: deploy-helper
description: Use when the user wants to deploy the service to staging or production, run a rollout, or check deploy status.
---
# Deploy Helper

Follow these steps to run a deploy:

1. Build the image.
2. Push to the registry.
3. Trigger the rollout and watch status until healthy.
SK
git add -A
echo "--- staged ---"; git diff --cached --name-status
echo "--- branch ---"; git rev-parse --abbrev-ref HEAD
echo "--- history ---"; git log --oneline -5
