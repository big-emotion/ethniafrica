# What exists, what shipped, and what it did

The state of the publication record, carried here so the skill knows rather than
points. **Rewritten 2026-09-09**, after the whole editorial chain was redone.
Refresh the numbers each session; the structure is what does not change.

## Where the truth lives

It is split, and the split is the point.

**The engine is here**, versioned: `social/harness/` renders — `ethni_render.py`
for video, `ethni_card.py` for images, `ethni_brand.py` for the mark, all sharing
one visual language — and `docs/design/gabarits-social/` is the spec they read.

**The productions are not**, and never will be. They live in the production
library, outside version control, at whatever path
`ETHNIAFRICA_SOCIAL_OUTPUT` points to on this machine. So do the publication
index, the dated editorial guides and the pipeline state.

Two consequences worth stating, because both have already caused a wrong answer:
a figure about what has been published cannot be read from this repository, and a
question about how a render is produced cannot be answered from the library.

## What is approved and waiting to be produced

Twenty-two publications, all copy written and validated on 2026-09-09:
thirteen videos and nine carousels, with one hundred and ten captions across five
networks. They live in the library's guides — `production-list-2026-09-09.md`,
`narrations-2026-09-09.md`, `serie-villes-2026-09-09.md`,
`cartes-carrousels-2026-09-09.md` and `legendes-110-2026-09-09.md`.

**Nothing of the twenty-two has been produced yet.** Two things block production,
and both have a written prompt in `prompts-production-2026-09-09.md`:

1. **The video template.** The intro, the outro, the mark and the gold captions
   are approved. The text card and the on-screen plate do not exist as a shared
   grammar — every project still places raw items by hand.
2. **Carousel mode.** `ethni_card.py` renders one card per subject. A carousel
   needs six to eight, ordered, each on its own licence-verified photograph.

## What shipped before, and the one lesson the numbers taught

Five cuts were published on 2026-09-05 (Afrique, two Nigeria cuts, Lingala,
Bantu V5) plus a channel presentation. A thirteen-video batch followed on
2026-09-05 and **was rejected**: its scripts were never approved. Do not revive
those montages.

The measured lesson, and it is the one that matters:

- **No verdict on a short before 72 hours.** On 2026-09-08 the Ghana cut sat at
  47 views and was used as evidence that a script was weak. Hours later it was at
  402, and Sénégal at 566. View counts are not corrected for age, and a
  three-day-old video against a three-week-old one is not a comparable.
- **A measure that is unavailable is empty, never zero.** An invented zero
  poisons every comparison after it.
- **Retention at three seconds is still not collected.** It is the only figure
  that judges a hook, and until it exists no hook can be called good or bad.

## The link problem, still open

No outbound link from any network carries a parameter, so every visit a video
earns lands in Plausible's `Direct / None` bucket. `social/tools/link-builder/`
is written and not yet in service. Until it is, no publication can say what it
brought back, and the UTM scheme in `description-template-2026-09-09.md` is the
one every caption already assumes.

## The caption register

Set by `description-template-2026-09-09.md` and binding: the hook, the proof, the
exit; the first hundred characters complete before the cut; the claim identical
on all five networks and the form rewritten for each. Plain language everywhere
except LinkedIn, per `plain-language-doctrine-2026-09-09.md`.

The recurring move: name the colonial-era fact, then return the autonym and the
people's own history. That move is the brand.

## Decisions still open

1. **Which Nigeria cut publishes** — two cuts are approved, neither designated.
2. **Whether the Bantu excerpt is cleared**, or removed so the cut can ship.
3. **The seven country fiches**, whose etymologies carry no source of their own.
   Bénin and Sénégal are in curation; the Bénin carousel and the Sénégal
   corrective video wait on them.
