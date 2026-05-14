# AFRIK directives — condensed

Source of truth: `public/DIRECTIVES-AFRIK.md`. Read that file if anything below is ambiguous.

## Format

- One JSON file per fiche, UTF-8, no comments.
- Keys: camelCase English (matches TypeScript types).

## Identifiers (IMMUTABLE)

| Entity   | Format             | Example                  |
| -------- | ------------------ | ------------------------ |
| People   | `PPL_` + uppercase | `PPL_YORUBA`, `PPL_ZULU` |
| Family   | `FLG_` + uppercase | `FLG_BANTU`, `FLG_MANDE` |
| Country  | ISO 3166-1 alpha-3 | `NGA`, `ZAF`, `BEN`      |
| Language | ISO 639-3          | `yor`, `swa`, `fra`      |

Never change a stored ID. If a family does not exist yet, use `"FLG_UNKNOWN"` and flag it.

## Nulls and empty values

- Unknown / not applicable: `null` (never `"N/A"`, never `"À compléter"`).
- Empty list: `[]` (never `["N/A"]`).
- Unknown number: `null` (never `0`, unless truly zero).

## Numbers (population, speakers)

- Integers only. No string approximations.
- `✅ "totalSpeakers": 350000000`
- `❌ "totalSpeakers": "environ 350 millions"`

## `currentCountries`

Always an array of ISO 3166-1 alpha-3 codes.

- `✅ ["NGA", "BEN", "TGO"]`
- `❌ ["Nigeria"]`, `❌ "NGA, BEN"`

## `languageFamilyId`

Always a valid `FLG_*` ID. Never a human-readable name.

## Geographic areas

Comma-separated string, no leading dashes, no newlines.

- `✅ "geographicArea": "Afrique centrale, Afrique orientale, Afrique australe"`
- `❌ "- Afrique centrale\n- Afrique orientale"`

## `associatedPeoples` (families)

5–10 representative entries. Each entry needs a valid `peopleId`. Never `null`.

## Sources

Array of strings. Recommended format:

```
"Title – Author, Year (URL if available)"
```

- `✅ "Ethnologue – SIL International, 2025 (https://www.ethnologue.com)"`
- `❌ "Ethnologue"` (insufficient)

## Free-text fields (origins, culture, history)

- Plain prose. No markdown (`**`, `*`, `` ` ``), no symbols (`~`, `>`, `<`, `±`).
- Complete French sentences.
- Paragraph breaks with `\n\n` only when necessary.

## Demographics

- Reference year: **2025**.
- Per-people: `distributionByCountry[].percentage` must total 100.00 (±0.01).
- Per-country: `demographics.peoples[].percentageInCountry` must total 100.00 (±0.01).
- Cite the demographic source (`"source": "UNFPA 2025 (estimation)"`).

## Culture (peoples)

Two valid formats — choose by data richness:

- Simplified (96% of fiches): four nullable text fields (`majorRites`, `symbols`, `artsAndMusic`, `spiritualities`).
- Extended (Bambara, Kabyle, Sawa, etc.): six subsections (`divinitiesAndSpirits`, `cosmology`, `personAndNature`, `ritesAndPractices`, `symbolsAndArts`, `contemporarySpirituality`).

## Decolonial framing

- Keep colonial / problematic terms — do not silently rename.
- Provide `selfAppellation` (endonym) for every people / family.
- Fill `whyProblematic` when the historical term carries colonial baggage.
- Document `contemporaryUsage` when usage has shifted.
