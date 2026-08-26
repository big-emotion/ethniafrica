# ADR-0008: `nameFr` redefined as the country's name of usage, not the protocol name

- **Status**: Accepted
- **Date**: 2026-08-25
- **Issue**: ETNI-1290 (`Give nameFr its intended meaning: the country common name, not the protocol name`)

## Context

`public/modele-pays.json` documented `nameFr` as `<Nom officiel en français>` —
the same thing `nameOfficial` already holds. Across the 54 country fiches,
46 had `nameFr` strictly equal to `nameOfficial`; the other 8
(BEN, BFA, CIV, COG, DJI, GAB, GIN, NER) held a `République`-form differing
from `nameOfficial` only by its parenthetical gloss. A fiche titled
« République fédérale du Nigeria (Federal Republic of Nigeria) » reads as a
diplomatic register, not as an atlas entry for the country a reader searched
for — Nigeria.

The product owner settled the shape decision in the ETNI-1290 ticket
(2026-08-25): `nameFr` is given its intended meaning — the name in ordinary
French use — and `nameOfficial` keeps the protocol name. **No new field is
added** (no `nameCommon`); this is a semantic redefinition of an existing
strict-model field, which the AFRIK pipeline's immutable-model rule ("always
use strict models — never skip, rename, or add sections") treats as a
versioned change rather than a silent in-place edit. This ADR is that version
marker: it is the record of record for the redefinition, since the AFRIK
model files themselves carry no per-field version metadata to encode it.

## Decision

- `nameFr` = the name in ordinary French use (e.g. "Nigeria", "Sénégal",
  "Congo").
- `nameOfficial` = the full protocol/constitutional name, unchanged in shape
  (e.g. "République fédérale du Nigeria (Federal Republic of Nigeria)").
- **Source**: UNSD M49, the UN Statistics Division's standard list of
  country/area names for statistical use
  (<https://unstats.un.org/unsd/methodology/m49/>), which publishes the
  French designation for every country in a single authoritative Tier 1
  table. Using one UN list uniformly, rather than a per-country search, keeps
  the 54 fiches internally consistent and avoids inventing a name that no
  Tier 1/2 source backs. Each fiche's `content.sources` array gained one
  entry recording this source and `tier: 1`, following the existing
  flat-string convention of that array (it is a whole-fiche bibliography, not
  a per-field attribution structure — restructuring it into per-field
  sourcing was judged out of scope for a field-semantics ticket, see
  "Out of scope" below).
- **NGA is a deliberate, documented exception**: UNSD M49 records "Nigéria"
  (with the acute accent, standard UN French orthography). This ADR instead
  uses "Nigeria" (no accent), matching the ticket's own worked example, the
  spelling already used throughout NGA.json's body content, and the form
  overwhelmingly used in French-language usage. This is a normalization of
  the Tier 1 source, not a deviation from it — recorded explicitly here so
  the choice is auditable rather than silent.
- **COD / COG ("the two Congos")**: the product owner flagged that "Congo"
  names two states and they "must stay distinguishable in a directory row
  and a search result... resolve that at display, never by re-inflating
  nameFr back into a protocol name." UNSD M49 itself already keeps them
  textually distinct without any additional disambiguation logic: COG's
  short form is "Congo"; COD's own UN-recognized short form is "République
  démocratique du Congo" (there is no shorter UN-endorsed common form — even
  the UN's own Member States page uses the full form, with "Congo-Kinshasa"
  only as an informal aside, not an official short name). Because these two
  Tier 1-sourced strings are already visually distinct, **no additional
  display-layer disambiguation code was added** in this change. `nameOfficial`
  for COD keeps its existing "(RDC)" gloss, which is what makes it differ
  from the new `nameFr` value.
- New validator rule **FR33** (`scripts/validateAfrikData.ts`) enforces
  `nameFr` is present and, when `nameOfficial` is also present, differs from
  it — a hard gate preventing regression to the duplicated state this ADR
  fixes.

## Consequences

**Positive**

- Fiche titles, directory rows, search results, breadcrumbs and API payloads
  built on `nameFr` now show the name a reader actually searched for.
- A single, uniformly-applied Tier 1 source (UNSD M49) makes all 54 values
  auditable against one authority, rather than 54 independent editorial
  judgment calls.
- FR33 makes the fixed invariant machine-checked, not just a one-time
  cleanup.

**Negative / open points**

- A handful of countries (CAF, TZA, DZA, EGY, ERI, ETH, LBY, LSO, MAR, MRT,
  SOM, SWZ, GNQ, GNB, STP...) keep a multi-word `nameFr` because that genuinely
  is their UN-recognized common form — there is no shorter alternative to
  source. These read less like a one-word atlas label than "Nigeria" or
  "Kenya" do; a future ticket could research Tier 2 (press-style-guide,
  cross-checked via Wikipedia to a primary source) short forms for these if
  the product wants a more colloquial register, but that was not invented
  here.
- This ADR is the in-repo record of the decision. The ticket also calls for
  editing Confluence page ARCH-005 to reflect it; this agent had no
  Confluence-write tool available and could not perform that edit — it is
  called out explicitly in the delivering PR/comment for a human to action.

## Out of scope

- Restructuring `content.sources` from a flat string array into a per-field,
  per-entry `{ title, tier, notes }` object structure (the shape used by
  `dataset/source/afrik/relations/*.json`). That would be a much larger
  migration touching the loader, validator, and every AFRIK entity type, not
  just countries — disproportionate to a `nameFr` semantics fix.
- Editing Confluence ARCH-005 directly (no tool access; flagged for a human).
