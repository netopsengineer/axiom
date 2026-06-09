#!/usr/bin/env bash
# eval-6: multi-file, >10-line new feature -> expect feat + ✨ WITH a body. On a feature branch.
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
git switch -q -c feat/cache-layer
mkdir -p app
cat > app/cache.py <<'PY'
import time


class Cache:
    """Simple TTL cache backed by an in-memory dict."""

    def __init__(self, ttl=300):
        self.ttl = ttl
        self._store = {}

    def get(self, key):
        item = self._store.get(key)
        if not item:
            return None
        value, ts = item
        if time.time() - ts > self.ttl:
            del self._store[key]
            return None
        return value

    def set(self, key, value):
        self._store[key] = (value, time.time())
PY
cat > app/config.py <<'PY'
CACHE_TTL = 300
CACHE_BACKEND = "memory"
PY
printf 'from app.cache import Cache\n\ncache = Cache(ttl=300)\n\n\ndef warm():\n    cache.set("ready", True)\n' > app/main.py
git add -A
echo "--- staged ---"; git diff --cached --name-status
echo "--- branch ---"; git rev-parse --abbrev-ref HEAD
echo "--- history ---"; git log --oneline -5
