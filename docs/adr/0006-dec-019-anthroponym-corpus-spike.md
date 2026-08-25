# ADR-0006: Sourced anthroponym (surname) corpus — feasibility spike (qualified go, wave 1 scoped)

- **Status**: Accepted
- **Date**: 2026-08-25
- **Issue**: ETNI-1197 (`Spike: is a sourced anthroponym corpus feasible? (DEC-019)`)
- **Related**: ETNI-1196 (sibling ticket — presentation change authorised by this decision), Epic 8 — Names Atlas (`_bmad-output/planning-artifacts/module-specs/epic-08-names-atlas.md`), Story 8.11 (`Surname-connection curation wave`), Open Question 3 of that spec

## Context

Epic 8 ("Names Atlas") already ships the full data model for a `nameType: "surname"`
record: the `name_record_type` enum (migration sketch in the epic spec),
`public/modele-nom.json`, `nameRecordParser.ts`, and the validator rule
`FR55-surname` (`scripts/validateAfrikData.ts`, tested in
`scripts/__tests__/validateNameRecords.test.ts`) — all already implemented and
merged. What has never shipped is the data itself: no file under
`dataset/source/afrik/noms/` uses `nameType: "surname"` (only
`dataset/source/afrik/noms/PPL_YORUBA.json` exists, and it carries only
`endonym`/`exonym` records).

Story 8.11's own Open Question 3 asks: "which onomastic references count as
Tier 1/2 for surname-to-people connections — needs advisory/PO validation
before Story 8.11 curation starts." ETNI-1197 is that validation. Per the
Source Tier Policy, a claim with no Tier 1 or Tier 2 backing must be removed —
so before curation effort is spent, the project needs evidence that
qualifying sources exist, and at what scale.

## Method

Applied the project Source Tier Policy verbatim. Tier 1 (UN, UNFPA, CIA, SIL
Ethnologue, Glottolog, UNESCO, IWGIA) is not populated for personal/surname
etymology — none of those bodies catalog anthroponyms. The question is
therefore entirely a Tier 2 question: for each candidate linguistic
family/region, does a genuine primary source (peer-reviewed paper, academic
monograph, archival/reference dictionary) exist, and can it be reached via the
Wikipedia-cross-check discovery path the policy prescribes?

For one candidate — the ticket's own motivating example, the surname
**Bamba** — the full Tier 2 protocol was walked end to end as a proof of
concept: the English Wikipedia article "Bamba (name)" and the French
"Bamba (nom)" both attribute the name to the Mandinka Bamba clan, meaning
"crocodile," citing the _Dictionary of American Family Names_ (2nd ed.,
Patrick Hanks (ed.), Oxford University Press) as their underlying reference.
That dictionary entry is the citable Tier 2 primary source; the Wikipedia
articles are the (required, non-citable) discovery path. This confirms the
mechanism works for at least one real case.

For the remaining families, the survey used direct scholarly search
(Google Scholar-indexed journals, university repositories, JSTOR/African
Journals Online) rather than walking the Wikipedia path per candidate name —
that per-record walk (and recording the cross-check in `sources[].notes`, as
`FR57-source` requires) is curation work, not spike work, and is included in
the effort estimate below.

## Research conducted

Sources found are peer-reviewed papers, dedicated academic journals, or
published reference works — never a Wikipedia article, blog, or name-list
aggregator (`behindthename.com` and similar sites appeared repeatedly in
search results and were explicitly excluded as Tier 3).

