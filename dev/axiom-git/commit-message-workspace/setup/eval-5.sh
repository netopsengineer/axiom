#!/usr/bin/env bash
# eval-5: repo is on `main` with a staged change -> expect the skill to REFUSE to commit on main
# and offer to create a branch. It should NOT commit on main.
# Seed history uses gitmoji+conventional style so the repo-convention sniff confirms emoji style.
set -euo pipefail
REPO="$1"
rm -rf "$REPO"; mkdir -p "$REPO"
git init -q -b main "$REPO"
cd "$REPO"
git config user.email dev@example.test
git config user.name "Eval Dev"
git config commit.gpgsign false
printf '# project\n' > README.md
git add README.md
git commit -q -m "chore: 🔧 initialize repository"
printf 'VERSION = "0.1.0"\n' > version.py
git add version.py
git commit -q -m "feat: ✨ add version constant"
# stay on main, stage a new file
printf 'def feature():\n    return "new"\n' > feature.py
git add -A
echo "--- staged ---"; git diff --cached --name-status
echo "--- branch ---"; git rev-parse --abbrev-ref HEAD
echo "--- history ---"; git log --oneline -5
