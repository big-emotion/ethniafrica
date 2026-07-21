export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "release",
        "revert",
        "style",
        "test",
      ],
    ],
    // Kept from the pre-standard config: subjects carry French accents and
    // proper nouns (AFRIK, FLG_BANTU) that case rules would reject, and audit
    // trailers in commit bodies routinely exceed the 100-char default.
    "subject-case": [0],
    "body-max-line-length": [0],
  },
};
