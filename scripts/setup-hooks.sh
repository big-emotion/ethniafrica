#!/bin/sh
# Run this script after npm install to set up git hooks manually if needed

# commit-msg hook: enforce Conventional Commits
cat > .husky/commit-msg << 'EOF'
#!/bin/sh
msg=$(cat "$1")
echo "$msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)" || {
  echo "Use Conventional Commits: <type>(<scope>)?: <desc>"
  echo "Types: feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert"
  exit 1
}
EOF
chmod +x .husky/commit-msg

# pre-push hook: run full test suite
cat > .husky/pre-push << 'EOF'
#!/bin/sh
npm run test || { echo "Tests failed - push aborted. Run: npm run test:watch"; exit 1; }
EOF
chmod +x .husky/pre-push

echo "Hooks installed!"
