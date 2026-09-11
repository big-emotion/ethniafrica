# Production harness — EthniAfrica shorts

The engine, the brand ending and every measured constraint live here. A project
supplies only its narration, its scene sheet and its assets.

```
python3 ethni_audio.py  <Name>    # TTS take → paced narration → captions
python3 ethni_render.py <Name>    # scene sheet → master → burned captions
python3 ethni_card.py     <Name>  # card.json + assets/ → the three social images
python3 ethni_carousel.py <Name>  # cards.json + assets/ → six to eight ordered cards
```

Four modules are shared and none of them has a second implementation:

| Module             | What it owns                                             |
| ------------------ | -------------------------------------------------------- |
| `ethni_paths.py`   | where a production writes, and the one place it must not |
| `ethni_brand.py`   | the lockup                                               |
| `ethni_type.py`    | the text roles, the faces, the palette, the entrance     |
| `ethni_plaque.py`  | the plaque figure                                        |
| `ethni_compose.py` | the order slots stack in, and how tightly                |

`ethni_render.py`, `ethni_card.py` and `ethni_carousel.py` import them. That is the whole
point: the mark, the type scale and the plaque on a video frame and on a post
image have to be the same things, and two implementations of one thing are two
implementations that drift.

A bare subject name resolves under the productions root, so the short form is
both the easiest to type and the only one that cannot land somewhere else. An
explicit path still works for a one-off.

**`ETHNIAFRICA_SOCIAL_OUTPUT` names that root** — the directory holding one
subdirectory per subject. Point it at the production library, which lives outside
this repository: productions are large, and git is not a media store. Left unset,
a render lands under this checkout's own gitignored `output/`, so a fresh clone
renders without configuring anything and loses the files with the worktree.

**Any other destination inside a git checkout is refused** (`ethni_paths.py`).
This is not a hypothetical: 1,2 Go of masters and rushes were rendered into a
site repository's gitignored `output/`, where nothing backed them up, because the
path was wrong on the command line once. A `.git` ancestor is an exact test for
somebody's source tree, and the only exemption is the fallback above.

**The engine owns its virtualenv**, built on a stable `python3.13`. It is
gitignored and rebuilt per machine from `requirements.txt`, which pins the three
direct dependencies exact — a Pillow bump re-rasterises every glyph, so a floor
would let the back catalogue drift under a `pip install`:

    python3 -m venv venv
    ./venv/bin/python -m pip install -r requirements.txt

Then run any module or suite with `./venv/bin/python`. `ffmpeg` and `ffprobe`
are called as binaries and installed separately.

It did not start that way, and the failure is worth keeping. The venv was first
_borrowed_ from `../Projects/Zimbabwe-V2/.venv` through a symlink, on the argument
that `faster-whisper` and its weights are hundreds of megabytes and should not sit
beside the video masters in three copies. That venv had itself been built against
`~/.cache/codex-runtimes/.../python`, an **ephemeral runtime cache**. On
2026-09-07 something reclaimed that cache and every interpreter symlink in the
venv dangled at once — mid-production, with five renders in flight, and the
packages all still present so the directory looked healthy.

Two lessons, both paid for: a tool's interpreter never lives in a cache directory,
and shared infrastructure is not stored inside one of the things that uses it.

## What a project directory holds

```
<productions root>/<Name>/
├── narration.fr.txt   the approved French narration — one paragraph per scene
├── scenes.json        the scene sheet (schema in ethni_render.py's docstring)
├── production.json    optional: {"tempo": 0.94, "spokenNumerals": {"quatre": "4"}}
├── assets/            the licence-verified visuals
├── SOURCES.md         every claim to its anchor, every visual to its licence
└── work/              generated: tts-original.wav, narration.wav, caps.srt, final.mp4
```

**One paragraph of narration is one scene**, and `ethni_render.py` refuses to
start if the two counts disagree. Scene boundaries are derived from the final
paced audio, never estimated.

## Send the script to the voice as one continuous block

`ethni_audio.py` computes the pacing itself: it measures the silences the take
already has and inserts only the missing punctuation gaps, so a comma gets
0.20 s, a full stop 0.40 s, and a paragraph break the long landing the format
asks for.

**`seed_audio` reads blank lines as pauses of its own.** Hand it the narration
with its paragraphs intact and it does the pacing for you — badly, and the
punctuation pass then adds its own on top. Three independent measurements, same
script and same voice each time, blank lines against one continuous block:

