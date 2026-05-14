# ADR-0001: FR28 demographic tolerance band — transition plan

- **Status**: Accepted
- **Date**: 2026-05-14
- **Issue**: [#131](https://github.com/big-emotion/ethniafrica/issues/131)

## Context

The AFRIK data doctrine in `CLAUDE.md` and `_bmad-output/project-context.md`
stated that, for every country fiche, the sum of
`content.demographics.peoples[].percentageInCountry` must equal **exactly 100%**.

The validator (`scripts/validateAfrikData.ts`, check **FR28**) does not enforce
that doctrine. It gates at the wider band **[95, 105]%**, originally chosen as
a soft landing while issue #105 re-sourced 30 countries' demographic splits.

As of 2026-05-14, **9 countries** sum to between 95.2% and 99.7% — they pass
FR28 but violate the doctrine: LBR, COD, SEN, MOZ, KEN, MWI, ETH, GAB, MLI, GHA.

Tightening FR28 to [99, 101]% immediately would fail validation for all 9 and
block the build. Leaving the doctrine at "exactly 100%" while the validator
accepts [95, 105]% keeps the two artifacts out of sync and makes the rule
unenforceable in practice.

## Decision

Adopt a two-band transition plan:

1. **Hard gate — FR28** stays at **[95, 105]%** (errors, fails validation).
   No tightening until every fiche fits the strict band.
2. **Soft warning — FR28-strict** added at **[99, 101]%** (warnings only,
   never fails the build). Surfaces fiches that pass FR28 but miss the
   doctrinal target.
3. **Doctrine wording** in `CLAUDE.md` and `_bmad-output/project-context.md`
   updated to describe the two bands and the transition target, replacing the
   unenforced "exactly 100%" phrasing.
4. **Exit path**: once the FR28-strict warning list is empty for a full
   validation run, FR28's hard gate will be tightened to [99, 101]% and the
   strict warning retired. Tracked in follow-up to issue #131.

## Consequences

**Positive**

- Doctrine and validator agree — contributors can trust either one.
- The 9 out-of-band countries surface as warnings on every run, creating
  steady pressure to close the gap without blocking the build today.
- KISS: one new function (`checkPopulationSumsStrict`), one new entry in the
  validator's check registry, no data files touched.

**Negative**

- Two bands instead of one until the migration completes — slightly more
  surface area to explain to new contributors.
- Soft warnings can be ignored. Mitigation: the ADR pins the exit criterion,
  and follow-up tickets track each non-conforming country.

**Out of scope**

- Re-sourcing the 9 country demographic splits (issues #129 and #130).
- Changes to `dataset/source/afrik/` data files.
