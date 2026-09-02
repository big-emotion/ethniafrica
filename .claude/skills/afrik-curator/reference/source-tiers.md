# Source tiers

**Nothing is forbidden. Everything is labelled.**

A source is never rejected for being weak. It is tiered, and the fiche's confidence follows
from the tiers it rests on. Excluding oral, community and amateur knowledge would itself be
a colonial filter: the decolonial posture is to publish the claim _and_ its provenance, not
to suppress the claim.

So the gate is not "reject weak sources". It is **"every source carries an explicit tier"**.
A `sources` entry with no tier is a blocking error.

## The scale

One three-value scale is used everywhere — code identifier, database value, API payload and
user-facing label all say the same thing.

| Identifier   | Label shown      | Weight | What it covers                                                                                          |
| ------------ | ---------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `official`   | **Officielle**   | 1.0    | UN, UNFPA, CIA World Factbook, SIL Ethnologue, Glottolog, UNESCO, IWGIA, national statistics institutes |
| `referenced` | **Référencée**   | 0.7    | Published, identifiable, verifiable work — academic, press, books. Not necessarily official             |
| `unverified` | **Non vérifiée** | 0.4    | Aggregators, tertiary encyclopedias, blogs, social media, community accounts, AI-generated text         |

A fiche resting only on `unverified` sources is **published**, and visibly marked
low-confidence through `ConfidenceChip`. That is the intended outcome, not a defect to fix.

### This replaced an earlier doctrine — do not restore it

The previous policy ranked sources Tier 1/2/3, **forbade** Tier 3, and deleted any claim
that could not be cited above it. That policy is retired. It also settles the aggregator
question: Joshua Project, 101lasttribes and peoplegroups are cited, at `unverified`.

Traces of the old doctrine survive in the repository. If you meet a rule that says a source
must be replaced by a "primary" one before a proposal is final, it is stale.

## `needs_review` is not a tier

1 031 entries in the corpus carry `tier: "needs_review"` — 398 people fiches, 54 countries,
17 families. It marks the tail that has not been ruled on yet, and the code keeps it
deliberately outside the tier union (`src/types/afrik.ts:180`), so it is never _shown_ as a
level of authority.

These are a genuine mixture: national censuses, SIL Ethnologue, UNEP and the CIA World
Factbook sitting beside travel-agency pages. **Classify them; do not flatten them.**
Labelling them all `unverified` would drop a national census from 1.0 to 0.4.

Ruling on a `needs_review` entry is always a welcome contribution.

## The legacy numeric scale

The nom, relation, migration and frontière-coloniale models still write `"tier": 1 | 2`,
and 19 corpus files still carry it. Their loaders normalise it through
`sourceTierFromLegacyNumber`, so it is handled rather than broken.

**Do not introduce new numeric tiers.** When you touch one of those fiches, write the
string scale.

## Tier is authority; `source_kind` is provenance

Two orthogonal axes. Never collapse them.

- `tier` — how much authority the source carries
- `source_kind` — what kind of thing it is

Values in use: `academic`, `archive`, `community`, `repository`, `ai_generated`.

AI-generated text is the worked example. It is not a level of authority — it is unverified
content whose _origin_ happens to matter. So it is `tier: "unverified"` plus
`source_kind: "ai_generated"`, and confidence multiplies rather than branches:

```
0.4 (unverified) × 0.5 (ai_generated) = 0.2
```

The interface keeps the distinction visible: the **Non vérifiée** badge plus a separate AI
provenance marker driven by `source_kind`, never by the tier.

## Wikipedia is not a source

A primary source _discovered through_ Wikipedia is cited at its own tier, by its own URL,
and the `notes` field records which Wikipedia language versions were crossed — so the chain
stays auditable.

## `notes` carries the reason for the tier

Not a summary of the source. The reason it sits at that level. The language fiches are the
model to copy: all 24 carry one.

```json
{
  "title": "Glottolog 5.3",
  "url": "https://glottolog.org/resource/languoid/id/nucl1347",
  "tier": "official",
  "notes": "Glottolog name: Wolof; classification includes North-Central Atlantic."
}
```

## Shapes differ by class

A source does **not** carry the same keys everywhere.

| Class                             | Keys                                           |
| --------------------------------- | ---------------------------------------------- |
| People, country, family, language | `title`, `url`, `tier`, `notes`                |
| Ethnonym dossier (`noms/`)        | the four above plus `author`, `year`           |
| Patronyme (`patronymes/`)         | the four above plus `sourceKey`, `source_kind` |

On patronymes, `sourceKey` is what each claim's `sourceRefs` points at. That is the one
place in the corpus where provenance attaches to the assertion rather than to the whole
fiche — so a value added there must name the source backing _that value_, not merely sit in
a fiche that has sources somewhere.

## Where the tiers usually come from

Useful starting points, not an allow-list. Anything else is citable at the tier it earns.

**Demography** — UN World Population Prospects, UNFPA, UN DESA, CIA World Factbook, World
Bank Open Data, national statistics institutes.

**Languages** — SIL Ethnologue (ISO 639-3, speaker counts, EGIDS), Glottolog
(classification, glottocodes), UNESCO Atlas of Languages in Danger (vitality), WALS
(typology).

**Peoples, rights, culture** — IWGIA Indigenous World, UNESCO Intangible Cultural Heritage,
UNESCO World Heritage.

**Academic** — peer-reviewed journals (Africa, JAH, IJAHS, Cahiers d'études africaines)
cited with a DOI or persistent URL; university presses including Karthala and Présence
Africaine; national archives.

**Oral tradition** — cited as the transcribed version and attributed to the griot it comes
from, at the tier the transcription earns. Not excluded for being oral.
