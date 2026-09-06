# Country enrichment tracking

This directory is the repeatable control surface for enriching the 54 AFRIK
country fiches. Each country has one machine-readable tracker named with its
immutable ISO 3166-1 alpha-3 code.

The editorial mode that drives it is `country-enrichment` in the `afrik-curator`
skill; the workstreams, the resume protocol and the definition of a complete
country live in `.claude/skills/afrik-curator/reference/country-enrichment.md`.

## Measurement doctrine

A country must never receive one undifferentiated "completeness score". A
structurally full fiche can still omit most peoples, use weak sources, or expose
no language links. The tracker therefore keeps six independent dimensions:

1. **Structural fill** — required fiche sections that contain data. This only
   detects empty sections; it does not measure truth or depth.
2. **Inventory coverage** — local entities reconciled against an enumerated
   reference inventory. Approximate reference counts produce an upper bound,
   never an exact completion percentage.
3. **Evidence quality** — claims backed by `official` or `referenced` sources,
   with resolvable URLs where the source is online.
4. **Relationship integrity** — valid IDs, current classifications, duplicate
   resolution, and agreement between country and related fiches.
5. **Reader discoverability** — documented entities that can actually be
   reached and selected from the country surface.
6. **Freshness and synchronization** — source JSON, database state, and UI
   labels agree.

An exact inventory percentage requires record-level reconciliation: local IDs
must be matched to reference entries with aliases, endonyms, exonyms, and
macro/subgroup distinctions. Dividing two headline counts is reported only as
a raw upper bound because it cannot detect duplicates or false country links.

## Source policy

Nothing is forbidden; everything is labelled. A source is never rejected for
being weak — it is tiered, and the fiche's confidence follows from the tiers it
rests on. The gate is that **every source carries an explicit tier**: `official`,
`referenced`, or `unverified`. An entry with no tier is a blocking error.

Aggregators, community accounts, and tertiary encyclopedias are therefore cited,
at `unverified`, rather than used as leads and discarded. Excluding oral,
community, and amateur knowledge would itself be a colonial filter. The one thing
that is never cited is Wikipedia: it identifies leads, and the primary source
found through it is cited at its own tier, by its own URL, with the crossed
language versions recorded in `notes`.

Tier is authority; `source_kind` is provenance. They are orthogonal and must not
be collapsed — AI-generated text is `tier: "unverified"` plus
`source_kind: "ai_generated"`, and the weights multiply.

`tier: "needs_review"` is not a tier. It marks the tail nobody has ruled on, and
those entries are classified one at a time: labelling a national census
`unverified` would drop it from 1.0 to 0.4. The full doctrine is
`.claude/skills/afrik-curator/reference/source-tiers.md`.

Every numeric reference records:

- its scope;
- whether it is exact, enumerated, approximate, a lower bound, or an editorial
  quota;
- its publication or dataset version;
- its URL and access date;
- the caveat that limits comparison.

## Country workflow

Work through the following sequence and keep unresolved uncertainty explicit:

1. Confirm the ISO ID, common name, official name, aliases, and source/DB/UI
   synchronization.
2. Snapshot local data and run integrity checks before editing.
3. Build a canonical people inventory; distinguish peoples, subgroups,
   ethnolinguistic labels, and macro-categories.
4. Reconcile languages by ISO 639-3 and Glottocode; distinguish official,
   national, vehicular, community, sign, historical, and immigrant languages.
5. Separate archaeology, precolonial political entities, colonial
   administrations, and modern states instead of storing all of them as
   kingdoms.
6. Audit direct name attestations separately from names inferred through a
   people-country relation.
7. Give every retained claim an explicit source tier, upgrading where a better
   source exists; where none can be found, leave the field empty and write its
   gap in reader-facing prose.
8. Verify individual reader paths on mobile first, then tablet and desktop.
9. Re-run validators, update the tracker, obtain editorial review, and only then
   synchronize the database.

## Initialization

Open the control surface for a country that has none. It creates the tracker with
ten workstreams at `not_started`, empty reference denominators, and
`databaseSync.status` at `not_verified`, and generates the people ledger:

```bash
npx tsx scripts/afrik/initCountryEnrichment.ts COD
npx tsx scripts/afrik/initCountryEnrichment.ts COD --force   # overwrite an existing tracker
```

It refuses to overwrite an existing tracker without `--force`, because the
workstreams and open questions in one are editorial work, not generated output.
It writes no country-specific fact: sourcing the reference denominators is the
first task the tracker then organizes.

## Refresh command

Preview a snapshot without changing files:

```bash
npx tsx scripts/afrik/updateCountryEnrichmentTracker.ts COD
```

Update the generated `snapshot` block while preserving references, workstreams,
and open questions:

```bash
npx tsx scripts/afrik/updateCountryEnrichmentTracker.ts COD --write
```

The calculation is deterministic for a given corpus. Any implementation change
to the calculator must be test-first.

## People reconciliation ledger

Each country may also have an `<ISO3>-peoples.json` ledger. It records every
local people fiche that references the country, the exact location of that
link, source counts, country-page exposure, shared language codes, and
mechanically detectable review signals. Flags are prompts for editorial review;
they never establish that two fiches are duplicates or that a fiche represents
only a language.

Regenerate the ledger while preserving every existing `entries[].review`
decision:

```bash
npx tsx scripts/afrik/updateCountryPeopleLedger.ts COD --write
```

The default command without `--write` previews the complete generated ledger.
An exact people-inventory recall percentage remains forbidden until every local
entry has been reconciled against an enumerated reference inventory at record
level.

## Historical nomenclature extraction

Historical inventories are stored as separate source artifacts. They may help
with aliases and earlier classifications, but they are never treated as current
self-identification authorities or as automatic creation queues.

The DRC van Bulck extractor reads List IV from a locally supplied copy of the
archived PDF:

```bash
npx tsx scripts/afrik/extractVanBulckCodInventory.ts <pdf-path> --write
```

It preserves the printed label and page, removes only the source's explicitly
marked grammatical prefix, and performs exact matching against declared local
names and aliases. Ambiguous and unmatched entries remain review material.