|             | with paragraphs | one block | model-added silence      |
| ----------- | --------------- | --------- | ------------------------ |
| Madagascar  | 50.7 s          | 31.5 s    | 19.2 s                   |
| Cameroun    | 29.2 s          | 22.5 s    | 6.7 s (23 % of the take) |
| Zimbabwe V2 | 27.8 s          | 25.5 s    | 2.3 s                    |

**A silence-ratio test will not find this.** The model's pauses land in exactly the
places the punctuation pass targets, so the proportion of silence looks normal
while the duration inflates. Only a take-against-take comparison shows it — which
means the only way to know whether an existing cut is affected is to regenerate its
take and measure, at the cost of a fresh pronunciation lottery.

So: strip the blank lines for the TTS prompt, keep them in
`narration.fr.txt`. The file's paragraphs are the scene boundaries and the engine
needs them; the voice must never see them.

## The tempo is a means, and the cadence is the target

Opened by the first of the thirteen videos, on 2026-09-09, and worth stating
before the twelve others repeat the question.

`production.json` carries a `tempo`, and 0.94 has been treated as a working
reference. It is not the target. **The target is the cadence of the approved V5
performance, measured at 2.84 words per second.** Traoré's first cut came out at
4.05 and needed `tempo` 0.66 to land at 2.88, which is right on the reference even
though the factor looks extreme.

**Slowing the voice at the source instead was tried and rejected**, and the
measurement is the reason. On a slow take « jamu » and « Soundiata » drifted in
intonation: pitch range per word, ranked against the other words of the same take,
put « Soundiata » at the 91st percentile, and a fresh take at a neighbouring
setting came back worse, at the 97th. Time-stretching preserves pitch by
construction — « jamu » measured 5.8 semitones of range, identical to the approved
take — so the stretch is the safe lever and `speech_rate` is not.

**Below `tempo` 0.85, a human has to listen before delivery.** No machine in the
production chain can hear whether a voice has been stretched past what it will
carry. The session produces a short extract of the sentences that matter — the
« à écouter » words of the narration — and stops there.

## Reading a transcript without being fooled by it

Diffing the authored narration against a Whisper transcript is the only pronunciation
check available without ears. It works, and it lies in three specific ways. All three
were paid for on 2026-09-07.

**French agreement endings are silent, so an agreement "defect" is not one.**
`confondue` → _confondu_, `bâties` → _bâti_, `maisons` → _maison_ are homophone pairs:
the transcript is choosing a spelling, not reporting a mispronunciation, and no take
could ever satisfy the written form. Three of seven findings in one pass were this.
Before reporting a divergence, say the two forms aloud — if they sound the same, there
is nothing to fix.

**Probe one candidate per take.** A probe that puts four respellings in a single
generation primes Whisper's language model on its own repetitions: on the `nzadi`
probe every candidate came back correct _including the control that had already failed
in production_. One candidate, one take, in its real sentence.

**The engine is not deterministic on a hard word**, so a single transcript is not
evidence either. Where a word matters, measure the acoustics instead: for `nzadi` the
test was the 200–450 Hz share of frame energy in the 80 ms before the frication —
0.28 on the failing take (that was the `/l/` of the preceding word, no nasal at all)
against 0.62 with the respelling. The nasal onset was restored even though Whisper
still wrote "Enzadi", because French has no orthography for a word-initial /nz/.

## The card grammar

A project no longer sets a y. It declares a role and a text:

    {"role": "nom", "text": "Krou"}

Roles and their scale are in `ethni_type.py`; the order they stack in is in
`ethni_compose.py`. On a video frame the register — `serie` and `date` — is pinned
at the top and everything else is one group, spaced and centred in what is left
above the caption band. A carousel card still packs from its own anchor: it has no
caption band under it and its whole surface is the card.

**Everything is white. Gold is spent once per frame, on the name being examined.**
The renderers assert it. A historical spelling is evidence and does not take the
accent; a plaque declares which of its two terms does.

**The first frame of a video is the cover of its carousel** — the same block, from
the same module: series, name, place on today's map, the astonishment question, one
plain sentence. It carries no entrance, because a block that fades in is not there
on frame one.

**The type scale is solved, not fixed.** The copy is validated word for word and is
never shortened to fit a frame, so the engine finds the largest scale at which every
card of a deck clears its band, once per format.

Full schema in `ethni_render.py`'s docstring and `ethni_carousel.py`'s; doctrine in
`Gabarits/GABARITS-SOCIAL.md`; what was measured to get there in
`Gabarits/GABARITS-SOCIAL.md`.

`items` still works and is the escape hatch for a composition no role covers. A
project that reaches for it twice has found a missing role — add the role.

