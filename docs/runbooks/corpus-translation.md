# Corpus translation runbook

The French AFRIK corpus under `dataset/source/afrik/` remains the source of
truth. English records mirror it under `dataset/translations/en/`; translation
readiness does not publish English or change `SITE_LOCALE_MODE`. A deployment
with missing or invalid configuration stays `fr-only`.

## Translate a record

Resolve the intended record before translating it, then use the repository
command. It reads the strict model, classifies every leaf, preserves invariant
fields and writes a full-record sidecar with provenance.

```bash
npm run translate:record -- --id PPL_ASANTE --lang en --dry-run
npm run translate:record -- --id PPL_ASANTE --lang en
```

For a batch, point `--batch` inside the source corpus. Keep the default
concurrency unless a provider limit requires less.

```bash
npm run translate:record -- --batch dataset/source/afrik/langues --lang en --dry-run
```

## Handle source drift

The sidecar stores a source hash and one hash per translated field. When the
French source changes, inspect the named fields and regenerate only those
leaves:

```bash
npm run translate:record -- --id PPL_ASANTE --lang en --drift
```

Do not edit hashes to make the gate green. They record what a translation was
made from.

## Defer deliberately

A changed French record may temporarily have no English sidecar only when the
source carries a non-empty reason:

```json
{
  "_translation": {
    "deferred": {
      "en": "Awaiting legal review of the terminology."
    }
  }
}
```

The exact path is `_translation.deferred.en`. The gate reports the reason as a
notice; an empty reason fails. Remove the marker when the sidecar lands. UI
dictionary keys cannot use this deferral.

## Verify

The bare command surveys the full backlog and always exits zero. Use it for an
inventory, not as proof that a change is ready:

```bash
npm run check:translation-parity -- --all
```

The staged and base modes are blocking. They check changed corpus pairs in both
directions, source drift, every registered UI dictionary and the bilingual
glossary.

```bash
npm run check:translation-parity -- --staged
npm run check:translation-parity -- --base origin/recette
```

Before committing, stage the source and sidecar together and run the staged
command. CI repeats the base form against the pull request target.

## Human review

Machine output remains `kind: "machine"`. Every path listed in
`reviewRequired` must be read by a named person before provenance may become
`machine_reviewed`. Follow `.claude/skills/afrik-translator/` for classification,
glossary and register rules. Neither the command nor the skill writes to
Supabase or changes locale publication.

Collect those paths into one readable package rather than opening both trees
side by side:

```bash
npx tsx scripts/afrik/buildReviewPackage.ts --lang en
npx tsx scripts/afrik/buildReviewPackage.ts --lang en --id NGA --id PPL_HAUSA
npx tsx scripts/afrik/buildReviewPackage.ts --lang en --out docs/editorial/review/wave-1.md
```

It prints the French source and the English proposal adjacent on every
`reviewRequired` path, with the provenance the reviewer signs off against. It
reads only: it cannot set `machine_reviewed`, and it names no reviewer, because
a tool able to promote provenance would make the human step unverifiable.

A path the package marks **unresolved** is absent from the French source. That
is a stale review list, not a translation to read — report it rather than
approving it.
