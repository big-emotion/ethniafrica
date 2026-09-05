# Review rules — class 3, and the glosses inside class 1

Class 3 is **review, not re-authoring**. The first draft of REQ-143 required
every `review_required` leaf to be written afresh per locale; tested against
the corpus that rule would have blocked 1 276 people fields (797
`originOfExonyms`, 479 `whyProblematic`) to catch a few dozen sentences. So a
class-3 leaf is translated like any prose, then read by a named human before it
publishes, and `sidecarViolations` refuses it while the record's `kind` is
`machine` (`docs/editorial/translation-classes.md`, "Why review, not
re-authoring").

This page is what that human — or the agent drafting for them — checks. Each
rule says what to look for, what to do, and the failure it prevents.

## R1 — Deixis: a passage that positions its reader outside the target language

**Look for** _anglophone_, _en anglais_, _les Anglais_, _(Pygmy en anglais)_,
_pour un lecteur français_. Measured corpus-wide: _anglophone_ in 128 fiches,
_en anglais_ in 113; by field, `contemporaryUsage` 67 + 40, `originOfExonyms`
45 + 23, `exonyms[]` 28 + 5, `whyProblematic` 8, `historicalRole.diaspora` 9.

**Do** keep the claim and rewrite the point of view: the English reader _is_
the anglophone the French sentence talks about. A parenthetical that exists
only to give the French reader the English word disappears; a parenthetical
that gives the English reader the French word appears where the French form is
the one in circulation.

**Because** a literal translation tells the reader about themselves in the
third person, and the sentence comes out false.

## R2 — A colonial term whose charge differs between the two languages

**Look for** _Hottentot_ (10 fiches, 7 of them in `sources[].title`), _Pygmée_
(24 fiches), _Bushmen_, _Cafre/Kaffir_, _tribu_, _indigène_, _nègre_.

**Do** carry the term where it is an invariant (an exonym entry, a source
title) and write the English gloss and prose from the term's documented
English history, cited at its own tier. Never translate the French judgement
word for word: _péjoratif_ and _pejorative_ are the same word and not the same
weight.

**Because** a gloss calibrated for French readers understates or overstates
what the word does in English, and the fiche's whole argument is the naming.

## R3 — An etymological gloss is glossed from the source language

**Look for** _signifie_, _vient de_, _du grec_, _en langue X_,
`names[].meaning`, `pays.etymology`, `origin.linguisticReconstructions[].claim`.

**Do** render the meaning from the language the record names —
`names[].languageOfOrigin`, the _twi_, _khoekhoe_, _kinyarwanda_ the prose
cites — and say so. Where the French gloss is the only witness, keep it, mark
the leaf reviewed-with-reservation in `## Needs human review`, and leave the
claim as the fiche's.

**Because** a gloss relayed through the other locale's gloss is a translation
of a translation, and the corpus already holds the cautionary example:
`src/lib/countryDataTransformer.ts` once extracted `{word, lang, definition}`
triples with regexes over French syntax ("vient du … et signifie …") — a
heuristic that read only French and was deleted rather than duplicated.

## R4 — An institution's terminology is quoted in the institution's own English

**Look for** IWGIA, UNPFII / _Forum Permanent de l'ONU_, ACHPR, UNESCO,
_peuples historiquement marginalisés_, _peuples autochtones_.

**Do** use the wording the institution publishes in English — most of these
bodies write in English first — and cite the document. _Historically
Marginalised People_ is the Rwandan state's own English phrase; _Indigenous
Peoples_ is the UN's, capitalised.

**Because** a back-translation invents a term the institution never used, and
the reader who follows the citation will not find it.

## R5 — Class 3 never publishes at machine provenance

**Do** list every class-3 leaf the sidecar carries under `## Needs human
review`, with the rule that fired and the specific risk. The `_translation`
block says `kind: "machine"` until a named human has read each one; then
`machine_reviewed`. Never write `human` for a record an agent drafted.

**Because** DEC-048 lets machine provenance publish _when it is labelled_ —
and a class-3 field mislabelled is the one label the reader cannot detect.

## R6 — The gloss inside a glossed invariant

`GLOSSED_INVARIANT_PATHS` marks the class-1 leaves whose values carry a
parenthetical gloss — 776 of the 3 201 people `exonyms[]` entries do. The gate
compares only the name outside the parentheses, so the gloss is the skill's to
rule on:

| The gloss is                                                      | Treat it as                | Example                                                         |
| ----------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------- |
| A plain descriptor — number, spelling, provenance, a language     | class 2, translated        | "Jieng (pluriel)" → "Jieng (plural)"; "(terme européen)"        |
| A judgement on the word — pejorative, colonial, obsolete, imposed | class 3, listed for review | "Hottentots (pejoratif, colonial)"                              |
| An ISO code                                                       | not a gloss — invariant    | "Twi (twi)", "Langue (iso)" — deliberately absent from the list |

A reviewed gloss goes into the same `reviewRequired` list as any class-3 leaf,
under the concrete path (`content.appellations.exonyms[2]`).

## Worked examples

Quoted byte-exact from the corpus, which is ASCII-stripped in these fiches
(_pejoratif_, _utilisee_, _Pygmee_). The charter contract test re-reads the
passages, so a fiche that changes shows up here.

### A — PPL_ASANTE: the reader is the anglophone

`dataset/source/afrik/peuples/FLG_NIGERCONGO/PPL_ASANTE.json`

- `content.appellations.exonyms[0]`: "Ashanti (variante orthographique
  anglaise utilisee depuis la periode coloniale britannique)"
