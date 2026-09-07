---
name: ethniafrica-content-strategist
description: Decides what EthniAfrica should publish next — site pages and social content — from measured audience evidence and the real publishing history. Consumes the dated report written by ethniafrica-audience-audit, reads the media library's publication state, collects per-post performance from YouTube, TikTok, Instagram, Meta Business Suite and LinkedIn via Chrome, and maintains a performance ledger so no topic is ever proposed twice without its predecessor's numbers. Use when the user asks "quoi publier", "quelle vidéo ensuite", "plan éditorial", "calendrier de contenu", "quel contenu marche", "stratégie de contenu", or invokes /ethniafrica-content-strategist.
metadata:
  author: Big Emotion
  version: "1.0.0"
  argument-hint: "[--site | --social | --both] [--collect-metrics]"
---

# EthniAfrica Content Strategist

Decides **what to publish next, and why that rather than something else** —
across the site and the four social channels. It is a **consumer** in the
three-skill pipeline; its evidence comes from `docs/audience/`, written by
`/ethniafrica-audience-audit`.

```
/ethniafrica-audience-audit  →  docs/audience/audit-YYYY-MM-DD.md  →  this skill
                                                                        ↕
                                              media library: publication state + performance ledger
```

## The rule that makes this skill worth invoking

**Never propose a topic without stating how the comparable published content
performed.** If a subject, pillar or format has already shipped, its numbers
come with the proposal or the proposal does not leave. If the numbers were never
collected, say that instead of implying success. A content plan that cannot
distinguish "this worked" from "we did this" is a wish list.

## Step 1 — Load the two states

### The audience report

Read the most recent file in `docs/audience/`. **No report, or one older than 30
days → stop and run `/ethniafrica-audience-audit` first.** Read its
`## Handoffs → For /ethniafrica-content-strategist` section, the page verdicts,
and the acquisition table.

### The media library

Default location: `/Users/jnk/Documents/BIG_EMOTION/06-Projets/EthniAfrica`
(local to the operator; ask if it has moved). It already holds the publishing
state — do not rebuild it, read it:

| File                                      | What it settles                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `03-Social-plan/PUBLISHING-STATUS.md`     | What is published, where, with post URLs; what is approved but blocked, and why |
| `03-Social-plan/publication-calendar.csv` | Planned slots, pillar rotation, which slots have no topic                       |
| `03-Social-plan/performance-ledger.csv`   | Per-post measured performance (this skill maintains it — see Step 2)            |
| `02-Videos/Approved/`                     | The cuts that exist and are viewing-approved                                    |
| `04-Production/Guides/`                   | How a video was actually made, including its source map                         |
| `inventory.json`                          | Provenance and checksum of every asset                                          |

Two blockers live in that state and must not be re-litigated silently: the Bantu
V5 cut opens on a LinkedIn excerpt whose author's permission was never recorded,
and the two Nigeria cuts are both approved with neither designated as the
publishing version.

## Step 2 — Collect performance, then write it down

Run with `--collect-metrics`, or whenever the ledger's newest row is more than a
week old. Load the Chrome tools in **one** `ToolSearch` call, then read each
back-office. All five sessions are authenticated in the operator's Chrome.

| Channel         | Where the numbers are                                |
| --------------- | ---------------------------------------------------- |
| YouTube Shorts  | YouTube Studio → Content → each Short's analytics    |
| TikTok          | TikTok Studio → Analytics → Content                  |
| Instagram Reels | the post's Insights, or Meta Business Suite          |
| Facebook        | Meta Business Suite (`business_id=3547853358709530`) |
| LinkedIn        | the company page's admin analytics                   |

Record per post, in `03-Social-plan/performance-ledger.csv`:

```csv
measured_at,published_at,topic,pillar,platform,post_url,views,hook_rate_3s,avg_view_duration_s,retention_pct,likes,comments,shares,saves,profile_visits,link_clicks,notes
```

Rules for the ledger:

- **Append, never overwrite.** A second measurement of the same post is a new
  row; the series is how you learn whether a Short keeps earning views.
- **An unavailable metric is empty, never zero.** Platforms differ in what they
  expose, and a fabricated zero poisons every later comparison.
- Record the post URL. `PUBLISHING-STATUS.md` records that Afrique, Lingala and
  the Nigeria Codex cut were posted to TikTok and Instagram manually on
  2026-09-05 **without their URLs being captured** — recover them while
  collecting, or the ledger cannot join to the platform.

### Which numbers actually decide

Views are the least useful figure on the list. Rank a short-form video by:

1. **Hook rate** — the share still watching at ~3 seconds. Everything downstream
   is conditional on this.
2. **Average view duration as a fraction of length** — a 35-second video watched
   for 20 seconds beat a 60-second one watched for 25.
