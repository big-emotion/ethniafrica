# Runbook — named-person candidate extraction

Proposes named-person review candidates from AFRIK people-fiche prose (DEC-031, ARCH-018). This
covers the **extraction** half of the pipeline only: turning fiche text into candidates a human
can review. It never writes to Supabase and never touches `dataset/source/afrik/`.

---

## Why semi-automated

The corpus cites an estimated 600–900 named people across ~320+ fiches. Extracting them by hand is
not sustainable, but publishing automatically extracted candidates without control would reproduce
the unverified `ai_generated` risk at the scale of hundreds of entities. DEC-031 settles the
trade-off: a software pass proposes candidates anchored to their verbatim source sentence, and no
entry reaches the database without explicit human validation, which assigns the candidate its real
source tier.

## Run the extraction pass

```bash
npx tsx scripts/extractPersonCandidates.ts [output-path]
```

- Defaults to scanning `dataset/source/afrik/peuples/**/PPL_*.json` and writing
  `.tmp/person-candidates.json` (gitignored — never committed).
- The command refuses to write anywhere inside `dataset/source/afrik/`
  (`extractPersonCandidatesToArtifact` throws rather than touch the corpus).
- Deterministic: re-running with the same corpus and output path produces byte-identical output.

## What a candidate looks like

Every entry in `candidates[]` (`scripts/lib/personCandidateTypes.ts`) carries:

| Field                          | Meaning                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `name` / `normalizedName`      | The detected name, as written, and a case/accent-folded identity key            |
| `roleCue`                      | The role word (e.g. `roi`, `chef`, `explorateur`) that triggered detection      |
| `sourceFicheId`, `sourcePath`  | Which fiche and which JSON field the sentence came from                         |
| `verbatimPassage`              | The exact sentence the candidate was extracted from — **never empty** (REQ-126) |
| `inheritedTier` / `sourceKind` | The source tier bound to the passage, or `null` when it cannot be resolved      |
| `tierResolution`               | `single_source` \| `uniform_bound_sources` \| `review_required`                 |
| `reviewStatus`                 | Always `"unreviewed"` on extraction — the pipeline never sets `approved` itself |

A candidate is a proposal, not a fact: expect false positives (place names, titles without a named
individual) alongside real hits. That is by design — precision is the reviewer's job, not the
extractor's.

## The review gate (blocking, not optional)

Nothing downstream may read a candidate straight off the extraction artifact. A human reviewer:

1. Reads each candidate's `verbatimPassage` and `sourceCandidates`.
2. Sets `reviewStatus` to `"approved"` or `"rejected"`.
3. Only `scripts/lib/personCandidateReview.ts#selectPublishableCandidates` decides what is eligible
   for publication — it requires `reviewStatus === "approved"` **and** a resolved `inheritedTier`
   with no outstanding `review_required`-style flag. An approved candidate inherits the tier of the
   source of the passage it came from; it is never assigned the `ai_generated` tier.

Loading an approved candidate into the `persons` table (migration
`057_person_schema.sql`) — including assigning a `PER_*` id, `roleCategory`, and an `assertion_id`
backed by a real source — is a separate, later step and is out of scope for this runbook.

## Tests

```bash
npx vitest run scripts/__tests__/personCandidateDetection.test.ts
npx vitest run scripts/__tests__/personCandidateSourceTier.test.ts
npx vitest run scripts/__tests__/personCandidateReview.test.ts
npx vitest run scripts/__tests__/extractPersonCandidates.test.ts
```
