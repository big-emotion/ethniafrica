#!/usr/bin/env bash
#
# Provision a git worktree so it can run the app and the gates on its own.
#
# Three things a `git worktree add` does not carry over, and each one fails in
# a way that reads as a defect in the branch under work rather than a missing
# environment:
#
#   node_modules   `vitest`, `tsc` and `eslint` resolve upward into the main
#                  checkout and appear to work — which is worse than failing,
#                  because a dependency the worktree never installs still
#                  resolves, and CI is the first to see the missing package.
#                  `next dev` and `next build` do not resolve upward at all:
#                  `next.config.ts` pins `turbopack.root` to the worktree, and
#                  Turbopack refuses anything whose realpath sits outside it.
#                  A symlink does not satisfy it either — the realpath still
#                  lands outside — so the directory has to be real.
#   .env.local     gitignored, so the worktree starts with no Supabase
#                  credentials and every page renders an empty corpus.
#   core.hooksPath husky lives in the gitignored `.husky/_`, so commits from a
#                  worktree would skip commitlint and lint-staged.
#
# On APFS `cp -c` clones by reference: the 1.1 GB copy takes ~20 s and costs
# no disk until a file is modified, which never happens to node_modules. That
# is what makes one real directory per worktree affordable at forty worktrees.
#
# Idempotent: anything already present is left alone. Safe to run from a hook.
#
# Usage:
#   scripts/setup-worktree.sh [worktree-path]
#
# With no argument it provisions the current directory. When the current
# directory is not a linked worktree it falls back to the `cwd` field of a
# Claude Code hook payload on stdin, which is how the PostToolUse hook on
# EnterWorktree reaches the worktree the session just moved into.

set -euo pipefail

ENV_FILES=(".env.local" ".env")

target="${1:-}"

if [[ -z "$target" ]]; then
  target="$PWD"
  # `--git-common-dir` differs from `--git-dir` only inside a linked worktree.
  if [[ "$(git rev-parse --git-dir 2>/dev/null || echo x)" == \
        "$(git rev-parse --git-common-dir 2>/dev/null || echo y)" ]]; then
    if [[ ! -t 0 ]]; then
      hook_cwd="$(sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
      [[ -n "$hook_cwd" ]] && target="$hook_cwd"
    fi
  fi
fi

if [[ ! -d "$target" ]]; then
  echo "setup-worktree: no such directory: $target" >&2
  exit 1
fi

cd "$target"

git_dir="$(git rev-parse --absolute-git-dir 2>/dev/null || true)"
common_dir="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"

if [[ -z "$common_dir" ]]; then
  echo "setup-worktree: $target is not a git repository — nothing to do"
  exit 0
fi

if [[ "$git_dir" == "$common_dir" ]]; then
  echo "setup-worktree: $target is not a linked worktree — nothing to do"
  exit 0
fi

main_checkout="$(dirname "$common_dir")"

if [[ -e node_modules ]]; then
  echo "setup-worktree: node_modules already present"
elif [[ ! -d "$main_checkout/node_modules" ]]; then
  echo "setup-worktree: $main_checkout has no node_modules — run npm install there first" >&2
else
  echo "setup-worktree: cloning node_modules from $main_checkout"
  # -c asks APFS for a clonefile; it fails outright on filesystems without
  # copy-on-write, where a plain recursive copy is the only option.
  cp -Rc "$main_checkout/node_modules" node_modules 2>/dev/null ||
    cp -R "$main_checkout/node_modules" node_modules
fi

for env_file in "${ENV_FILES[@]}"; do
  if [[ -e "$env_file" ]]; then
    echo "setup-worktree: $env_file already present"
  elif [[ -f "$main_checkout/$env_file" ]]; then
    cp "$main_checkout/$env_file" "$env_file"
    echo "setup-worktree: copied $env_file"
  fi
done

hooks_path="$(git -C "$main_checkout" config --get core.hooksPath || true)"
if [[ -n "$hooks_path" ]]; then
  [[ "$hooks_path" = /* ]] || hooks_path="$main_checkout/$hooks_path"
  git config core.hooksPath "$hooks_path"
  echo "setup-worktree: git hooks point at $hooks_path"
fi

echo "setup-worktree: $target ready"
