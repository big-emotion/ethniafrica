## Summary

<!-- What changed and why. -->

## Test plan

<!-- How this was validated: tests run, manual checks, screenshots. -->

## Quiz session — manual a11y pass (release PRs only)

Only relevant if this PR is the release PR shipping Epic 10 (the quiz
journey) or otherwise touches `/fr/quiz` and its session loop. See
[`docs/a11y-manual-quiz.md`](../docs/a11y-manual-quiz.md) for the full
procedure (FR71, NFR20, UX-DR43). Leave unchecked/N/A on unrelated PRs.

- [ ] VoiceOver (iOS Safari, FR) — full segment → 8 questions → score journey
- [ ] NVDA (Windows Firefox, FR) — full segment → 8 questions → score journey
- [ ] 200% browser zoom — no horizontal scroll, no clipped content
- [ ] Deuteranopia/protanopia simulation on the verdict states — meaning isn't conveyed by color alone

Notes / issues found:
