#!/bin/bash
# Dou Yun — push workspace changes to GitHub
# Usage: bash git-push.sh "commit message"
# If no message given, uses a timestamp default.

WORKSPACE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$WORKSPACE_DIR"

MSG="${1:-"Workspace update — $(date '+%Y-%m-%d %H:%M')"}"

git add -A
git commit -m "$MSG" || echo "Nothing to commit."
git push origin main
