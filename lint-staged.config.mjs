export default {
  // Generic baseline shared by every Big Emotion project. Projects append
  // their own rows below (custom gates, generated-file checks) and keep these
  // two first, so the baseline stays diff-able against the standard.
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "tsx scripts/lintReqAnnotations.ts --staged",
    // PROJECT-SPECIFIC: new reader-facing French belongs in a dictionary
    // (REQ-145). Staged-scoped and grandfathered, so it blocks only the
    // literals this commit adds.
    "tsx scripts/ci/checkCopyLiterals.ts --staged",
  ],
  "*.{css,md,json,mjs}": ["prettier --write"],

  // PROJECT-SPECIFIC: this repo also carries plain JS/JSX (scripts, config)
  // and YAML workflow definitions, both covered by the previous setup.
  "*.{js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{yml,yaml}": ["prettier --write"],
};
