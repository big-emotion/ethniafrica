# Reader-facing register

A fiche is written in two registers and only one of them is published.

The curator's register records how the atlas is made: which file a passage was
read in, which tier is still unresolved, what the next research pass owes, which
queue the name came from. The reader's register records what the atlas knows and
how sure it is. Most fields keep the two apart because nothing renders them.
Three do not.

## The three fields published verbatim

| Field             | Rendered by                                              |
| ----------------- | -------------------------------------------------------- |
| `gaps[].reason`   | `FieldProvenanceMarker` — the chapter's declared silence |
| `sources[].title` | the Sources chapter                                      |
| `sources[].notes` | the Sources chapter                                      |

Name fiches nest the last two one level deeper, under `names[].sources[]`.

Whatever the corpus holds in these three is what a visitor reads, word for word.
There is no sanitising layer, and adding one would be the wrong fix: the corpus
should hold prose fit to publish, not prose a renderer has to launder.

Everything else in a fiche — `_meta.directives` included — is authoring metadata
no surface renders. It stays the curator's to write, in whatever register suits
the work.

## What a published field may not contain

- **Repository paths.** `dataset/source/afrik/peuples/FLG_MANDE/PPL_DIOULA.json`,
  `docs/runbooks/…`, any `*.json` filename.
- **JSON field paths.** `#content.organization.clanOrganization`,
  `content.sources`, `verificationLead`, `targetPatronymeId`, `sourceRefs`,
  `fieldPath`.
- **Raw corpus identifiers.** `PPL_DIOULA`, `FLG_MANDE`, `PAT_KEITA`. Name the
  people, not the row.
- **Curation vocabulary.** _file d'attente_, _la passe_, _protocole de recherche_,
  _revue claim-level_, _tier hérité_, _hors corpus_, _plan de couverture_,
  _vague N_. This is the subtle one: it carries no path and no identifier, so it
  reads as ordinary French and survives review — while telling a visitor about a
  work queue and a research backlog that describe the workshop, not the subject.
- **Internal corpus labels.** `Corpus AFRIK — …` as a source title.

The governing sentence: **the reader is owed the silence itself, never the reason
the workshop has not filled it yet.**

## How to say it instead

| Curator register                                                                                                                                         | Reader register                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Fiche générée depuis la file d'attente des candidats : le champ n'a pas été renseigné faute de recherche, et attend le protocole de recherche par fiche. | L'atlas ne documente pas encore ce point pour ce nom : aucune source dédiée n'a été consultée à ce jour.             |
| Le système « clan_name » ne détermine pas à lui seul le mode de transmission : …                                                                         | Le nom de clan ne détermine pas à lui seul le mode de transmission : l'atlas ne le documente pas encore pour ce nom. |
| Corpus AFRIK — PPL_DIOULA, organisation clanique                                                                                                         | EthniAfrica — fiche du peuple Dioula, organisation clanique                                                          |
| Passage source : dataset/…/PPL_DIOULA.json#content.organization.clanOrganization. Le tier hérité n'est pas résolu ; la revue claim-level reste requise.  | Reprise du chapitre « Organisation clanique » de la fiche du peuple Dioula.                                          |
| Aucun porteur décédé n'a été rattaché au jamu par les sources de cette passe.                                                                            | Aucun porteur n'a été rattaché au jamu par les sources consultées.                                                   |

That last row is its own lesson. DEC-040 lets a fiche name only public figures,
the deceased, or the self-identified, so a curator searching for eligible bearers
naturally wrote the silence in those terms — and a section that simply lists who
bears a name came out reading as a search through the dead. The eligibility rule
is real and stays; it is a curation constraint, not something the reader needs in
order to understand that no bearer is documented.

## The gate

`checkEditorialRules.ts` enforces this as the `reader-facing-register` rule, at
`error` severity, on every fiche in `dataset/source/afrik/`. It runs in CI
through `.github/workflows/editorial-rules.yml`:

```bash
npx tsx scripts/ci/checkEditorialRules.ts
```

`_`-prefixed files under the corpus — `_candidates-by-country.json`,
`_coverage-findings.json`, `_manifest.json` — are the curator's own worksheets.
Nothing loads them and no surface renders them, so the rule leaves them alone.

The banned vocabulary lives in one exported constant,
`INTERNAL_REGISTER_PATTERNS`, so this document and the gate cannot drift apart.

## Prompt block for curation sessions

Paste this into any agent session that writes or edits fiches.

---

**Register rule — mandatory.**

Three fields of an AFRIK fiche are published to the reader word for word:
`gaps[].reason`, `sources[].title`, `sources[].notes` (and
`names[].sources[].*` on name fiches). There is no sanitising layer between what
you write in them and what a visitor reads on the site.

In those three fields you must never write:

- a repository path or a filename (`dataset/source/afrik/...`, `*.json`);
- a JSON field path (`#content.organization.clanOrganization`, `content.sources`,
  `verificationLead`, `targetPatronymeId`, `sourceRefs`, `fieldPath`);
- a raw corpus identifier (`PPL_*`, `FLG_*`, `PAT_*`) — name the people, the
  country or the name in words;
- the vocabulary of your own working process — _file d'attente_, _la passe_,
  _cette passe_, _protocole de recherche_, _revue claim-level_, _tier hérité_,
  _hors corpus_, _plan de couverture_, _vague N_, _Piste :_, _Recherche :_;
- `Corpus AFRIK — …` as a source title.

Write instead what the atlas knows or does not know, in French, addressed to a
reader who has never seen the repository:

- a gap: « L'atlas ne documente pas encore ce point pour ce nom : aucune source
  dédiée n'a été consultée à ce jour. »
- a source drawn from another fiche: title « EthniAfrica — fiche du peuple
  Dioula, organisation clanique », notes « Reprise du chapitre « Organisation
  clanique » de la fiche du peuple Dioula. »

Keep your working notes — they are valuable — in `_meta.directives` or in the
`_`-prefixed worksheets, which no surface renders.

Before you finish, run `npx tsx scripts/ci/checkEditorialRules.ts` and fix every
`reader-facing-register` finding. It is a blocking CI gate.

---
