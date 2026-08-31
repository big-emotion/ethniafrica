#!/usr/bin/env bash
#
# PostToolUse hook: lint one file the moment it is edited.
#
# The pre-commit hook already runs eslint over the staged set, but a commit can
# be many edits late — and `--no-verify`, a GitHub web edit or an agent push all
# walk past it. Linting at the edit is what turns "CI went red ten minutes
# later" into "that line was wrong as I wrote it".
#
# Reads the hook payload on stdin. Exits 2 on an eslint error it could not
# auto-fix, which is the exit code that feeds the message back to Claude.

set -uo pipefail

file=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

# Claude also edits ~/.claude, scratch dirs and worktrees of other projects;
# linting those with this repo's config is meaningless at best.
case "$file" in
"$PWD"/*) ;;
*) exit 0 ;;
esac

case "$file" in
*.ts | *.tsx | *.js | *.jsx | *.mjs) ;;
*.css | *.md | *.json | *.yml | *.yaml)
  npx prettier --write --cache --cache-strategy content "$file" >/dev/null 2>&1
  exit 0
  ;;
*) exit 0 ;;
esac

npx prettier --write --cache "$file" >/dev/null 2>&1

# eslint exits non-zero on errors only, never on the ~89 warnings this repo
# still carries, so a failure here is always something worth stopping for.
# Same cache location and strategy as `npm run lint`, so this shares that
# cache instead of dropping a second .eslintcache at the repo root.
if ! output=$(npx eslint --fix --cache --cache-strategy content \
  --cache-location node_modules/.cache/eslint/ "$file" 2>&1); then
  {
    echo "eslint found errors it could not auto-fix in ${file#"$PWD"/}:"
    echo "$output"
  } >&2
  exit 2
fi

exit 0
