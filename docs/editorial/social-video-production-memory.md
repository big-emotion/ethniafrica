# Social video production memory

Recorded: 2026-09-05. Project: EthniAfrica. Reference production: the Bantu short, V5.

This is a project memory and a foundation for the future `video-social-director-clipping`
skill, not an installed skill or a replacement for Confluence requirements. The user
explicitly approved the final format, audio, animations and overall result. Reuse
these decisions instead of asking the user to design the format again.

## What the user wants

Produce short, engaging French videos for EthniAfrica's social accounts from the
site's substantial corpus. Combine editorial direction, a strong spoken hook,
documented explanations, relevant clips or archival material, readable captions
and an animated brand ending. Start with TikTok, Instagram Reels and YouTube Shorts;
adapt distribution to other channels when requested.

The approved outcome is a paced explanation, not a fixed-duration template. The
complete approved narration determines the video length. Never delete a sentence,
silently rewrite the argument or accelerate speech to fit an earlier export.

Documentation and production code are in English. Narration, on-screen copy and
quoted French source material remain in French. The French text below is the exact
approved media copy, preserved as source material.

## Approved reference and recovery assets

| Asset                                                          | Reference                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **V5 approved video**                                          | [MP4, 34.76 seconds](https://d2ol7oe51mr4n9.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/0a519f46-1ca2-42d5-ac94-a79237ed12e7.mp4) |
| **V5 production project**                                      | [ZIP](https://d2ol7oe51mr4n9.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/8b9937f1-9f2f-4317-a820-35d8aae8068b.zip)                |
| V5 contact sheet                                               | [Preview](https://d2ol7oe51mr4n9.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/23c02e4d-8974-4181-8287-f4b20160b481.jpg)            |
| V4 project, original continuous narration before pause editing | [ZIP](https://d2ol7oe51mr4n9.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/fc03c0d5-3b0e-4cac-aa21-3f512fdef3c5.zip)                |
| V3 project, authentic social excerpt and opening artwork       | [ZIP](https://d2ol7oe51mr4n9.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/f08dd625-b2c6-4596-90f3-70c674734920.zip)                |
| V2 project, brand fonts and original branded ending            | [ZIP](https://d2ol7oe51mr4n9.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/3bf41602-6005-43c8-a168-f51a8599d280.zip)                |
| V1 project, raw archival footage and extracted Bleek page      | [ZIP](https://d2ol7oe51mr4n9.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/effe950f-f24b-4a80-8681-05f04af61b22.zip)                |

The V5 package preserves the clean master, edited narration, script manifest, SRT,
alignment report, word timings, scene starts, pause audit, silence validation,
production scripts, source notes, opening artwork, logo, fonts and outro. It is a
recovery package, not a standalone application: scripts reference the Higgsfield
workflow bundle and earlier assets. `prepare.py` and `align.py` record successive
preparation/alignment steps. The session also ran a localized `refine.py`, but
inspection of the delivered ZIP confirmed that this helper itself was omitted.
Its final outputs are preserved in the SRT, alignment report, word clocks and scene
starts. Do not assume `prepare.py` alone reproduces the final timing refinement.
Read and adapt paths before running the scripts; retain the archived final clocks
for exact replay. The reproduction appendix below records the missing refinement.

Hosted links were delivered successfully in this session; their future availability
is not guaranteed. No temporary sandbox files remain. Do not depend on conversation
tool stores or old `/home/user/bantu-v*` directories in a new session. Recover assets
from the packages, and keep approved media in durable project storage when a storage
destination is established. Never save signed upload URLs or credentials in git.

## Frozen French narration

> Fier d’être Bantu ? Mais « Bantu », ce n’est pas le nom d’une ethnie ou d’un peuple unique. C’est une étiquette créée par un linguiste européen.
>
> Le mot, lui, a des racines africaines : il renvoie aux personnes.
>
> En 1862, le linguiste allemand Wilhelm Bleek l’utilise pour regrouper des langues apparentées.
>
> Le terme est ensuite repris dans des classifications raciales coloniales.
>
> Pour classer des centaines de peuples totalement différents, sur la seule base de similarités de langue.
>
> Le mot d’un linguiste a effacé des centaines d’identités.
>
> Chaque peuple a pourtant son propre nom.
>
> Retrouve-les sur EthniAfrica.

The user deliberately restored the two forceful sentences beginning “Pour classer”
and “Le mot d’un linguiste”. Do not silently soften or remove approved copy when
revising timing. Equally, script approval is not independent verification of its
claims: the sentence about identities being erased is editorial rhetoric, not a
finding established by the historical source. Do not generalize it into future
videos as a sourced fact. “Totally different” peoples is also emphatic wording,
not a precise anthropological classification.

The African origin of the word must remain distinct from a European scholar's
use of it as a linguistic category. The earlier claim that a European invented
the African word itself was corrected. The earlier sentence about speaking related
languages was removed at the user's request. Respect contemporary self-identification
and do not imply that speakers cannot identify as Bantu.

## Voice and pacing: the decisive final correction

- Voice used: **Inès**, Higgsfield `seed_audio`, `voice_type: preset`,
  `voice_id: 023ebf5e-1970-40d8-825c-a5ef6a1dd4ff`. This exact pair came from the
  supplied production guide and worked in the session. Verify availability if the
  provider changes; never invent an identifier or silently change the voice.
- The hook must be spoken, including the opening question. A silent title followed
  immediately by unrelated narration was rejected.
- V4 contained all 93 authored lexical tokens, but its delivery felt rushed.
  V5 retained that performance, added punctuation pauses and used pitch-preserving
  `atempo=0.94`. This is a successful reference setting, not a mandatory correction
  to apply repeatedly to already edited audio.
- The opening pause measured **0.676 seconds of acoustic silence**; the target was
  about 0.7–0.75 seconds. Let the question land before “Mais”.
- Commas use short breaths, generally about 0.15–0.30 seconds. Strong punctuation
  and changes of idea use roughly 0.35–0.70 seconds. Existing natural pauses count
  toward the target; do not add identical silence after every punctuation mark.
- Keep a lively, conversational pace. V5 narration lasts **32.736708 seconds**;
  the video lasts **34.76 seconds**, including a readable final hold. These are
  observations, not duration limits for the next script.

V5 editing used Whisper word boundaries from V4, located low-energy cuts between
words, inserted only the missing silence, applied 2 ms edge fades to avoid clicks,
then ran pitch-preserving tempo adjustment. It retained the complete source sample
sequence before tempo processing, with edge amplitudes changed by the fades. It was
not a new synthesized performance. New work can generate natural prosody directly
or edit an existing performance; evaluate the result instead of assuming line breaks
in a TTS prompt guarantee audible pauses.

The final audio must exist before final scene timing. Check pronunciation of
EthniAfrica, autonyms, unfamiliar names and dates. A high transcription similarity
score does not prove native pronunciation or a natural listening experience.

## Visual and caption preset

| Property            | Approved reference                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Canvas              | Portrait 9:16, 1080 × 1920                                                                               |
| Export              | MP4, H.264, YUV420p, 25 fps, AAC audio, fast-start metadata                                              |
| Main captions       | Anton, uppercase, approximately 99 px on this canvas                                                     |
| Caption color       | Gold `#FFD33D`, black outline                                                                            |
| Caption density     | At most 3 words / 24 characters per cue; at most 2 lines                                                 |
| Caption placement   | Lower part of the image, bottom inset 24%, maximum width 74%                                             |
| Renderer parameters | Font-size fraction 0.052, stroke fraction 0.06, minimum duration 0.3 s, gap 0, tail 0.18 s, bridge 0.3 s |
| Background material | Relevant archives, primary documents, authentic excerpts and name cards                                  |
| Motion              | Restrained image movement and staggered brand reveal; text remains readable                              |

Treat this as the user-approved style, not a claim that these settings will always
be a current platform trend. When new trend research is requested, verify current
examples. Review at actual phone size first and keep text away from platform controls;
safe zones must be rechecked for the intended destination and any changed layout.

The sequence follows the argument: social hook → explanation → primary document →
historical context → names → EthniAfrica. V5 briefly cycles through baKongo, baGanda,
baLuba, baSotho and baTswana. These spellings came from the supplied guide; verify
autonyms and grammatical prefixes before reusing or expanding the list.

## Animated EthniAfrica ending

Read current brand values from the project, rather than sampling a screenshot:

- Logo: `public/africa.png`; public asset: <https://ethniafrica.com/africa.png>.
- Name and tagline: `src/lib/brand.ts`, used by `src/components/layout/SiteHeader.tsx`.
- Palette: `src/styles/tokens/color.css`; fonts: `src/styles/tokens/type.css`
  and `src/app/layout.tsx`.
- Brand context: [brand charter](../design/brand-charter.md).

Approved ending: parchment `#FBF7F2`, dark brown `#2C2018`, Fraunces 900 for
“EthniAfrica”, Nunito Sans for the supporting copy. Always include
**“Atlas des Peuples d’Afrique” directly beneath EthniAfrica**, in the warm
orange-to-gold treatment (reference endpoints `#DA622F` and `#F2BA36`). The URL uses
terracotta `#B64E27`.

The Africa logo enters with a small zoom and rotation, then settles in about 0.8 s.
The name rises and fades in, followed by the tagline, then the supporting copy and
URL. All entrances finish at about 1.5 s; hold the stable result for at least 2 s.
Use separate transparent layers, retaining the official logo rather than generating
an approximate logo.

Reference text order:

1. EthniAfrica
2. Atlas des Peuples d’Afrique
3. Le vrai nom / de chaque peuple.
4. ethniafrica.com

The tagline and source annotation are visual only. Narration ends with
“Retrouve-les sur EthniAfrica.” Keep enough vertical separation that this last
caption never obscures the URL. V5 positions on the 1080 × 1920 canvas are recorded
in `produce.py`: logo around y=350, name y=690, tagline y=815, supporting lines
y=930/1007 and URL y=1080. Use the script for exact font metrics.

## Sources, excerpts and permission state

Historical reference: [South African History Online, “Defining the term Bantu”](https://sahistory.org.za/article/defining-term-bantu).
Additional reference: [Dictionary of South African English, Bantu](https://dsae.co.za/entry/bantu/e00566).
The on-screen asterisk accompanies only the African etymology / linguistic
classification passage. It is excluded from the voice manifest. The compact note
names the distinction, SAHO and the article; the full URL belongs in the post's
source description. Do not let a source note imply support for unrelated rhetoric.

The authentic social excerpt is from [Pierre André Edzoa Ndengue's LinkedIn post](https://www.linkedin.com/posts/pierre-andr%C3%A9-edzoa-ndengue-478244193_ce-matin-encore-je-souhaite-exprimer-ma-gratitude-activity-7328316989712592896-2DB8).
It contains both lines, “Fier d’être Fang-Béti. Fier d’être un fils Bantu.” The
Fang-Béti line is essential context: the author already names a specific identity.
The opening is labelled as a public LinkedIn excerpt, with attribution. It does
not recreate engagement counts or invent a social interface. Only one verified
post was used; searches did not establish a set of authentic TikTok/Reels examples.

**Permission is pending as of this record.** The user requested a private message
asking permission before publication and sharing the entire final video. The draft
was approved; no message was sent by the assistant and no reply or permission was
recorded. The video has not been published to social accounts by the assistant.
Production approval and export are distinct from publication authorization.

For this reuse, retain the user's explicit approval condition: share the exact full
cut, disclose the provocative framing, quote the intended excerpt, state attribution
and intended accounts/platforms, and obtain an explicit agreement before publication.
Remove the excerpt if permission is declined. Update the review link when the cut
changes. Explain that the post was found while searching online for examples of
Bantu pride. Do not send messages or publish automatically.

Archive sources used in the reference:

- [Belgian Congo and the East African campaign (1916), Internet Archive](https://archive.org/details/belgian-congo-and-the-east-african-campaign-1916).
  The recovered source is 480 × 360 at 25 fps. Upscaling/cropping does not create HD
  detail. Reference crop: scale to 2560 × 1920, then crop 1080 × 1920 at x=740, y=0.
- [Bleek, A Comparative Grammar of South African Languages (1862), scan](https://archive.org/download/bleek-a-comparative-grammar-of-south-african-languages-1862-pt.-1-2/Bleek%2C%20A%20Comparative%20Grammar%20of%20South%20African%20Languages%20%281862%29%20-%20Pt.%201-2.pdf).
  The title-page extraction used PDF page 7 (one-based).

Hosting on an archive or social platform is not itself proof of reuse rights.
Record item-specific license, attribution and permission status for future assets.
Archive imagery is contextual illustration unless it documents the exact claim;
do not label an unidentified person or community from appearance alone.

Original user-supplied planning artifacts, retained for provenance:
[production guide](https://claude.ai/code/artifact/50b6351e-676d-4973-96af-c1d761316f46)
and [social plan](https://claude.ai/code/artifact/68a425c2-8d16-4d9f-bdc2-eb8e0e6c2536).
The final decisions in this record supersede the guide's silent hook and short timing.

## Reproduction workflow and failure lessons

1. **Script first.** Show the whole proposed narration in the conversation. Keep
   spoken copy separate from titles, citations, metadata and visual-only text.
   Preserve accepted revisions and existing authorization across turns.
2. **Audio before timing.** Generate or edit the full performance, measure pauses,
   and check the hook, middle and final sentence. Use its actual duration plus a
   final hold to determine the timeline.
3. **Transcribe the clean final narration.** Use the authored script for spelling
   and Whisper for word timing. Never estimate caption timings from word counts or
   reuse V4 clocks on V5 audio.
4. **Check coverage before rendering.** Require all authored words in the captions,
   plausible speech density and alignment similarity at least 0.90. Normalize
   apostrophes/punctuation for comparison without deleting spoken words.
5. **Assemble a clean master.** Time scenes to the audio, retain document/source
   context, and add the independent brand animation. Preserve this master.
6. **Burn captions from the clean master.** Use the available subtitles skill and
   its bundled renderer. The reference's `gold_burn.py` is a narrow wrapper changing
   the bold text fill to gold while retaining the bundled geometry and timing.
7. **Verify and deliver.** Inspect phone-sized frames, check full decode, streams,
   duration, voice tail, captions and the stable final card. Export a usable MP4
   and recovery package, display the video, and clean temporary files.

Important implementation lessons:

- French Whisper can split `d` + `'être`, or punctuation into a separate token.
  Merge apostrophe/hyphen continuations for authored alignment. A standalone `?`
  must not extend the preceding word's speech end across the whole pause.
- Whole-file Whisper can place a word onset inside a long silence. V5 used the
  medium model after detecting this issue, then retranscribed the short closing
  sentence from the final audio and applied its real extraction offset. Do not
  invent timings to satisfy an assertion. `align.py`, the final timing sidecars and
  the reproduction appendix preserve the method and result.
- V5 global similarity was about **0.9785**, with **93/93 words**, and the localized
  closing-sentence alignment scored 1.0. These are alignment checks, not historical
  fact-checks or proof of natural pronunciation.
- The video and audio streams must finish within 0.2 s of each other after the
  planned audio padding. Caption burning must preserve the master's audio; the
  reference compared copied AAC stream hashes and performed a full decode.
- Earlier outputs failed editorially through silent hooks, omitted approved lines,
  a missing tagline, a static ending, and rushed punctuation. Treat these as
  explicit regression cases for the future skill.
- **"EthniAfrica" mispronunciation is systemic, not a one-off.** Confirmed on
  3 of 3 productions (Bantu, Afrique, Nigeria): the `seed_audio`/Inès voice reads
  the brand name as two French words ("Etnie, Afrique") rather than one blended
  name. Do not keep re-testing this on every new script. It is a known, accepted,
  non-blocking limitation: burned captions are aligned to the **authored** script
  text, not the raw ASR transcript, so the on-screen brand name still reads
  correctly even when the spoken audio does not land cleanly. Revisit only if the
  provider or voice changes, or if the user asks for a phonetic-spelling fix.
- **Typographic term cards are the workaround for a term the voice cannot say
  distinctly**, not just a stylistic choice. The Afrique production originally
  scripted the voice to contrast "Africa" (Latin/Roman) against "Ifrīqiya"
  (Arabic-era) against "Afrique" (modern French) — the TTS voice rendered all
  three as "Afrique," silently erasing the argument the script existed to make.
  Verified independently with an isolated short-prompt re-generation, which ruled
  out a Whisper mishearing. The fix was editorial, not technical: remove the
  requirement that the voice pronounce the foreign/technical term at all, and
  instead show it as a generated text card (same technique as Bantu's five-name
  sequence) timed to the narration beat that describes it. Apply this pattern
  proactively for any script that hinges on an audible contrast between
  near-homophonic or foreign terms, rather than discovering it after generating audio.
- **A sub-0.90 alignment similarity does not automatically mean broken captions.**
  The Afrique production scored 0.82 (below the workflow's own ≥0.90 target) with
  102/102 words still timed, because captions are built by aligning Whisper's
  _timing_ to the _authored_ script text, not by displaying Whisper's raw guess.
  The score dropped from minor ASR mishearings ("Carthage" heard as "cartage",
  "l'est" heard as "l'aide") that never reach the viewer. Read this score as a
  timing-confidence signal, and separately check that captions display the
  authored words, before treating a low score as a rendering defect.

### Tool environment observed in this session

Higgsfield generated the voice and its remote sandbox supplied FFmpeg, Pillow,
faster-whisper and the workflow bundle. Discover currently available tool schemas
and read the relevant skill before reuse; these provider details may change.

- Bundled caption scripts were under `$HF_WORKFLOWS/subtitles/scripts/`:
  `fetch_fonts.sh`, `audio_to_captions.py`, `subtitle_paper_burn.py`.
- Reserve upload slots before producing deliverables; PUT the actual bytes and
  require HTTP 200 before confirming each media ID once. Show the final video with
  the provider's native media display. A sandbox path is not a delivered asset.
- The sandbox was ephemeral after short calls. Background jobs provided a 15-minute
  lease. Download, render and upload in a self-contained pipeline where possible;
  keep setup calls within the active lease when splitting work.
- Commands were limited to 16,000 characters. One oversized submission was rejected
  before execution. Split script transfer into bounded calls or use a packaged
  script; do not confuse a request-size error with an executed render failure.
- Keep upload scripts containing signed URLs out of the recovery ZIP. Clean remote
  work directories and local `.playwright-mcp/` captures after their purpose ends.
- The seed voice job that supplied V4/V5 speech was
  `10eae649-1912-4b92-af9d-92bc173bc529`; V5 edited its performance. Do not assume
  credit balance, voice availability or generation choices carry to a new session.

## Second wave: Afrique and Nigeria (2026-09-05)

Two further shorts were produced the same day, applying this memory's method to
new corpus topics rather than replaying Bantu. Both started from the site's live
anecdote pages (`/fr/dossiers/anecdotes?a=<slug>`) and were chosen over two other
candidates (lingala, Amazigh) specifically because their source pages carry a
**referenced**-tier citation, unlike the other two, which are marked
"Provenance à documenter" on the site itself. Topic selection followed the source
tier, not narrative appeal alone.

### Approved French narration

> Afrique. Cinquante-quatre pays, trente millions de kilomètres carrés. Vous savez d’où vient ce nom ?
>
> À l’origine, ce nom ne désignait presque rien.
>
> Les Romains appelaient « Afri » les habitants de la région de Carthage.
>
> Leur mot ne nommait qu’une seule province — la Tunisie et l’est de l’Algérie actuels.
>
> Les Arabes ont repris ce territoire sous un autre nom, avec la même portée limitée.
>
> Puis, au Moyen Âge, le mot s’est étendu à toutes les terres au sud de la Méditerranée.
>
> Un peuple d’une province a fini par nommer trente millions de kilomètres carrés et cinquante-quatre États.
>
> Retrouve l’histoire de chaque pays sur EthniAfrica.

This is the **second, corrected** version. The first version had the voice speak
"Africa" and "Ifrīqiya" as distinct foreign terms to contrast against modern
"Afrique" — the TTS voice collapsed all three into "Afrique," silently erasing the
etymological argument. The user chose to rewrite the script rather than chase a
phonetic-spelling fix (see the lessons above). "AFRICA" and "IFRIQIYA" (no macron;
the sandbox font's glyph coverage for the macron was not verified, so it was
dropped rather than risk an unrendered glyph) appear only as generated text cards,
timed to the Roman-province and Arab-era beats respectively — never spoken.

> Le pays le plus peuplé d’Afrique porte un nom trouvé par une journaliste, pour éviter une phrase trop longue.
>
> Le 8 janvier 1897, Flora Shaw publie un article dans le Times.
>
> Elle propose un nom simple pour les territoires administrés par la Royal Niger Company.
>
> Elle suggère : « Nigeria ».
>
> En 1914, Frederick Lugard officialise ce nom lors de la fusion des protectorats du nord et du sud.
>
> Cet homme, elle l’épousera en 1902.
>
> Retrouve l’histoire de chaque pays sur EthniAfrica.

The closing line was generalized to "chaque pays" (country) rather than
"chaque peuple" (people) for both scripts, since these two shorts are about
toponyms/country names, not ethnonyms — reuse "chaque peuple" only when the
episode is actually about a people's name.

### Production assets

| Asset                     | Reference                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Afrique — final video     | [MP4, 41.68 s](https://d2ol7oe51mr4n9.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/033a1d77-c2f9-4dd1-8028-f8ffc3f8cf6c.mp4)          |
| Afrique — narration audio | [WAV](https://d8j0ntlcm91z4.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/hf_20260905_030402_51368d25-012a-4597-b059-4a83002c479f.wav) |
| Nigeria — final video     | [MP4, 35.12 s](https://d2ol7oe51mr4n9.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/ce612454-7e7f-464c-90fe-c0a37d88fbdd.mp4)          |

No recovery ZIP was packaged for either short (unlike the Bantu V5 package) —
these two are prototypes pending a durable storage decision. Both reused the V5
project's `outro.mp4` unmodified rather than re-animating the brand ending; both
generated narration with the same `seed_audio`/Inès pairing documented above.
Combined cost: 9.0 credits (Afrique, including one isolated pronunciation-check
generation) + 3.3 credits (Nigeria) = 12.3 credits.

### Visual sourcing, license-verified per item

| Video   | Visual                                            | Source                                    | License                           |
| ------- | ------------------------------------------------- | ----------------------------------------- | --------------------------------- |
| Afrique | Carthage ruins photograph                         | Wikimedia Commons                         | CC BY 3.0 / GFDL                  |
| Afrique | Ortelius 1608 "Roman Africa" map                  | Wikimedia Commons                         | Public domain (CC BY-SA 4.0 scan) |
| Nigeria | Flora Shaw portrait, 1908                         | National Portrait Gallery (via Wikimedia) | CC BY-SA 4.0                      |
| Nigeria | Royal Niger Company ensign                        | Wikimedia Commons                         | CC0                               |
| Nigeria | Frederick Lugard, solo portrait, c. 1880s         | Elliott & Fry, via Wikimedia              | Public domain                     |
| Nigeria | Lugard and Shaw together, 1908                    | Wikimedia Commons                         | Public domain                     |
| Nigeria | "Map of Northern Nigeria", 1911, English-language | Stanford's Geographical Establishment     | Public domain                     |

The first map sourced for Nigeria ("Protectorat Nigeria 1909") was caught and
rejected during a visual proof-sheet check: its labels were in Russian, not a
usable primary document for this claim. Always inspect a sourced map/document
image directly before locking it into the timeline — a promising filename or
description is not a substitute for looking at the actual pixels.

### Known deviations from the V5 reference spec

- Nigeria's source-note plate used Montserrat, not "TikTok Sans" (not present in
  that sandbox instance). Font availability is sandbox-specific; verify before
  assuming a font from an earlier session's environment is still there.
- Nigeria's caption grouping used simple word-count/character-limit grouping
  rather than the bundled `group_captions` helper referenced in the Bantu
  reproduction appendix — visually correct on inspection, not confirmed
  byte-identical to that helper's output.
- Neither production's actual spoken pronunciation of proper nouns ("Flora Shaw,"
  "Lugard," "protectorats," "Carthage") was independently verifiable by the
  agents that produced them — they can check transcription coverage and
  alignment, not listen. Human review before publication should include an
  actual listen-through, not just the coverage/alignment metrics.

## Foundation for the future skill

Working name: **video-social-director-clipping**. Its job should cover research,
editorial scripting, narration direction, clip selection, assembly, captioning and
delivery, with publishing handled only when separately authorized. “Clipping” means
selecting relevant excerpts or sequences, not requiring every video to start from
a pre-existing long video.

### Corpus entry points

Start from `dataset/source/afrik/`, the versioned editorial source. Read relevant
fiches and their actual sources; use the current strict models in
`public/modele-*.json`. Do not treat a site's text or its AI provenance as independent
verification of every claim. Consult the project's source-tier policy and
[classification notes](./classification-status.md). Classification is top-level
`classificationStatus`, and `null` must not be read as “reviewed and consensual”.

Candidate material lives in `peuples/`, `famille_linguistique/`, `langues/`,
`pays/`, `noms/`, `patronymes/`, `systemes_onomastiques/`, `migrations/` and
`relations/`. Discover paths and schemas instead of assuming identical fields in
every class. On people fiches, inspect `content.appellations`, including
`selfAppellation`, `originOfExonyms`, `whyProblematic` and `contemporaryUsage`.
Carry source tiers, uncertainty and competing accounts into the editorial brief.

Potential series, to research rather than treat as pre-approved claims:

- Where a people's name comes from; autonyms and exonyms.
- A linguistic label and the distinct identities it includes.
- The history or meaning of a surname or naming practice.
- Peoples across today's borders; migrations and historical relationships.
- A primary document that helps explain a naming or classification debate.
- A popular social claim compared with the evidence, retaining the speaker's context.

For each candidate, record the fiche ID/path, proposed angle, audience question,
claim-level sources, visual opportunities, uncertainty, pronunciation needs and
rights status. Select one explainable idea per short. Reuse of the format does not
mean repeating the Bantu argument or attributing every exonym to Europe.

### Small skill structure and test-first phases

Keep the first implementation simple: one `SKILL.md` entry point, references to
this memory and the project charters, reusable brand assets/configuration, and a
small number of tested helpers. Compose with existing curation, video and subtitle
capabilities when applicable. Do not create a second rendering framework or mirror
the corpus. The repo ignores `.agents/` runtime mirrors; review the existing
versioned `.claude/skills/` convention and ignore exceptions before installing a
future project skill. This task records the experience only; no skill is installed.

| Phase              | Define/check before implementation                                                           | Produce                                            |
| ------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Topic selection    | A candidate has a precise question, identifiable corpus record and traceable evidence        | A ranked, small set of video briefs                |
| Script             | Full wording, sources, uncertainty and spoken/visual separation are reviewable               | An approved script and source map                  |
| Voice              | Hook is spoken, punctuation pauses are audible, names are reviewed, text is complete         | Full narration and measured pacing                 |
| Timeline           | Duration follows audio; source notes attach to supported claims; excerpt rights are recorded | Scene plan and clean master                        |
| Captions and brand | Full coverage, valid glyphs, safe placement, no URL overlap, tagline present                 | Captioned video with animated ending               |
| Delivery           | Decode, stream durations, voice tail, preview frames and usable hosted artifact pass         | MP4, source/permission record and recovery package |

Before writing reusable helpers, add focused regression tests for dropped phrases,
an unspoken hook, punctuation-token timing errors, captions surviving over a long
pause, missing branding and clipped audio tails. Prefer assertions on observable
outputs over tests that merely repeat implementation details. A documentation-only
memory update does not need a new automated test suite.

Minimum future inputs: topic or fiche reference, intended audience/platform,
language, approved style reference, source/rights constraints, and any actual user
duration limit. Minimum outputs: script, visual/source map, narration, clean master,
captioned MP4, validation evidence and recovery assets. Ask only for missing decisions;
the style and natural pacing documented here are already approved defaults.

## Reproduction appendix: voice, cut sheet, motion and asset fingerprints

### Exact voice recovery and pause edit sheet

For the same video, reuse `narration-v5.wav` from the V5 project. Calling TTS again
with the same model and text does not guarantee the same performance. For a new
script, the original generation used:

```json
{
  "model": "seed_audio",
  "voice_type": "preset",
  "voice_id": "023ebf5e-1970-40d8-825c-a5ef6a1dd4ff",
  "speech_rate": 0,
  "prompt": "The complete approved French narration, with paragraph breaks"
}
```

Replace the illustrative `prompt` with the actual narration; it is not an
instruction to be spoken. V4's eight narration paragraphs were joined with two
newline characters. V5's pacing was applied after generation. The
[original V4 WAV](https://d8j0ntlcm91z4.cloudfront.net/user_3Fz2yiCXaIOXzyrKzxVypdq5WdN/hf_20260905_015638_10eae649-1912-4b92-af9d-92bc173bc529.wav)
is also available separately. No background music was added to the approved cut.

These cuts refer to the original 27.2 s WAV, before tempo adjustment. Do not apply
them to the already paused V5 WAV or to a newly generated performance.

| After word                         | Original cut position (s) | Silence inserted before tempo (s) | Intended total gap after tempo (s) |
| ---------------------------------- | ------------------------: | --------------------------------: | ---------------------------------: |
| Bantu, opening question            |                  1.406750 |                          0.525000 |                               0.75 |
| unique.                            |                  4.403958 |                          0.190000 |                               0.50 |
| européen.                          |                  6.444583 |                          0.377000 |                               0.55 |
| africaines, before the explanation |                  8.366750 |                          0.199583 |                               0.34 |
| personnes.                         |                  9.446750 |                          0.237000 |                               0.55 |
| apparentées.                       |                 13.963917 |                          0.310000 |                               0.50 |
| coloniales.                        |                 17.167000 |                          0.411208 |                               0.48 |
| différents,                        |                 19.023958 |                          0.225583 |                               0.24 |
| langue.                            |                 20.843333 |                          0.451000 |                               0.65 |
| d’identités.                       |                 23.444583 |                          0.498000 |                               0.70 |
| nom.                               |                 25.325000 |                          0.150000 |                               0.50 |

The breaths around “Le mot, lui,”, after the second “Bantu” and after “1862,” were
already sufficient. Editing used stereo 24 kHz signed 16-bit PCM; inserted frame
counts are rounded to the sample rate. For a new boundary, the calculation is
`max(0, desired_gap * 0.94 - existing_gap)`. A 4 ms low-energy window chose the cut
and a 2 ms fade softened its outgoing edge. Apply `atempo=0.94` once after insertion.

Use `silencedetect=n=-40dB:d=0.12` on the output to distinguish acoustic silence
from Whisper timestamps. The opening measured 1.38587–2.06233 s (0.676458 s).
Punctuation targets and measured silence lengths are not identical.

### V5 cut sheet

Times are seconds in the final video, quantized to 25 fps. The archive is
`original/congo.mp4` from the V1 package. These are hard cuts; footage continues
moving during speech pauses.

| Final timeline | Image/clip                                              | Source entry point   | Narration function                            |
| -------------- | ------------------------------------------------------- | -------------------- | --------------------------------------------- |
| 0.00–2.08      | `hook.png`, authentic post excerpt in an editorial card | Still image          | Opening question and pause                    |
| 2.08–8.12      | Congo archive                                           | 135.00 s             | “Mais…” through the European linguistic label |
| 8.12–11.72     | Congo archive                                           | 143.00 s             | African roots and meaning                     |
| 11.72–16.84    | Bleek title page                                        | PDF page 7           | 1862 and linguistic classification            |
| 16.84–20.72    | Congo archive                                           | 160.00 s             | Colonial racial classifications               |
| 20.72–25.44    | Congo archive                                           | 370.00 s             | “Pour classer…”                               |
| 25.44–28.44    | Congo archive                                           | 390.00 s             | “Le mot d’un linguiste…” and pause            |
| 28.44–30.96    | Five names on `#141414`                                 | Generated text cards | “Chaque peuple…”                              |
| 30.96–34.76    | Animated parchment ending                               | `outro.mp4`          | Spoken CTA and final hold                     |

Name cards divide 2.52 s into five equal intervals: baKongo, baGanda, baLuba,
baSotho, baTswana. ASS placement is `(540, 890)`, center aligned, white Metropolis
Extra Bold, 100 px. Voice captions continue beneath them in gold Anton. The source
annotation is enabled from 8.12 to 16.84 s only.

The PDF image is scaled to fit 1080 × 1920, padded with `#141414`, then given the
zoom `min(zoom + 0.0005, 1.08)` per frame. Archive clips use normal speed and no
source audio. Source entry points are footage offsets, not claims that the footage
depicts the exact people mentioned by the voice.

Direct footage source: [Internet Archive MP4](https://archive.org/download/belgian-congo-and-the-east-african-campaign-1916/Belgian%20Congo%20and%20the%20East%20African%20campaign%20%281916%29.mp4).
Recovered file: 36,292,314 bytes, 587.88 s, MD5
`1964fcb7afa1869adfa251929224d595`. The PDF, official logo, LinkedIn post and recovery
packages are linked in the source sections above. There are no generated people
images in this reference; documentary footage, the document scan and the genuine
post crop provide the imagery.

### Exact artwork geometry

The opening is 1080 × 1920 on `#141414`: “FIER D’ÊTRE” in white Anton 136 px at
y=325, “BANTU ?” in gold Anton 172 px at y=485. The white rounded card spans
x=110–970, y=760–1118, radius 24. Its label is blue `#0A66C2` TikTok Sans 30 px.
The real two-line crop is 748 px wide at x=155, y=855; the typed author credit is
TikTok Sans 31 px around x=151, y=1060. Reuse `post-excerpt.png`; do not generate a
fake screenshot containing the quotation.

The source-note plate spans x=120–920, y=210–418, radius 18, parchment opacity
240/255. Its four lines use TikTok Sans at 32, 32, 30 and 28 px respectively:
“* Origine africaine du mot”, “et classification linguistique :”,
“South African History Online”, “« Defining the term Bantu »”. This plate is
separate from the spoken caption transcript.

### Exact logo and text animation

Times are relative to the ending's start at 30.96 s. Every entry uses cubic
ease-out: `1 - (1 - clamp(progress, 0, 1))^3`.

| Layer                       |  Start | Duration | Font / size / weight                    | Final top y |
| --------------------------- | -----: | -------: | --------------------------------------- | ----------: |
| Africa logo                 | 0.00 s |   0.80 s | Transparent image, fit within 290 × 290 |         350 |
| EthniAfrica                 | 0.30 s |   0.55 s | Fraunces / 112 px / 900                 |         690 |
| Atlas des Peuples d’Afrique | 0.60 s |   0.50 s | Fraunces / 42 px / 700                  |         815 |
| Le vrai nom                 | 0.85 s |   0.45 s | Nunito Sans / 62 px / 800               |         930 |
| de chaque peuple.           | 0.85 s |   0.45 s | Nunito Sans / 62 px / 800               |        1007 |
| ethniafrica.com             | 1.05 s |   0.45 s | Nunito Sans / 39 px / 700               |        1080 |

Crop the logo to its alpha bounding box. Scale from 78% to 100%, rotate from 9°
to 0°, and reduce the vertical offset from +35 px to 0 px. Opacity reaches 100%
after 0.25 s. Keep it horizontally centered as its rotated bounding box changes.
Each text layer moves from +28 px to its final position while opacity goes from
0 to 100%. Center using font bounding boxes, not string length. The tagline's
horizontal gradient interpolates between `#DA622F` and `#F2BA36` across x=150–930.
Other variable-font axes stay at their defaults; weight is explicitly set. The
stable composition holds from 32.46 to 34.76 s. There is no looping movement or
exit animation.

### Exact replay and a new production are different operations

For faithful replay, reuse final audio and clocks. Do not call TTS, insert pauses
again or retranscribe unchanged audio. Recover V5 to the expected sandbox directory
`/home/user/bantu-v5`, recover V1 beneath `original/`, and copy V5's `gold_burn.py`
into `v2/gold_burn.py`, which is where `produce.py` expects it. Keep the archived
final manifest, captions, word clocks, scene starts, report and narration. Fetch
bundled fonts, then run `produce.py`. Audit its ZIP member list first: the omitted
`refine.py` may be named by the archived packaging code; exclude the missing helper
from packaging or restore it from the refinement recipe below. Existing final
clocks already include its correction.

For caption-only reproduction, use the archived clean master directly:

```bash
bash "${HF_WORKFLOWS}/subtitles/scripts/fetch_fonts.sh"
python3 gold_burn.py \
  --in master-v5.mp4 --srt caps.srt --out replay.mp4 \
  --style bold --font-key anton --fontsize-frac 0.052 \
  --bottom-frac 0.24 --maxw-frac 0.74 --stroke-frac 0.06 \
  --min-dur 0.3 --gap 0 --tail 0.18 --bridge 0.3
```

The wrapper changes the bundled bold text's white RGBA fill to `(255, 211, 61, 255)`,
validates alpha bounds and cleans its temporary directory. It retains bundled
caption geometry. Intermediate segments use libx264 ultrafast / CRF 18; clean
assembly uses libx264 fast / CRF 20, AAC 192 kbit/s, `apad`, explicit duration and
`+faststart`. The bundled caption renderer controls the final video encode.
Compressed bytes can differ across FFmpeg/workflow versions; download the approved
MP4 when byte-for-byte identity is required.

For a new script, retain the visual configuration but calculate new word and scene
timings. The reference total-duration calculation is:

```python
total_seconds = math.ceil(max(audio_duration + 2.0, outro_start + 3.5) * 25) / 25
```

Transcribe the final audio with the authored manifest, `--language fr`,
`--max-words 3` and `--max-chars 24`. Use Whisper small, then medium if alignment
requires it. Package all final clocks and helpers actually used, and verify ZIP
contents before deleting temporary work. That inspection revealed V5's missing
helper and is an explicit improvement for the future skill.

The final refinement extracted 2.25 s from V5 narration offset 28.45 s, transcribed
“Chaque peuple a pourtant son propre nom.” with Whisper medium, and added the
extraction offset to its seven local word clocks. Final absolute intervals are:
28.45–29.03, 29.03–29.27, 29.27–29.43, 29.43–29.75, 29.75–30.01, 30.01–30.31 and
30.31–30.49 s. It replaced those seven entries in the global alignment, regrouped
captions with the bundled `group_captions(max_words=3, max_chars=24)`, rewrote the
SRT with bundled `to_srt`, checked normalized full-script equality and recalculated
frame-rounded scene starts. Do not transplant these times to another performance.

### Recovery fingerprints

The V5 ZIP was downloaded into memory and inspected while writing this document.
These SHA-256 values identify its contents independently of filenames:

| File                      | SHA-256                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| V5 project ZIP            | `e391dd0ac83a755ac262939a90f54f5d6064fb2136b572a4ecc2325b630e4ae5` |
| `narration-v5.wav`        | `5b7d16692d952d698b2f832cd5b9b681d94e1a4b6ed332312ad67c341cf008c4` |
| `master-v5.mp4`           | `05939fd3d28c02087a965a3cf6211c3122deec9cd0d944d4c9ce3acc49d7acee` |
| `caps.srt`                | `c4ff82dc3e606daa8966f4318b8cb1e1310372f948a6afeab5a1d6af7f4ded8d` |
| `produce.py`              | `1cd8cd4624b5188683ebf107021ea57bab7bf265520476ff0d851b1d278b1bcb` |
| `gold_burn.py`            | `ff664b872a736190edcd5f966570a8ec6044085056e791378fc910060de04f8d` |
| `v2/ethniafrica-logo.png` | `b30e5d3f4db29efcbb6ea4f9b789c9df47dbb5df8fe8d5c5f42cf432975af44b` |
| `v2/Fraunces.ttf`         | `177ff6c0f14e5550a3c624247cd1189611d4eb65d000b14944c63d967958abbb` |
| `v2/NunitoSans.ttf`       | `f934d7142fb4784bf828da485b7dcbd90c0c80d514e9d49a5da0ed3a1ae2491d` |
| `fonts/Anton-Regular.ttf` | `a4ba3a92350ebb031da0cb47630ac49eb265082ca1bc0450442f4a83ab947cab` |
