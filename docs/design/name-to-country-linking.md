# How a name reaches a country

The reader's question is "which names are borne here?" and "where is this name
borne?". The corpus can answer along two different routes, and they do not
return the same thing. This note says which is which, and why they must not be
merged into one list.

It is a design note, not a decision record — ADRs live on Confluence as `DEC`
pages (see `docs/adr/README.md`). The decision this note argues for is owed a
`DEC` entry.

## The two routes

A `PAT_*` fiche carries **both** links, and both are already joined in the
database by migration 053:

| Route       | Table                                                | What the claim means                                                       |
| ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Direct      | `afrik_patronyme_countries`                          | **This name is attested in this country**, with the source that attests it |
| Via peoples | `afrik_patronyme_peoples` → `afrik_people_countries` | **The people who bear this name live in this country**                     |

The second is an inference built from two attestations. It is often true and
always cheaper — but it is not the same claim, and publishing it under the same
heading would state something no source says.

## What the two routes actually return

Measured on recette, 2 September 2026, over the 30 fiches:

|                                     |                                      |
| ----------------------------------- | -----------------------------------: |
| Fiches                              |                                   30 |
| People links                        |     25, over **13 distinct peoples** |
| Country links                       |            73, over **21 countries** |
| Countries reachable **via peoples** |                                   25 |
| Countries reachable **directly**    |                                   21 |
| Reachable only directly             |                     **2** — ERI, ETH |
| Reachable only via peoples          | **6** — BEN, DZA, LBY, MAR, TGO, TUN |

Neither route is a superset. The union is 27 countries; each route alone loses
part of it.

### Why Ethiopia and Eritrea vanish via peoples

Not a data gap. The four Habesha fiches — `PAT_HAILE_PATRONYMIC`,
`PAT_WOLDE_MARIAM_PATRONYMIC`, `PAT_GHEBREMICHAEL_PATRONYMIC`,
`PAT_KEBREAB_PATRONYMIC` — have `designatedSocialUnit: "individual"` and no
`peoples[]`, because **a non-hereditary patronymic does not designate a group**.
The second element of an Ethiopian name is the father's given name; it names one
person's father, not a lineage anybody belongs to. There is no people to attach
it to.

So a country surface built only on the people route makes the entire Habesha
naming system invisible — the system that differs most from the European one,
and the one the corpus has the most reason to show. `PAT_MNTUNGWA_PRAISE` drops
out for the same structural reason.

### Why the Maghreb and the Bight appear via peoples

`PAT_MAGHRAWA` and `PAT_BANU_IFRAN` declare only the countries their sources
attest, but attach to a Zenata people whose range spans the Maghreb; the Yoruba
`PAT_ABIKAN_PRAISE` reaches Benin and Togo the same way. The people route is
genuinely informative here — it is the _reach_ of the bearers, which is a real
thing a reader wants. It is simply not attestation.

## The model

Three surfaces, each stating one claim, none of them merged.

**On a name fiche** — two separate blocks:

- _Attesté en_ — the direct list, each country carrying its source. This is what
  the fiche asserts.
- _Peuples porteurs_ — the people links, navigable. The reader reaches the
  countries by clicking through to the people, where those countries are that
  people's own sourced claim rather than this fiche's.

**On a people fiche** — _Noms portés_, a reverse join on
`afrik_patronyme_peoples`. This is the surface the reader most naturally expects,
and the one that makes the name dimension feel part of the atlas rather than a
separate index.

**On a country fiche** — _Noms attestés_, a reverse join on
`afrik_patronyme_countries`. Optionally a second, separately headed list of names
borne by that country's peoples, worded as reach rather than attestation. Never
one list summing the two.

## What it costs

Nothing in the database. Both join tables exist and are populated (30 fiches, 25
people links, 73 country links). This is an API and UI change:
`/api/v2/peoples/{id}` and `/api/v2/countries/{id}` gain a names block, and the
two fiche surfaces gain a section.

## What has to be fixed first

The people route is currently the **weaker** of the two, and the coverage waves
will make that worse unless they are told otherwise:

- **5 of 30 fiches have no people link.** Four are structural (the Habesha
  patronymics above) and correct as they stand. `PAT_MNTUNGWA_PRAISE` is a praise
  name attached to a lineage and should have one.
- **82 of the 648 queued candidates have no `peopleIds`.** The wave-0 prompt asks
  for a real `PPL_*` id or an empty array rather than a guess, which is right —
  but a candidate that reaches wave 1 with an empty array produces a fiche that
  no people fiche will ever list.
- **13 distinct peoples out of ~800.** Even at full coverage the people route
  will stay sparse for a long time, which is another reason the direct country
  link cannot be retired in its favour.

Wave 0 should therefore treat `peopleIds` as part of the deliverable, not as an
optional field, wherever the name genuinely designates a group.