`Projects/_Temoin-Gabarit/` is a ten-second witness for `forme` and the plaque.
`Projects/_Temoin-Figures/` is the second, for `mot`, `chiffre` and the solved
size. Both narrations are rigs — silence, hand-written word timings — and both
READMEs say so. Neither is an episode and neither is for publication.

## Where a finished render is delivered

The render stays in `Projects/<Name>/work/`. What reaches
`02-Reseaux-sociaux/Brouillon/<dir>/video/` is a _derived copy_, and it is never
taken by hand: the post's entry in `00-Index/publications.json` carries
`renderedFrom`, and `node 00-Index/sync-deliverables.mjs --write` refreshes every
delivery from its source. On 2026-09-07 a hand copy of the Cameroun and Sénégal
finals went stale within minutes because the session re-rendered while the library
was being organised, which is why the copy is a re-runnable operation.

Two things were fixed on 2026-09-09 when the first of the thirteen videos was
delivered: the script hashed with `md5 -q`, which exists only on macOS, and it
copied into a `video/` directory it did not create, because until then it had only
ever run on posts that were already published.

## The constraints the engine enforces rather than documents

- The ending is `outro-reseaux-sociaux.mp4`, SHA-256 `e6574c24…`, and the render
  aborts on any other file. Two different endings were once both named
  `outro.mp4` and every project copied the wrong one by default.
- `outro_start + 1.68 s >= last caption end + 0.30 s`. The social handles occupy
  y 1233–1363 and a caption lands at y 1298–1421; solving the ending's _length_
  is not enough, its _start_ is what has to be solved.
- A scene with a sourced visual and no `credit` line fails.
- **A `plate` may not climb into the register's ink**, and the failure names the
  `centreY` that clears it. A plate is not shaded the way a photograph is, so the
  white register keeps whatever contrast the document's own paper gives it.
  Measured 2026-09-10 across the ten plate scenes of five projects: the six that
  clear the register read at 14.0 against the green ground, the four that did not
  fell to 1.2–2.9, below the 3.0 floor for large text and invisible on two of
  them. Krou shipped it on 2026-09-09 and no one saw it; Libreville and
  Brazzaville met it independently the next day. Separation rather than shading
  was the ruling: darkening the plate veils a document whose legibility is the
  argument, and neither shading nor a dark register would undo the other half of
  the defect, which is the register landing on the document's own typography.
  Lowering cost nothing — all four scenes still fit the frame whole. A document
  too tall to fit under the register fails naming the `width` that would.
- A text line wider than its safe box fails rather than being shrunk silently —
  **after** the role's size has been solved. Each role gets one size for the whole
  video, the largest at which all its cards fit; a line that still does not fit at
  that size is a copy fault a human has to see. Measured 2026-09-09: without this,
  « MIKUNDUKHU » and « IMPATIENS NIAMNIAMENSIS » made two of the thirteen videos
  unrenderable, on frozen copy.
- Captions must not re-encode the audio: the final and the clean master must hash
  identically, which is what proves no approved sentence moved.
- `exif_transpose` on every loaded image — one sourced photograph rendered
  sideways without it.
- A card whose ink leaves y 150–1100 or exceeds 840 px fails, named. The box is
  measured, not assumed: a two-line caption occupies y 1127–1420 and the credit
  y 1490–1560.
- A block whose cards do not fit fails before a frame is encoded.
- A `mot` without its French meaning fails. Plain language, rule 5, as a gate.
- A frame carrying more than one gold element fails, naming the count.
- A carousel whose ranks are not 1..n in order fails: the rank leads the filename
  and a hole loses the reading order at upload.
- **A face that does not cover the string it is given fails, naming the character.**
  Nothing checked this, and TikTok Sans — which sets every gloss, register line and
  credit — carries no Khoekhoe click, on a corpus with a Khoekhoe carousel.
- A `cue` whose word is absent from the paced take, or which resolves before its
  own scene starts, fails. Both fired on the witness's first render.
- A plaque shares its scene only with `serie` and `date`. Measured: with a
  `forme` card below the rule, the five frames before the proper name arrives read
  « KROU → CRUA », a statement the corpus does not make.
- The flat-colour-ground share is measured into `validation.json` at every render,
  against the doctrine's 2 % cap. Ghana measures 0.0 %; Sénégal V2 measures 15.9 %.
  Reported, not yet gated.

## Fonts

`fonts/` carries Anton (captions), TikTok Sans (on-screen sans), Fraunces and
Nunito Sans (the brand card). Fraunces and Nunito Sans are **variable** fonts
whose default instance is far too light; the engine pins the weight axis. A
production that assumed otherwise fell back to Montserrat and shipped thin.