| Family / peoples (illustrative)              | Region              | Surname/clan-name literature found                                                                                                                                                                                                                                  | Tier 2 candidates                                                                                                                                                                                                                                               |
| -------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manding (Bamana, Mandinka, Soninke, Malinké) | West Africa (Sahel) | Moderate — several documented clan patronyms (`jamu`), but etymologies are sometimes contested                                                                                                                                                                      | _Dictionary of American Family Names_ (Hanks, ed., Oxford UP) for **Bamba** = "crocodile" (Mandinka clan); competing folk etymologies exist for **Traoré** ("elephant hunter" vs. "going to call it") — no single scholarly consensus found within this timebox |
| Nguni (Zulu, Xhosa, Ndebele, Swati)          | Southern Africa     | Strong — dedicated literature on `isibongo`/`izithakazelo` (clan names/praises)                                                                                                                                                                                     | Ngubane, "A Semantic analysis of Zulu surnames"; _Nomina Africana: Journal of African Onomastics_ 39(1), "Derivation of given names from ethnonyms, surnames and clan praises… in Nguni"                                                                        |
| Kongo / Luba (Kikongo, Tshiluba)             | Central Africa      | Moderate — an established academic tradition (since a 1977 _Names_ journal article on Kongo personal names) plus recent Congolese onomastics papers on clan names (e.g. Kabongo = "the gatherer")                                                                   | _Names_ (American Name Society) 1977 Kongo-names article; Congolese onomastics papers (Akofena, francophone linguistics journals)                                                                                                                               |
| Akan (Twi/Fante)                             | West Africa         | Strong for **given** (day) names (Agyekum, _Nordic Journal of African Studies_ 15(2), 2006), but the literature surveyed centers on day-names and stool-names, not fixed family surnames                                                                            | Day-name literature does not map to the `surname` record type — Akan naming is largely not surname-based; would need dedicated clan/stool-name sourcing, not found in this pass                                                                                 |
| Yoruba, Igbo                                 | West Africa         | Strong for personal (compound/given) names (Ikotun, multiple papers; Nkamigbo, _JOLLC_), weaker specifically for hereditary surnames — traditional Yoruba/Igbo names function as given names tied to birth circumstance, not fixed family surnames                  | Same structural caveat as Akan — rich sourcing exists, but for the given-name record type the schema does not yet expose, not `surname`                                                                                                                         |
| Swahili / Interlacustrine Bantu              | East Africa         | Moderate — _Nomina Africana_ has published on Swahili nicknames and Interlacustrine names, but coverage is nickname/given-name-centric, not surname-centric                                                                                                         | Same structural caveat                                                                                                                                                                                                                                          |
| Somali                                       | Horn of Africa      | N/A — Somali naming is a patronymic chain (given name + father's + grandfather's given name); there is no fixed inherited family surname to source                                                                                                                  | Structurally out of scope for the `surname` record type, not a sourcing gap                                                                                                                                                                                     |
| Amharic / Ethiosemitic                       | Horn of Africa      | N/A — same patronymic-chain structure as Somali; Yemane's _Amharic and Ethiopic Onomastics_ (Mellen Press, 2004) documents given names, not surnames                                                                                                                | Structurally out of scope                                                                                                                                                                                                                                       |
| Malagasy                                     | Madagascar          | N/A — traditional Malagasy naming uses one long, meaning-bearing name, not a separate surname (Regnier, "Naming and name changing in post-colonial Madagascar")                                                                                                     | Structurally out of scope                                                                                                                                                                                                                                       |
| Amazigh / Berber                             | North Africa        | Weak specifically for personal/surname etymology — the academic tradition found (A. Basset et al.) is toponymic, not anthroponymic; searches otherwise surfaced only non-citable name-list sites                                                                    | No qualifying Tier 2 source found in this pass                                                                                                                                                                                                                  |
| Khoisan (San, Khoikhoi)                      | Southern Africa     | Weak to none — the academic literature (Raper and others) explicitly documents Khoisan **place** names; multiple sources note personal-name research is comparatively undeveloped and that Khoisan personal names show little interlinguistic contact/documentation | No qualifying source found                                                                                                                                                                                                                                      |
| Nilotic (Dinka, Nuer, Luo, Maasai, Turkana)  | East Africa / Horn  | Weak — literature found concerns cattle names and day-of-week names, not inherited family surnames; these groups are not classically surname-based either                                                                                                           | Inconclusive within the 1-day timebox — needs dedicated follow-up, not ruled out                                                                                                                                                                                |

**Key general finding**, echoed across multiple sources surveyed: _"one of the
greatest problems [in African onomastics] is that there are very few critical
glossaries… for onomastics generally."_ The literature is real and
peer-reviewed, but it is scattered across single-topic papers, each
presenting a handful to a few dozen worked examples — not comprehensive,
ready-to-ingest name dictionaries. A corpus built from this literature will
therefore always be a sparse, hand-curated sample, not an exhaustive
reference.

## Coverage assessment

- **Strong enough to start now**: Nguni/Southern Bantu clan surnames (`isibongo`),
  Central African Bantu (Kongo/Luba) clan names, and at least the individual
  Manding surnames with uncontested etymologies (confirmed for Bamba; several
  others are contested and should be excluded or presented with the
  disagreement noted).
- **Structurally not applicable** (not a sourcing failure — these peoples do
  not have a fixed inherited surname in the sense the `surname` record type
  encodes): Somali, Amharic/Ethiosemitic, Malagasy. These should never appear
  as "missing surname data" in the atlas — they have none to source.
- **Rich adjacent literature, wrong record type**: Akan, Yoruba, Igbo,
  Swahili/Interlacustrine Bantu. Sourcing is genuinely abundant for
  **given**-name etymology (day names, compound names), which the schema does
  not currently expose (only `endonym` / `exonym` / `historical_spelling` /
  `surname`). This is a real, separately-scoped opportunity, not a "no" — but
  it is out of scope for the `surname` type this spike was asked to assess,
  and would require a model change, contradicting this ticket's framing that
  "the corpus is missing, not the model." Flagged as a follow-up model
  question, not folded into the wave-1 recommendation below.
