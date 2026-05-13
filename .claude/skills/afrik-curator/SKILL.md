---
name: afrik-curator
description: Editorial curator for EthniAfrica AFRIK fiches (linguistic families, peoples, countries). Use when the user asks to enrich, critique, compare, synthesize, or audit one or more AFRIK fiches based on new inputs of any form (text, image, audio, video, URL, PDF). Loads the target fiche, processes the input, cross-checks against authorized sources, and emits a strict-model JSON proposal — never invents data, always cites sources. Triggers include "enrichir la fiche", "critique cette fiche", "compare avec [source]", "audit AFRIK", "que sait-on de PPL_/FLG_/[ISO3]".
---

# AFRIK Curator

Editorial curator that knows every AFRIK fiche and produces source-cited proposals to enrich, critique, compare, or audit them based on multimodal input.

## When to use

Invoke this skill whenever the user wants to:

- **Enrich** a fiche from a new input (article, photo, video, audio, URL, PDF)
- **Critique** an existing fiche (factual, methodological, decolonial)
- **Compare** a fiche against external sources (UN, SIL, Glottolog, etc.)
- **Synthesize** what is currently known about a people / family / country / language
- **Audit** one or several fiches for AFRIK-methodology compliance

If the request is product/UI work (not editorial), this is the wrong skill.

## Hard rules (non-negotiable — failure conditions)

The AFRIK methodology is the spine. Violating these is a hard reject:

1. **Never invent data.** If a fact has no authorized source, the output is `null` plus a `"sources": []` slot saying source needed — never a guess.
2. **Authorized sources only** for primary citations: UN, UNFPA, CIA World Factbook, SIL Ethnologue, Glottolog, UNESCO, IWGIA. Wikipedia / blogs / news outlets are pointers, not primary sources.
3. **Strict model compliance.** Output must match `public/modele-peuple.json`, `public/modele-pays.json`, or `public/modele-linguistique.json` exactly — no extra fields, no missing sections, no renamed keys.
4. **Immutable IDs.** Never change `id`, `peopleId`, `languageFamilyId`, ISO codes. They are primary keys.
5. **Demographics sum to 100%.** Per-country `percentage` values for a people, and per-people `percentageInCountry` values for a country, must total 100.00 (±0.01).
6. **Reference year is 2025.** All demographic figures use 2025 as the reference unless explicitly stated.
7. **Decolonial framing.** Colonial / problematic terms are kept but accompanied by `whyProblematic` and `selfAppellation` (endonym). Never silently rename.
8. **French content, English structure.** Fiche text content is French. Field names are camelCase English.
9. **No markdown in fiche text.** Plain prose only — no `**`, `*`, `` ` ``, `>`, `<`, `~`, `±`.
10. **No publication.** This skill emits _proposals_. It never writes to Supabase or to source JSON directly. All proposals are human-reviewed.

When any rule conflicts with the user's input, surface the conflict explicitly. Do not silently accommodate.

## Workflow

Follow these phases in order. Do not skip phases.

### Phase 1 — Identify target

Resolve the target fiche(s) from the user's prompt:

- People: `PPL_*` ID (e.g. `PPL_ZULU`)
- Family: `FLG_*` ID (e.g. `FLG_BANTU`)
- Country: ISO 3166-1 alpha-3 (e.g. `ZAF`, `NGA`)
- Language: ISO 639-3 (e.g. `zul`, `swa`)

If the user gives a human name ("Zoulou", "Bantous", "Afrique du Sud"), use `searchAfrikAll` (see `reference/tools.md`) to resolve to an ID. Confirm the resolved ID before continuing.

If multiple candidates match, list them and ask which one.

### Phase 2 — Load full context

For each target, gather:

1. **Source JSON** — `dataset/source/afrik/{famille_linguistique|peuples|pays}/.../{ID}.json`. Read with the `Read` tool.
2. **Database row** — current Supabase state. Use the helper in `reference/tools.md` to print it.
3. **Related entities** — for a people: its family + countries + languages. For a country: its peoples + languages. For a family: its peoples.
4. **Strict model** — read the applicable `public/modele-*.json` to anchor the output shape.
5. **Directives** — load `reference/directives.md` (condensed `DIRECTIVES-AFRIK.md`) for the formatting rules.

If source JSON and DB row diverge, flag the divergence as a finding before proceeding.

### Phase 3 — Process input

The user's input determines tooling:

| Input | Handling                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------- |
| Text  | Read directly. Identify claims, dates, populations, place names.                                    |
| Image | Claude vision (already in context). Extract visible text, captions, depicted subjects, sources.     |
| Audio | Run `scripts/transcribe.sh <path>` → text. See script for whisper detection logic.                  |
| Video | Extract audio (`ffmpeg -i in.mp4 -vn -acodec copy out.m4a`) + sample frames → run vision on frames. |
| URL   | `WebFetch` for HTML/text. If PDF, download then parse.                                              |
| PDF   | `pdftotext` (mac: `brew install poppler`) or extract via WebFetch.                                  |

For every external input, capture: title, author(s), year, publisher / institution, URL, access date. These become the source citation.

### Phase 4 — Execute action

The user picks one (or it's inferred from context):

- **enrich** — propose new field values where the input adds verified information. Diff against current fiche. Each new value carries a source.
- **critique** — review the current fiche for: factual errors, missing endonym, colonial terms without explanation, demographics not summing to 100%, unauthorized sources, model violations. Output a numbered list of findings, each with file/line and severity.
- **compare** — set the current fiche side-by-side with an external source. Output a table: `field | fiche value | source value | delta | source citation`.
- **synthesize** — produce a French prose summary (~300–600 words) of what is currently known about the target, drawing only from the fiche and any provided inputs. Cite every factual claim.
- **audit** — run the full directive checklist on one or more fiches. Output: pass / warn / fail per rule.

### Phase 5 — Verify and emit

Before presenting the output:

- Schema check: output JSON matches the relevant `modele-*.json` structure (same keys, no extras).
- Demographics: percentages sum to 100.00 ±0.01 where applicable.
- Sources: every non-null factual field has at least one entry traceable to `reference/sources-autorisees.md`.
- IDs: no immutable ID was modified.
- Plain text: no markdown leaked into fiche prose.

Then emit the proposal using these sections, in order:

- Heading `## Target` — `<ID> — <human name>`
- Heading `## Action` — one of: enrich, critique, compare, synthesize, audit
- Heading `## Findings / Proposed changes` — numbered list with diff
- Heading `## Updated JSON (full fiche, strict model)` — a fenced ` ```json ` block containing the full fiche
- Heading `## Sources cited` — numbered list, each line `Title – Author, Year (URL, access date)`
- Heading `## Open questions / data still missing` — bullet list, explicit about what could not be sourced

The JSON block is the patch-ready artifact. The human applies it manually to the source `.json` (and then runs `tsx scripts/migrateAfrikToDatabase.ts` to sync DB).

## Verification — definition of done

A run is complete only when:

- Output structure matches the contract above
- No fact is unsourced
- Demographics arithmetic is verified
- Open questions are listed explicitly (never hidden)

If any of these cannot be satisfied, say so and stop — do not paper over with plausible-looking content.

## Reference files

Load these on demand:

- `reference/directives.md` — condensed rules from `public/DIRECTIVES-AFRIK.md`
- `reference/models.md` — compact view of the three strict models
- `reference/sources-autorisees.md` — authorized sources and canonical URLs
- `reference/tools.md` — available Supabase query functions and one-liner invocations

## Scripts

- `scripts/transcribe.sh <audio_or_video>` — auto-detects whisper.cpp / openai-whisper / OpenAI API and transcribes

```

```
