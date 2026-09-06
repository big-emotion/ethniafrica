# Country enrichment

A repeatable, resumable pass over one country — its identity, its peoples, its
languages, its history, its names, its sources and its reachability by a reader. The
control surface is `docs/editorial/country-enrichment/`, one tracker per country, named
with the immutable ISO 3166-1 alpha-3 code.

Enter this mode on: "enrich this country", "audit country completeness", "continue
country COD", "prepare the next country", "country-by-country enrichment", "build the
people/language/history inventory for X".

## The rule that shapes everything else: no global score

A country never receives one undifferentiated completeness figure. A structurally full
fiche can still omit most peoples, rest on unruled sources, and expose no language link —
one number would average those into a reassurance nobody can act on. Six dimensions stay
independent, and stay independent in the report as well as in the tracker:

| Dimension                         | Answers                                                                     | Does not answer                                  |
| --------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| **Structural fill**               | which model sections carry data                                             | whether the data is true or deep                 |
| **Inventory coverage**            | how many local records reconcile against an enumerated reference            | anything, when the reference is a headline count |
| **Evidence quality**              | which claims rest on `official` / `referenced` sources with resolvable URLs | whether the claim is correct                     |
| **Relationship integrity**        | valid IDs, current classifications, country and related fiches agreeing     | whether a duplicate is really a duplicate        |
| **Reader discoverability**        | which documented entities can actually be reached and selected              | how the surface should look                      |
| **Freshness and synchronization** | whether source JSON, database and UI labels agree                           | which of them is right — the fiche on disk wins  |

### When an exact inventory percentage is allowed

Only when all four hold:

1. the reference inventory is **enumerated**, record by record, not a headline total;
2. its **scope is recorded** — which entities it counts, at which date, under which
   definition;
3. **every local record has been reconciled** against it, one at a time;
4. **aliases, endonyms, exonyms, duplicates, macro-groups and subgroups have been
   handled**, each decision written down.

Short of that, dividing two headline counts yields a **raw upper bound** and must be
labelled as one — it cannot see a duplicate, a false country link, or a macro-category
counted as a people. `rawReferenceUpperBoundPercent` in the snapshot is that number, and
its name is the warning.

### Signals are prompts, never proof

A shared ISO code, a similar name, a people label matching a language label: each is a
reason for a human to look. None establishes that two fiches are the same people, that a
fiche is really a language, or that a link is wrong. `automatedFlags` in the ledger is a
queue for review. The conclusion goes in `review`, written by an editor.

## The ten workstreams

Work them in this order; the earlier ones constrain the later ones. Each keeps its own
status in the tracker, so a session can stop anywhere and the next one resumes.

1. **Identity and naming** — ISO ID, common name, official name, aliases, and whether
   source JSON, database row and UI label say the same thing. A resolver that
   substitutes its own label for the editorial one is an identity defect, not a display
   detail.
2. **Peoples** — build a reconciled inventory. Distinguish an individual people, a
   subgroup, an ethnolinguistic label, and a macro-category. The ledger is the artifact.
3. **Languages** — reconcile by ISO 639-3 and Glottocode. Distinguish official,
   national, vehicular, community, sign, historical and immigrant roles; a country's
   `culture.mainLanguages` is filled only after those roles are separated.
4. **Archaeology and history** — an archaeological sequence is not a kingdom list. Give
   the deep past its own track before the best-known polities.
5. **Historical names** — sourced and periodized. A former name without a period is an
   assertion floating free of its century.
6. **Political entities and kingdoms** — precolonial polities, colonial administrations
   and modern states are three different things. Do not store them in one `kingdoms`
   array and call the job done; where the model forces it, record the conflation as an
   open question.
7. **Patronyms** — report **breadth** (how many are directly attested for the country)
   and **documentation depth** (how many meet the documented-depth definition)
   separately. A quota met at 100 % breadth says nothing about depth. Keep direct
   country attestation apart from country reach inferred through a people.
8. **Source quality** — every retained factual claim carries an explicit tier. A
   `needs_review` entry is classified, never flattened: labelling a national census
   `unverified` drops it from 1.0 to 0.4. See `source-tiers.md`.
9. **Database synchronization status** — verified, or `not_verified` with the reason.
   Never asserted from a runbook.
10. **Reader discoverability** — record which verified entities a reader cannot reach or
    select from the country surface.

**Workstream 10 records; it does not implement.** The curator writes the gap — "these 41
verified peoples have no individually selectable path from the country page". The visual
and frontend answer belongs to `/afrik-art-director` and the frontend workflow, judged
**mobile first** (430 px), then tablet, then desktop. Writing CSS here is out of scope.