- `content.appellations.originOfExonyms`: "Le terme Ashanti est une variante
  orthographique anglophone imposee par l'administration coloniale britannique.
  Les Asante se designent eux-memes comme Asantefo (pluriel). …"
- `content.appellations.whyProblematic`: "La distinction entre Asante et
  Ashanti est strictement orthographique. Les chercheurs anglophones utilisent
  les deux formes de facon interchangeable. Certains Asante contemporains
  preferent la graphie originale twi Asante pour affirmer leur identite
  independamment de la denomination coloniale."

**The failure.** Rendered literally, `whyProblematic` tells an English reader
that "anglophone scholars use both forms interchangeably" — about the reader,
in the third person — and `exonyms[0]` explains that _Ashanti_ is "the English
spelling" to someone for whom it is simply the spelling they know.

**The review (R1).** Keep every claim; move the point of view inside English.

- `exonyms[0]` → "Ashanti (the spelling fixed under British colonial
  administration)" — the name is unchanged, the gloss is class 2.
- `whyProblematic` → "The difference between Asante and Ashanti is purely
  orthographic. In English both spellings circulate and scholars use them
  interchangeably; Asante is the Twi form, and it is the one this atlas uses.
  Some Asante today prefer it to assert an identity independent of the
  colonial spelling."

Listed under `## Needs human review` because the leaf is class 3, with R1 as
the reason. No new source is needed: the claims are the fiche's.

### B — PPL_KHOE_MACRO: the name stays, the gloss is rewritten from English scholarship

`dataset/source/afrik/peuples/FLG_KHOE/PPL_KHOE_MACRO.json`

- `content.appellations.exonyms[2]`: "Hottentots (pejoratif, colonial)"
- `content.appellations.originOfExonyms`: "… L'appellation coloniale
  pejorative 'Hottentot' fut utilisee par les colons neerlandais des 17e-18e
  siecles pour imiter les sons clics de la langue, percus comme
  incomprehensibles. …"
- `content.appellations.whyProblematic` is about _Khoisan_, not _Hottentot_ —
  the fiche makes no further claim about the word.

**The failure.** "pejorative, colonial" is what the word is in French: a dated
colonial ethnonym. In English it is a slur with its own documented history —
a word the Oxford English Dictionary labels offensive, the name under which
Sara Baartman was exhibited in London and Paris as the "Hottentot Venus", and
one that South African scholarship replaced with _Khoikhoi_ / _Khoekhoe_ from
the 1970s. A verbatim gloss understates it; a scrubbed one hides the fiche's
own subject.

**The review (R2, R6).** The array entry keeps its name — `glossedInvariantName`
compares "Hottentots" with "Hottentots" — and the gloss is class 3, rewritten
and cited:

- `exonyms[2]` → "Hottentots (colonial exonym; in English a slur)"
- `originOfExonyms`, the sentence about the word → "The colonial name
  'Hottentot' was applied by Dutch settlers in the seventeenth and eighteenth
  centuries as an imitation of the language's click sounds, which they could
  not follow — Nienaber derives it from a Dutch word for stammering; in
  English it has been an ethnic slur for well over a century and scholarship
  abandoned it for Khoikhoi in the 1970s." The fiche's claim is kept; the
  derivation and the English history are additions, each with its source
  below.

English-language sources to cite in the sidecar's `sources[]`, each at
`referenced`:

- G. S. Nienaber, "The origin of the name 'Hottentot'", _African Studies_
  22(2), 1963 — the Dutch imitative origin.
- Richard Elphick, _Khoikhoi and the Founding of White South Africa_, Ravan
  Press, 1985 (first published as _Kraal and Castle_, Yale, 1977) — the
  scholarly replacement of the term by _Khoikhoi_.