- **No qualifying source found in this pass**: Amazigh/Berber personal names,
  Khoisan personal names, Nilotic peoples. Not ruled out permanently — a
  1-day timebox is not exhaustive — but no Tier 1/2 candidate surfaced.

## Decision

**Qualified go.** A sourced surname corpus is feasible, but only as a narrow,
incrementally-growing wave — never as a comprehensive pass over the AFRIK
peoples catalog. Per AC3 of ETNI-1197:

- Story 8.11 ("Surname-connection curation wave") proceeds, scoped to an
  initial **wave 1** covering the three families with confirmed, uncontested
  Tier 2 sourcing: **Manding** (Bamba only, until other Manding surnames clear
  scholarly consensus), **Nguni/Southern Bantu** (`isibongo`), and
  **Kongo/Luba** (Central African Bantu clan names). This is curation work
  (afrik-curator workflow, human-reviewed per Story 8.11's own technical
  notes) — no engineering work beyond what Story 8.11 already scoped, since
  the model, parser, and `FR55-surname` validator rule are already merged.
- Somali, Amharic, and Malagasy are marked **not applicable** for the
  `surname` record type in any curation-report tooling or product copy — they
  should never be shown as "coverage gaps."
- Amazigh/Berber, Khoisan, and Nilotic peoples are **deferred**, pending
  further sourcing research beyond this spike's timebox — not a permanent
  no-go.
- Akan/Yoruba/Igbo/Swahili given-name etymology is **out of scope** for this
  decision: real sourcing exists, but it targets a name concept the current
  `name_record_type` enum does not model. Recorded as an open question for a
  future spike, not folded into wave 1.
- Every accepted record must still pass `FR55-surname` (documented basis) and
  `FR57-source` (Tier 1/2, Wikipedia cross-check path recorded for Tier 2) —
  this decision changes nothing about those gates.

### Effort estimate (if go)

No schema, parser, or validator work is required — all three already merged
(Story 8.1–8.3, `FR55-surname`). The remaining effort is pure curation,
comparable in size to Story 8.4's "curation wave 1": an estimated
**2–3 curator-days** for wave 1 (≈ 3 families, single-digit-to-low-teens
surname records, each requiring the full Tier 2 protocol — primary source
identified, ≥ 2 Wikipedia language versions cross-checked, path recorded in
`sources[].notes`), followed by the standard `afrik-curator` PR review. This
matches Story 8.11's own sizing note ("expected to be small in v1").

### Follow-up (proposed, not created)

A follow-up story-set is proposed — not created — as an amendment to Story
8.11 rather than a new epic, since Epic 8 already owns the naming/etymology
data model and Story 8.11 already exists as its home:

1. **Wave 1 curation** (Manding/Bamba, Nguni, Kongo/Luba) as scoped above.
2. **A follow-up spike** on whether the `name_record_type` enum should gain a
   given-name/personal-name value, to capture the abundant Akan/Yoruba/Igbo/
   Swahili literature this spike found but could not use under the current
   model — explicitly a model-change question, kept separate from this
   decision's "model is ready" premise.
3. **A later wave** revisiting Amazigh/Berber, Khoisan, and Nilotic peoples
   once (or if) further sourcing research surfaces qualifying Tier 2
   candidates.

Sizing, sequencing, and whether (2) merits a schema change are product/PO
decisions outside this spike's scope.

## Consequences

**Positive**

- No engineering work is blocked or re-opened — the existing Epic 8
  infrastructure (model, parser, `FR55-surname`) is confirmed sufficient for
  wave 1 as-is.
- The corpus grows only where genuine Tier 1/2 sourcing exists — the
  "source or drop" doctrine holds without exception; no speculative
  genealogy enters the dataset.
- Structural non-applicability (Somali, Amharic, Malagasy) is now documented,
  preventing those peoples from being miscast as "missing data" in the atlas
  UI or curation reports (informs ETNI-1196's presentation change).

**Negative**

- The surname corpus will be visibly sparse and regionally uneven for the
  foreseeable future — most of the ~900+ AFRIK peoples fiches will carry no
  `surname` record, by design, not by omission.
- The rich given-name literature (Akan, Yoruba, Igbo, Swahili) remains
  unusable until a separate model decision is made.

**Out of scope**

- Performing the actual wave-1 curation (Story 8.11, `afrik-curator`
  workflow, human-reviewed).
- Deciding whether to extend `name_record_type` with a given-name value.
- Re-running the Amazigh/Berber, Khoisan, and Nilotic sourcing pass beyond
  this spike's 1-day timebox.