## Generated observation or editorial decision

The tracker holds both, and they must never be confused.

- **Generated** — the whole `snapshot` block, the ledger's `summary`,
  `sharedIsoCodeClusters`, `linkEvidence`, `countrySurfaces`, `sourceEvidence` and
  `automatedFlags`. Recomputed from the corpus on every refresh; editing one by hand is
  pointless, it is overwritten.
- **Editorial** — `references`, `workstreams`, `openQuestions`, `databaseSync`, and every
  `entries[].review` in the ledger. Written by a human, preserved across refreshes.

`updateCountryPeopleLedger.ts` preserves `entries[].review` by id on regeneration. That
guarantee is load-bearing: a pass that discarded review decisions would make the ledger
unusable after its first refresh.

## Commands

```bash
# Initialize a country — creates the tracker and its people ledger
npx tsx scripts/afrik/initCountryEnrichment.ts <ISO3>
npx tsx scripts/afrik/initCountryEnrichment.ts <ISO3> --force   # overwrite an existing tracker

# Refresh the generated snapshot, preserving references, workstreams and open questions
npx tsx scripts/afrik/updateCountryEnrichmentTracker.ts <ISO3>            # preview
npx tsx scripts/afrik/updateCountryEnrichmentTracker.ts <ISO3> --write

# Regenerate the people ledger, preserving every entries[].review decision
npx tsx scripts/afrik/updateCountryPeopleLedger.ts <ISO3>                 # preview
npx tsx scripts/afrik/updateCountryPeopleLedger.ts <ISO3> --write
```

Without `--write` each command prints what it would produce and changes nothing. The
calculation is deterministic for a given corpus; only `updatedAt` moves. Any change to a
calculator is test-first.

Initialization writes no country-specific fact. It creates the ten workstreams at
`not_started`, the reference slots empty, `databaseSync.status` at `not_verified`, and the
open questions every country has to answer. Sourcing them is editorial work, done after.

## Resuming

1. Read `docs/editorial/country-enrichment/<ISO3>.json`.
2. Refresh the snapshot (preview first) so the numbers describe today's corpus.
3. Take the highest-priority workstream not `resolved`, lowest `id` breaking a tie.
4. Read its `remaining` list — that is the resume point, written by the previous pass.
5. Do the work. Move findings into `findings`, what is left into `remaining`, and update
   `status`.
6. Anything you could not settle becomes an entry in `openQuestions`, phrased as a
   question with a decidable answer.

## Validating a proposal, and where to stop

Before presenting anything:

```bash
npx tsx scripts/validateAfrikData.ts        # models + integrity, all classes
npx tsx scripts/ci/checkEditorialRules.ts   # autonym, sourcing on contested fiches
npx tsx scripts/checkSourceUrls.ts          # source URLs resolve
```

Then **stop**. The pass ends with a proposal and an updated tracker. It does not write to
Supabase. Loading the corpus is a deliberate, separately authorized act
(`migrateAfrikToDatabase.ts --target=…`, `docs/runbooks/afrik-data-sync.md`), and this
mode never performs it on its own initiative.

## When is a country complete

Complete only when every line holds. Anything unresolved stays visible as a workstream or
an open question — a gap is a fact about the corpus, and manufacturing data to close one
is the single failure this corpus cannot absorb.

1. Identity labels agree across source JSON, database and UI.
2. Every local people-country relation has been reviewed and classified.
3. Reconciliation against an enumerated reference inventory is documented, scope included.
4. Macro-groups, peoples, subgroups and language labels are distinguished from one another.
5. Verified peoples are individually discoverable from the country surface.
6. Official, national, vehicular and community languages are distinguished.
7. History separates archaeology, precolonial polities, colonial administrations and
   modern states.
8. Historical names are sourced and periodized.
9. Patronym breadth and documentation depth are reported separately.
10. Every factual claim carries an explicit source tier.
11. The source JSON passes the AFRIK validators.
12. Database synchronization is verified, not assumed.
13. Reader paths are checked at mobile, tablet and desktop widths.

## Historical nomenclatures

A colonial-era nomenclature is a historical inventory, not a contemporary
self-identification authority and not a creation queue. It may support alias linkage and
historical comparison **after critical review**, and what it contributes is recorded as
such — with the printed label, its page, and the caveat that limits the comparison. The
DRC's van Bulck list is the worked example; see the extractor documented in
`docs/editorial/country-enrichment/README.md`.
