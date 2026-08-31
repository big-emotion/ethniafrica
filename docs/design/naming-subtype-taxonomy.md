# Naming-subtype taxonomy (ETNI-1460)

`public/modele-nom.json` keeps an ethnonym fiche honest — a section can be
neither skipped nor invented. This note fixes the equivalent contract for a
**naming system**: the set of rules a people or culture uses to name
individuals (as opposed to `noms/`, which records what a _people_ is called).

A single flat model with every field optional would either be unusable or
become the totemic-clan model by default whenever a field was left empty.
Instead there is one strict model per subtype, sharing a core field set and
declaring subtype-only fields as optional in exactly one model.

## Subtypes

| `namingSystem` value | System                                                          |
| -------------------- | --------------------------------------------------------------- |
| `totemic_clan`       | Totemic clan naming (food prohibition, closed given-name list)  |
| `patronymic_chain`   | Patronymic-chain naming (e.g. Somali _abtirsi_, Arabic _nasab_) |
| `nisba`              | Nisba naming (geographic, tribal or occupational attribution)   |
| `jamu`               | Mandé praise-name / _jamu_ naming                               |
| `undetermined`       | The system has not been established for this fiche              |

This list is not exhaustive of every naming tradition on the continent — it is
the closed set this ticket builds strict models for. Extending it means
adding both a model file and a validator entry, not repurposing an existing
value. `undetermined` is not "absent": a fiche must state it explicitly.
Nothing defaults to `totemic_clan` (or any other subtype) when the system is
unknown — see the validator rule below.

## Shared fields (every subtype, including `undetermined`)

These fields are required by every subtype model and read directly off the
fiche regardless of `namingSystem`:

| Field                  | Shape                                                                                                         | Covers                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `attestedForms`        | `[{ spelling, attestation: <source> }]`                                                                       | Attested spellings, each with its own attestation |
| `transmissionMode`     | `patrilineal \| matrilineal \| bilateral \| elective \| other`                                                | How the name is transmitted                       |
| `designatedSocialUnit` | `individual \| lineage \| clan \| caste \| age_set \| settlement \| other`                                    | The social unit the name designates               |
| `associatedPeoples`    | `["PPL_XXXXX"]`                                                                                               | Peoples the system is documented for              |
| `associatedCountries`  | `["ISO3"]`                                                                                                    | Countries the system is documented for            |
| `origin`               | `{ originType: griot_oral_tradition \| written_chronicle \| linguistic_reconstruction, sources: [<source>] }` | Sourced origin of the system                      |

`<source>` reuses the current Source Tier Policy shape — `{ title, url, tier:
"official" \| "referenced" \| "unverified", notes }` — matching
`public/modele-peuple.json`, not the legacy numeric `tier: 1/2` still carried
by `modele-nom.json` and `modele-migration.json`.

## Subtype-only fields (optional, one model each)

| Field                    | Subtype            | Meaning                                         |
| ------------------------ | ------------------ | ----------------------------------------------- |
| `totemicFoodProhibition` | `totemic_clan`     | The clan's totemic food taboo                   |
| `permittedGivenNames`    | `totemic_clan`     | Closed list of given names the clan allows      |
| `casteOrSocialFunction`  | `totemic_clan`     | Caste or social function tied to the clan       |
| `patronymicChainDepth`   | `patronymic_chain` | Number of generations strung in the chain       |
| `nisbaSubtype`           | `nisba`            | `geographic \| tribal \| occupational \| other` |

`jamu` carries no subtype-only field — it is distinguished from the other
systems by its shared fields and its `namingSystem` value alone, the same way
`eventType` distinguishes migration fiches without every event type owning a
private field.

Each subtype-only field appears in exactly **one** model file. A fiche
declaring a subtype must not carry a subtype-only field belonging to another
subtype — the validator (ETNI-1522) rejects that as a cross-system field.

## `undetermined` handling (ETNI-1518)

A fiche with `namingSystem: "undetermined"`:

- requires only the shared fields above;
- must not carry **any** subtype-only field (the union across all four
  subtype models) — an undetermined fiche is not "clan minus some fields",
  it asserts nothing about which system applies;
- is accepted by the validator and reads as `undetermined`, never coerced to
  `totemic_clan` or any other subtype.

## Model files

One file per subtype under `public/`, mirroring `public/modele-nom.json`'s
`_meta` block and directive pointer:

- `public/modele-nom-totemique.json`
- `public/modele-nom-patronymique.json`
- `public/modele-nom-nisba.json`
- `public/modele-nom-jamu.json`

There is no `modele-nom-indetermine.json` — `undetermined` is a value of
`namingSystem`, validated against the shared-field set directly, not a fifth
model file.

## Corpus directory

`dataset/source/afrik/systemes_onomastiques/` — distinct from
`dataset/source/afrik/noms/`, which holds ethnonym dossiers (ETNI-1520). One
illustrative template fiche (`_meta.illustrative: true`) demonstrates the
shared fields plus one subtype's optional fields, mirroring the convention in
`dataset/source/afrik/noms/PPL_YORUBA.json`.
