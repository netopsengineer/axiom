#!/usr/bin/env bash
# eval-1: rename-heavy diff -> expect refactor + 🚚, on a feature branch.
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
mkdir -p src
printf 'def a():\n    return 1\n' > src/alpha.py
printf 'def b():\n    return 2\n' > src/beta.py
printf 'def c():\n    return 3\n' > src/gamma.py
git add -A
git commit -q -m "feat: ✨ add core modules"
git switch -q -c chore/rename-modules
git mv src/alpha.py src/handlers.py
git mv src/beta.py src/services.py
git mv src/gamma.py src/models.py
git add -A
echo "--- staged ---"; git diff --cached --name-status
echo "--- branch ---"; git rev-parse --abbrev-ref HEAD
echo "--- history ---"; git log --oneline -5
