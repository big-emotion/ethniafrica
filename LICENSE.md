# Licences

This repository holds two different works under two different regimes. The
distinction is deliberate: collapsing them is what produced a footer reading
"tous droits réservés" over a corpus every API response declared CC BY-SA 4.0.

Rights holder for both: **BIG EMOTION**, SASU, 14 rue Bausset, 75015 Paris,
France — the publisher named in the site's legal notice.

---

## The corpus and the editorial content — CC BY-SA 4.0

**Covered:** the AFRIK corpus in `dataset/source/afrik/` (peoples, countries,
linguistic families, names, relations, migrations), the editorial text
published on the site, and the data derived from them and served by the public
API under `meta.license`.

Licensed under **Creative Commons Attribution-ShareAlike 4.0 International**
(CC BY-SA 4.0): <https://creativecommons.org/licenses/by-sa/4.0/>

You are free to share and adapt this material, including commercially, on two
conditions:

- **Attribution** — credit EthniAfrica and link to the fiche you reused. Every
  fiche carries a citation block that produces the exact wording.
- **ShareAlike** — distribute any derivative under this same licence.

Share-alike rather than plain attribution is a choice, not a default: the
corpus describes peoples who have rarely held the rights to descriptions of
themselves, and it is the clause that keeps every derivative reusable by them.

## The source code — all rights reserved

**Covered:** everything else in this repository — `src/`, `scripts/`,
`supabase/`, the configuration and the tooling.

No licence is granted. The code is published for transparency and review, not
for reuse, and no right to copy, modify or redistribute it is conceded here.

This is a placeholder for a decision that has not been taken rather than a
settled position. If the code is ever to be opened, that is its own decision
and it replaces this section.

---

## What neither licence reaches

**Third-party sources.** Quotations, official figures, maps, photographs and
documents from third parties keep their own terms, which the site states
case by case. The Source Tier policy in `CLAUDE.md` governs how they are
recorded. Notably, media taken from Wikimedia Commons carries its own licence —
often CC BY-SA 4.0, which is compatible, but never assume it without checking
the credit line.

**Third-party data.** Natural Earth admin-0 geometry is public domain. Figures
attributed to the UN, UNFPA, SIL Ethnologue, Glottolog, UNESCO or a national
statistics institute remain governed by those bodies' terms.

**Facts themselves.** Individual facts are not protected by copyright. The
database as a compilation is separately protected under the EU _sui generis_
database right (art. L. 341-1, French Intellectual Property Code) for the
benefit of BIG EMOTION as producer; substantial extraction of its contents
remains subject to the CC BY-SA 4.0 licence above.

---

The corresponding statement for readers is on `/fr/mentions-legales`, under
"Licence du corpus" and "Ce que la licence ne couvre pas". The doctrine behind
it is `docs/design/brand-charter.md` §2.
