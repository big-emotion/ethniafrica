# AFRIK tools — available functions and invocation patterns

The curator does not write any new query code. All reads go through existing project utilities. Use `tsx` from the project root so the `@/` path alias resolves.

## Reading the source JSON (fastest path)

```bash
# People
cat dataset/source/afrik/peuples/<FLG_*>/<PPL_*>.json

# Country
cat dataset/source/afrik/pays/<ISO3>.json

# Linguistic family
cat dataset/source/afrik/famille_linguistique/<FLG_*>.json
```

Prefer the `Read` tool over `cat`.

## Resolving a name to an identifier

```bash
npx tsx scripts/resolveAfrikFiche.ts "Zoulou"
# PPL_ZULU	people	exact	nameMain=Zoulou
```

Columns: `ID · kind · match type · matched name`. Match types rank `id` → `exact` → `contains` → `partial` (`partial` is the French plural falling back onto the singular the corpus declares — "Bantous" onto `FLG_BANTU`). Exit code 1 and a message on stderr when nothing matched.

It searches every declared name of all four fiche classes: a people's `nameMain`, `mainName`, `selfAppellation`, `exonyms`, `historicalNames` and `spellingAliases`; a country's `nameFr`, `nameOfficial` and `historicalNames`; a family's `nameFr`/`nameEn`; a language's `nameFr`, `nameEn`, `alternateNames` and `spellingAliases`.

It reads `dataset/source/afrik/` — the corpus in git, which is the editorial truth and the same files the curator edits. No credentials, and no dependence on a database having been loaded.

> This replaces `searchAfrikAll`, `searchAfrikPeoples`, `searchAfrikCountries` and `searchAfrikLanguageFamilies`. All four were removed when ranking moved into Postgres (migrations 043/044, then 069). Anything still naming them is stale.

## Live Supabase queries

Functions exported from `src/lib/supabase/queries/afrik/`:

| File                  | Functions                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `peoples.ts`          | `getAllAfrikPeoples`, `getAfrikPeopleById`, `getAfrikPeoplesByLanguageFamily`, `getAfrikPeoplesByCountry` |
| `countries.ts`        | `getAllAfrikCountries`, `getAfrikCountryById`, `getAfrikCountriesByIds`                                   |
| `languageFamilies.ts` | `getAllAfrikLanguageFamilies`, `getAfrikLanguageFamilyById`, `getAfrikLanguageFamilyRoster`               |
| `search.ts`           | `ftsSearchEntities` — ranked in Postgres; needs a request context, so prefer the resolver above           |
| `flags.ts`            | `getActiveSourceFlags`                                                                                    |

These need server-side Supabase credentials (`SUPABASE_SERVICE_ROLE_KEY`) and the `NEXT_PUBLIC_SUPABASE_*` env vars loaded. Use them to read what the _database_ currently holds — Phase 2's divergence check. To find out what the corpus declares, read the JSON.

### One-shot invocation from a Claude session

```bash
# Print a single people from the database
tsx -e "import('./src/lib/supabase/queries/afrik/peoples.ts').then(async m => { const p = await m.getAfrikPeopleById('PPL_ZULU'); console.log(JSON.stringify(p, null, 2)); })"

# All peoples of a family (for cross-checks)
tsx -e "import('./src/lib/supabase/queries/afrik/peoples.ts').then(async m => { const ps = await m.getAfrikPeoplesByLanguageFamily('FLG_BANTU'); console.log(ps.map(p => p.id).join('\n')); })"
```

If `tsx -e` chokes on env loading, fall back to a tiny one-off script in `scripts/` (do not create a new long-lived script — clean it up after).

A database read that comes back empty is a loaded-corpus question before it is a data question: recette is loaded by `recette-data-sync.yml` on a merge, production by `production-data-sync.yml` after a release.

## Existing project scripts (reusable)

| Script                              | Purpose                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| `scripts/validateAfrikData.ts`      | Validate AFRIK data integrity against the strict models |
| `scripts/checkSourceUrls.ts`        | Verify source URLs are reachable                        |
| `scripts/recomputeConfidence.ts`    | Recompute classification confidence scores              |
| `scripts/checkMigration.ts`         | Check that DB and source JSON are in sync               |
| `scripts/migrateAfrikToDatabase.ts` | Load source JSON into Supabase (human runs after merge) |
| `scripts/convertAfrikToJson.ts`     | Convert legacy formats to the JSON v2 format            |

Run with `tsx scripts/<name>.ts`. Use these before claiming an enrichment is consistent.

## Sanity checks the curator runs

Before emitting a proposal, run the relevant checks:

```bash
# Validate the entire AFRIK dataset (slow)
tsx scripts/validateAfrikData.ts

# Validate against a specific fiche (manual JSON.parse + schema check)
tsx -e "const j = JSON.parse(require('fs').readFileSync('dataset/source/afrik/peuples/FLG_BANTU/PPL_ZULU.json', 'utf8')); console.log(Object.keys(j), Object.keys(j.content));"
```

## Search and discovery

```bash
# Find all PPL_* matching a regex
find dataset/source/afrik/peuples -name 'PPL_*.json' | xargs grep -l "Mandingue" 2>/dev/null

# Count fiches per family
find dataset/source/afrik/peuples -mindepth 1 -maxdepth 1 -type d -exec sh -c 'echo "$(basename "$0"): $(ls "$0" | wc -l)"' {} \;
```