3. **Saves and shares** over likes — they signal the content was worth keeping
   or worth someone else's reputation.
4. **Profile visits and link clicks** — the only metrics that connect to the
   site, and the reason any of this is being done.

The launch plan's 70 % retention-at-three-seconds figure is that plan's working
target, not a verified benchmark. Treat it as an internal goal and say so.

## Step 3 — Decide the site plan

The corpus is roughly 1 700 fiches and the audit measures a few dozen visited
URLs. The bottleneck is not production; it is that almost nothing published is
reachable by anyone who is not already looking for it.

Work in this order:

1. **Convert dead ends before creating pages.** A page the report marks as a
   dead end already has the audience a new page would have to earn. That
   conversion is `/ethniafrica-experience-optimizer`'s to design — hand it over
   rather than answering it with more content.
2. **Build the cluster around demand that already lands.** Where the report
   shows an entry page with real visitors, the pages that answer the _next_
   question belong around it, linked both ways. One pillar page, its satellites,
   reciprocal links.
3. **Exploit the corpus as a template, not as 1 700 decisions.** Fiche families
   are structurally identical, which is exactly the condition under which
   programmatic pages work: one well-designed template improves every fiche of
   that type at once. Propose template changes with a per-type reach figure.
4. **Only then propose new subjects**, and only where the report shows the
   intent arriving and the corpus failing to answer it.

Anything that adds or changes a claim on a fiche is handed to `/afrik-curator`,
which writes it with tiered sources. This skill decides the subject; it does not
author sourced content.

## Step 4 — Decide the social plan

The four rotating pillars are fixed by the launch plan and are good: **Le vrai
nom · Ce que ce nom veut dire · La carte cachée · Mythe déconstruit.** Fill
slots by rotation; do not invent a fifth pillar without saying what it replaces.

Per proposed piece, state:

- The pillar, and the calendar slot it fills.
- The single claim the video makes, and where in the corpus it is sourced. A
  video whose claim is not in a fiche is a research request first — hand it to
  `/afrik-curator` before scripting.
- The hook, written out. The first three seconds are the whole decision.
- The channels, and what changes between them. The existing captions show the
  established register: TikTok short and interrogative, Instagram longer with
  the sourced detail, both hashtagged.
- The comparable that justifies it, with numbers from the ledger.

### Channel weighting follows the measurement, not the plan

The 2026-09-07 audit found LinkedIn carrying **45 % of all site traffic** while
the launch plan schedules LinkedIn for Phase 3, and found TikTok, Instagram and
YouTube contributing **no attributable traffic at all** despite three Shorts
published two days earlier. Before concluding the video channels fail, check
whether outbound links carry UTM parameters — untagged social referrers land in
Direct, and the whole video-to-site link is then simply unmeasured. Fix the
instrumentation before re-planning the channel mix; recommend the tagging as a
prerequisite, not as an afterthought.

## Step 5 — Deliver, and never publish unasked

Output one plan per session:

- **Site**: ranked, each item with its measured justification and its owner skill.
- **Social**: the next slots filled, each with pillar, claim, source, hook,
  channels and comparable.
- **Instrumentation**: anything blocking measurement, first, because it makes
  every later number honest.
- **Ledger delta**: what was collected this session and what could not be.

**Publishing, posting, scheduling and sending are never done from this skill
without the user's explicit approval for that specific post.** Draft the copy,
show it, and stop. The library's own record is clear that automated video upload
to TikTok and Instagram does not work in this environment — the file registers
and the composer never advances — so those two remain manual regardless.

## Editorial constraints that bind published copy

- **Source tiers**: every claim carries its source and its tier
  (`official` / `referenced` / `unverified`). Nothing is excluded for being
  weak; everything is labelled. Wikipedia is not a source — cite what it led to.
- **Reader-facing register**: never let the workshop's vocabulary reach the
  reader. No file paths, no `PPL_`/`FLG_`/`PAT_` identifiers, no _file
  d'attente_, _la passe_, _protocole de recherche_. This binds social copy as
  much as fiche text.
- **Colonial terminology**: keep the colonial-era name, explain why it is
  problematic, and always surface the autonym. Half the pillar rotation is built
  on exactly this move.
- All documentation and commit messages in **English**; reader-facing and social
  copy in **French**, which is the site's only language.

## Boundaries

- Navigation, IA, mobile ergonomics, converting a dead end → `/ethniafrica-experience-optimizer`.
- Brand, visual composition, typography, tokens → `/afrik-art-director`.
- Game mechanics and quiz items → `/afrik-game-designer`.
- Writing or sourcing fiche claims → `/afrik-curator`.
- Filing the work as tickets → `/ethniafrica-spec`.

This skill chooses subjects and channels. It does not write fiches, design
pages, or post.
