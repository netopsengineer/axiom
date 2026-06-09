#!/usr/bin/env bash
# eval-3: small bug fix to existing behavior -> expect fix + 🐛, no body. On a feature branch.
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
mkdir -p app
printf 'def divide(a, b):\n    return a / b\n' > app/calc.py
git add -A
git commit -q -m "feat: ✨ add calc module"
git switch -q -c fix/zero-division
printf 'def divide(a, b):\n    if b == 0:\n        return 0\n    return a / b\n' > app/calc.py
git add -A
echo "--- staged ---"; git diff --cached --name-status
echo "--- branch ---"; git rev-parse --abbrev-ref HEAD
echo "--- history ---"; git log --oneline -5
