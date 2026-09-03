# Editorial directives

Condensed. `public/DIRECTIVES-AFRIK.md` is the source of truth; read it when anything here
is ambiguous.

## Format

One JSON file per fiche, UTF-8, no comments. Keys are camelCase English, matching the
TypeScript types. Content prose is French.

## Identifiers — immutable

| Entity    | Form                 | Example      |
| --------- | -------------------- | ------------ |
| People    | `PPL_` + uppercase   | `PPL_YORUBA` |
| Family    | `FLG_` + uppercase   | `FLG_BANTU`  |
| Country   | ISO 3166-1 alpha-3   | `NGA`, `ZAF` |
| Language  | ISO 639-3, lowercase | `yor`, `wol` |
| Patronyme | `PAT_` + uppercase   | `PAT_KEITA`  |
| Relation  | `REL_*` · Migration  | `MGR_*`      |

Never change a stored ID — it is a primary key. A language fiche's `id` must equal its
`isoCode639_3` and its filename. A patronyme's filename must equal its `id`.

If a family does not exist yet, use `FLG_UNKNOWN` and flag it.

Adding a new country means two registrations beyond the fiche: the off-map list and the
ledger. A fiche alone is not enough.

## Empty values

- Unknown or not applicable: `null`. Never `"N/A"`, never `"À compléter"`, never `"Inconnu"`.
- Empty list: `[]`. Never `["N/A"]`.
- Unknown number: `null`. Never `0`, unless the value truly is zero.

An empty field is information about the state of the corpus. It is not a blank to be filled
with something plausible.

## Numbers

Integers, never prose approximations.

- `"totalSpeakers": 350000000`
- not `"totalSpeakers": "environ 350 millions"`

## Prose

Plain French sentences. No markdown — no `**`, no `*`, no backticks — and none of `~`, `>`,
`<`, `±`. Paragraph breaks are `\n\n`, and only where a break is genuinely needed.

The prose fields follow a closed grammar; a field is a sentence, a list of sentences, or a
short label, according to its rubric. Do not invent a new shape — no bullet characters, no
leading dashes, no embedded headings.

Geographic areas are a comma-separated string:

- `"geographicArea": "Afrique centrale, Afrique orientale, Afrique australe"`
- not `"- Afrique centrale\n- Afrique orientale"`

## Relations between entities

`currentCountries` is always an array of ISO alpha-3 codes — `["NGA", "BEN", "TGO"]`, never
`["Nigeria"]`, never `"NGA, BEN"`.

`languageFamilyId` is always a valid `FLG_*`, never a human-readable name.

`associatedPeoples` on a family: 5–10 representative entries, each with a valid `peopleId`,
never `null`.

## Demographics

Reference year **2025**.

- A people's `distributionByCountry[].percentage` totals 100 %.
- A country's `demographics.peoples[].percentageInCountry` totals 100 %.

The validator enforces a hard band of [95, 105] and a strict band of [99, 101], and **both
now fail the build** — the re-sourcing burn-down that made them advisory is finished, so a
fiche cannot drift back out.

Cite the demographic source, and beware a stale vintage: a census a decade old is a
different claim from a 2025 estimate, and saying so is part of the citation.

## Sources

Objects, not strings. Every entry carries an explicit tier. The keys differ by class — see
`source-tiers.md`, which is the full doctrine.

## Decolonial framing

- Keep the colonial or contested term. Never silently rename it.
- Explain why it is problematic, in `whyProblematic`.
- Always surface the autonym — `selfAppellation` — with its language.
- Record `contemporaryUsage` where usage has shifted.

`checkEditorialRules.ts` enforces two of these: an autonym is required at
`confidence >= medium`, and at least two sources when `classificationStatus` is `contested`
or `colonial-legacy`.

The posture is to publish the claim with its provenance, not to suppress the claim. That
applies to the terms as much as to the sources.

## A people is not a bounded territory

The atlas never draws a closed line around a people, and the prose should not assert one
either. Write where a people is attested, and by whom; not where it "ends".