- Clifton Crais and Pamela Scully, _Sara Baartman and the Hottentot Venus: A
  Ghost Story and a Biography_, Princeton University Press, 2009 — the
  exhibition history the English word carries.
- _Oxford English Dictionary_, entry "Hottentot, n. and adj." — the usage
  label.

The seven `sources[].title` values that carry the word corpus-wide are
invariants. They stay as cited; the prose is what explains them.

### C — PPL_TWA: two institutional chains, and a source title that keeps the word

`dataset/source/afrik/peuples/FLG_BANTU/PPL_TWA.json`

- `content.appellations.exonyms[3]`: "Pygmees des Grands Lacs"
- `content.appellations.originOfExonyms`: "… Le terme 'Pygmee' (Pygmy en
  anglais) provient du grec 'pygmaios' (haut d'une coudee) et a ete applique
  par les colonisateurs europeens. …"
- `content.appellations.whyProblematic`: "Le terme 'Pygmee' est considere
  comme pejoratif et deshumanisant par de nombreuses organisations de defenses
  des droits des peuples autochtones, dont l'IWGIA (International Work Group
  for Indigenous Affairs) et le Forum Permanent de l'ONU sur les Questions
  Autochtones. … Au Rwanda, suite au genocide de 1994, toute denomination
  ethnique est officiellement proscrite …"
- `content.sources[].title`: "Jerome Lewis, The Batwa Pygmies of the Great
  Lakes Region, MRG Report, 2000"

**The failure.** "(Pygmy en anglais)" is a parenthetical for a French reader
and vanishes in English (R1). The chain of institutional rejection is
different in each language: IWGIA and the UN Permanent Forum publish in
English first, so their wording is quoted, not back-translated (R4). And the
fiche's own source keeps the word in its title — an invariant — so the English
fiche will show "Pygmies" in the Sources chapter no matter what the prose
says.

**The review (R1, R2, R4).**

- `exonyms[3]` stays "Pygmees des Grands Lacs", carried over and stated as
  carried over. The entry has no parenthesis, so there is no gloss to split:
  the whole string is the name, and `sidecarViolations` refuses a sidecar
  that writes "Great Lakes Pygmies" there (`invariant-changed`). That
  English exonym does exist in the literature — the Lewis title carries it —
  but it is a further attested name, which is a curator's addition to the
  French record (`/afrik-curator`), never a translator's substitution.
- `originOfExonyms` → "The term 'Pygmy' comes from the Greek _pygmaios_ (a
  cubit tall) and was applied by European colonisers …" — the parenthetical
  gone.
- `whyProblematic` → "The term 'Pygmy' is regarded as pejorative and
  dehumanising by many Indigenous-rights organisations, among them IWGIA (the
  International Work Group for Indigenous Affairs) and the UN Permanent Forum
  on Indigenous Issues. … In Rwanda, since the 1994 genocide, every ethnic
  designation is officially proscribed; the state's own category is
  'Historically Marginalised People' …"
- The Lewis title is carried over unchanged and stated as carried over; the
  prose two chapters above it is what tells the reader why the word is there.

English-language sources for the English chain, at `referenced`:

- Jerome Lewis, _The Batwa Pygmies of the Great Lakes Region_, Minority Rights
  Group International, 2000 — already cited by the fiche; the title is the
  invariant.
- African Commission on Human and Peoples' Rights / IWGIA, _Report of the
  African Commission's Working Group of Experts on Indigenous
  Populations/Communities_, 2005 — the continental body's English usage.
- IWGIA, _The Indigenous World_ (annual), Rwanda / Burundi / DRC chapters —
  the wording "Batwa" and the note on the term.

### D — PPL_ITESO, the counter-example: review, not re-authoring

`dataset/source/afrik/peuples/FLG_NILOTIQUE/PPL_ITESO.json`

- `content.appellations.originOfExonyms`: "Le terme Bakedi (aussi Bakidi) fut
  attribue par les Baganda au XIXe siecle et signifie peuple nu, reference au
  fait que les Iteso ne portaient pas de vetements etoffes. Ce terme est
  aujourd'hui considere pejoratif. …"

"Bakedi means naked people" is true in any language. The leaf is class 3, so it
is listed under `## Needs human review` with R3 — the gloss is from Luganda,
and the reviewer confirms the meaning is given from Luganda rather than from
the French — and it publishes at `machine_reviewed` once read. Nothing is
re-authored. A rule that forbade the translation would have blocked this
sentence and hundreds like it to catch the three examples above.
