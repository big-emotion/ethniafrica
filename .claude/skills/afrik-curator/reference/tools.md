# Tools

The curator writes no query code. Every read goes through a function that already exists.
Run `tsx` from the repository root so the `@/` alias resolves.

Every function named here was checked against `src/` on 2026-09-02. The previous version of
this file listed four search functions that had been deleted, which made the skill fail at
its first step — so if you find a name here that does not resolve, fix this file rather than
working around it.

## Reading a fiche

The fiche on disk is the source of truth. Prefer the `Read` tool.

```
peuples/<FLG_*>/<PPL_*>.json      famille_linguistique/<FLG_*>.json
pays/<ISO3>.json                  langues/<iso639-3>.json
patronymes/<PAT_*>.json           noms/<PPL_*>.json
relations/<REL_*>.json            migrations/<MGR_*>.json
```

All under `dataset/source/afrik/`.

## Resolving a name to an ID

```bash
npx tsx scripts/resolveAfrikFiche.ts "Zoulou"
# PPL_ZULU	people	exact	nameMain=Zoulou
```

Columns: `ID · kind · match type · matched name`. Match types rank `id` → `exact` →
`contains` → `partial` (`partial` is the French plural falling back onto the singular the
corpus declares — "Bantous" onto `FLG_BANTU`). Exit code 1 and a message on stderr when
nothing matched.

It searches every declared name of the fiche classes: a people's `nameMain`, `mainName`,
`selfAppellation`, `exonyms`, `historicalNames` and `spellingAliases`; a country's
`nameFr`, `nameOfficial` and `historicalNames`; a family's `nameFr`/`nameEn`; a language's
`nameFr`, `nameEn`, `alternateNames` and `spellingAliases`.

It reads `dataset/source/afrik/` — the corpus in git, which is the editorial truth and the
same files the curator edits. No credentials, and no dependence on a database having been
loaded, which matters because recette's had not been for the fiches merged on 31 August 2026. It never guesses by similarity: a near-miss that silently won would send the curator
to edit the wrong fiche.

> **Removed — do not call.** This replaces four functions that no longer exist in `src/`:
> `searchAfrikAll`, `searchAfrikPeoples`, `searchAfrikCountries` and
> `searchAfrikLanguageFamilies`. All four were deleted when ranking moved into Postgres
> (migrations 043/044, then 069). Anything still naming them as a usable tool is stale.

A failed lookup usually means a missing `spellingAliases` entry, not a missing fiche —
they are filled on 12 fiches out of 800.

### Searching the database instead

`ftsSearchEntities` (`src/lib/supabase/queries/afrik/search.ts`) is the ranked search the
site itself uses: one call, ranked in Postgres, covering all seven kinds including
languages and patronymes. It needs credentials and a loaded database, so it answers "what
would a reader find?" rather than "which file do I edit?" — use it to check that an
enrichment is actually reachable through search, not to resolve an editing target.

## Reading the database row

| Module                | Functions                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `peoples.ts`          | `getAllAfrikPeoples`, `getAfrikPeopleById`, `getAfrikPeoplesByIds`, `getAfrikPeoplesByLanguageFamily`, `getAfrikPeoplesByCountry`, `getPaginatedAfrikPeoples`, `getAfrikPeopleCountryIndex`, `getPeopleCountsByLanguageFamily` |
| `countries.ts`        | `getAllAfrikCountries`, `getAfrikCountryById`, `getAfrikCountriesByIds`, `getAfrikCountryIds`                                                                                                                                  |
| `languageFamilies.ts` | `getAllAfrikLanguageFamilies`, `getAfrikLanguageFamilyById`, `getAfrikLanguageFamilyRoster`, `countAfrikLanguageFamilies`                                                                                                      |
| `languages.ts`        | `getAfrikLanguageById`, `getAfrikLanguagesByFamily`, `listAfrikLanguages`, `getAfrikSpeakingPeoples`, `countAfrikLanguages`                                                                                                    |
| `search.ts`           | `ftsSearchEntities`                                                                                                                                                                                                            |
| `flags.ts`            | `getActiveSourceFlags`                                                                                                                                                                                                         |

All under `src/lib/supabase/queries/afrik/`. Patronymes are served one level up, by
`getPatronymeById` and `listPatronymes` in `src/api/v2/services/patronymes.ts`.

These need `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` in the environment.

```bash
tsx -e "import('./src/lib/supabase/queries/afrik/peoples.ts').then(async m =>
  console.log(JSON.stringify(await m.getAfrikPeopleById('PPL_ZULU'), null, 2)))"

tsx -e "import('./src/lib/supabase/queries/afrik/languages.ts').then(async m =>
  console.log(JSON.stringify(await m.getAfrikLanguageById('wol'), null, 2)))"
```

If `tsx -e` chokes on environment loading, write a throwaway script under `scripts/` and
delete it afterwards. Do not leave a new long-lived script behind.

**The row can be stale.** Nothing loads the corpus into recette automatically
(ETNI-1818), so a difference between disk and database is expected there, and the disk wins.

## Gates to run before emitting

```bash
npx tsx scripts/validateAfrikData.ts        # models + integrity, all classes
npx tsx scripts/ci/checkEditorialRules.ts   # autonym, sourcing on contested fiches
npx tsx scripts/checkSourceUrls.ts          # source URLs resolve
```

`validateAfrikData.ts` runs per-class checks — `LNG-schema` for languages, `PAT-model` for
patronymes, the FR-numbered demography and coverage checks for peoples and countries. Only
`FR52-coverage` is advisory; everything else fails the build.

Other scripts that exist and are occasionally useful: `recomputeConfidence.ts`,
`checkMigration.ts`, `convertAfrikToJson.ts`.

## Loading into a database

```bash
npx tsx scripts/migrateAfrikToDatabase.ts --target=recette
```

The target argument is mandatory. `--target=staging` is retired and throws. Production is
loaded only deliberately, and its URL has no default — read
`docs/runbooks/afrik-data-sync.md` before touching it.

## Transcribing audio and video

There is no `transcribe.sh`. The old script probed for three engines, none of which is
installed on this machine, so it was removed rather than left to fail.

Use the **ElevenLabs MCP** `speech_to_text`. A Plaud recording can also be read through the
**Plaud MCP**, which additionally returns speakers, timestamps and any moments marked during
the recording.

For video, extract the audio first:

```bash
ffmpeg -i input.mp4 -vn -acodec copy audio.m4a
```

then transcribe, and sample frames separately if the images carry information.

## Finding things on disk

```bash
# every fiche mentioning a term
grep -rl "Mandingue" dataset/source/afrik/peuples/

# fiches per family
ls dataset/source/afrik/peuples/

# which language fiches leave a field empty
for f in dataset/source/afrik/langues/*.json; do
  jq -r 'select((.content.dialects | length) == 0) | .id' "$f"
done
```
