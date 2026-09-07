---
name: ethniafrica-audience-audit
description: Measures what the EthniAfrica audience actually does, and writes the dated report the two downstream skills consume. Crosses Plausible analytics with the repository's own URL inventory to classify every page as Keep / Improve / Merge / Create, and to surface dead-end pages, cannibalised fiches, unattributed channels and the mobile-desktop gap. Read-only on source. Use when the user asks "what does the traffic say", "which pages work", "audit de trafic", "rapport d'audience", "content audit", or invokes /ethniafrica-audience-audit.
metadata:
  author: Big Emotion
  version: "1.0.0"
  argument-hint: "[--period=30d|custom] [--from=YYYY-MM-DD --to=YYYY-MM-DD]"
---

# EthniAfrica Audience Audit

Measures the audience, classifies the pages, writes one dated report. It is the
**producer** of a three-skill pipeline:

```
/ethniafrica-audience-audit          →  docs/audience/audit-YYYY-MM-DD.md
                                            ↓                    ↓
        /ethniafrica-experience-optimizer   ...   /ethniafrica-content-strategist
```

The handoff is a file, not a conversation. Both consumers are invoked in
sessions that never saw this one, so anything they need must survive in the
report.

This skill **never** modifies source, never publishes, never posts, never
schedules. It reads analytics, reads the repository, and writes exactly one
Markdown file.

## When to activate

- "Quelles pages marchent / ne marchent pas", "audit de contenu", "rapport de trafic".
- Before any editorial or UX planning session — the other two skills refuse to
  run on a report older than 30 days, so this one runs first.
- On a monthly cadence, to keep the series comparable.

## Preconditions

- Network access to `stats.ethniafrica.com`. **No authentication and no browser
  are required** — see Step 1.
- Run from the repository root. A worktree is not required — this skill writes
  one file — but a background session must still isolate itself before writing.

---

## Step 1 — Read Plausible over its JSON API

The instance's internal stats API answers **unauthenticated**. Use it: it is
scriptable, exact, and immune to the dashboard's rendering quirks.

```bash
BASE=https://stats.ethniafrica.com/api/stats/ethniafrica.com

curl -s "$BASE/top-stats?period=30d"
curl -s "$BASE/pages?period=30d&detailed=true&limit=200"
curl -s "$BASE/entry-pages?period=30d&detailed=true&limit=100"
curl -s "$BASE/exit-pages?period=30d&detailed=true&limit=100"
curl -s "$BASE/sources?period=30d&detailed=true"
curl -s "$BASE/screen-sizes?period=30d&detailed=true"
curl -s "$BASE/countries?period=30d"
```

**`detailed=true` is what makes this audit possible.** Without it the breakdown
endpoints return only `visitors` and `percentage`; with it every row carries
`bounce_rate`, `time_on_page`, `scroll_depth` and `pageviews` — and bounce
crossed with scroll depth is the entire diagnosis in Step 3. A run that forgets
the flag produces a page list with no verdict behind it.

`limit` defaults low. Pass it explicitly, or the long tail is silently
truncated and corpus coverage in Step 2 is overstated.

**`period=6mo` and `period=12mo` return zero** on this instance while `30d`
returns data. For any longer window use
`period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`.

If the API is ever closed off, the dashboard is the fallback — but its root
renders only the headline tiles as text. The breakdown tables exist solely on
the detail routes (`/pages`, `/sources`, `/screen-sizes`, …), so reading
`stats.ethniafrica.com/ethniafrica.com` alone returns headings and no data: a
silent empty read that looks like a quiet month.

### The measurement is a floor, not a total

Plausible loads only after the visitor accepts the consent banner. Every number
here counts **consented sessions**; real traffic is higher by an unknown factor.
Say so in the report, every time. Never present a Plausible figure as the
audience — present it as the measured, consented sample.

Two consequences the consumers depend on:

- **Absolute counts are weak evidence at this volume.** At tens of visitors,
  one person's afternoon moves a page several ranks. Rank and ratio survive;
  precision does not.
- **A zero is not proof of absence.** A channel with no attributed visit may be
  sending unconsented traffic, or traffic the referrer strips.

## Step 2 — Inventory the site's own URLs

The audit's whole value is the join between "what was visited" and "what
exists". Plausible only knows the first half.

```bash
# Published fiches, by entity — the denominator
find dataset/source/afrik -name '*.json' -type f | sed 's|dataset/source/afrik/||; s|/.*||' | sort | uniq -c | sort -rn
```

Routes come from `src/app/[lang]/` and the generated sitemap (`src/app/sitemap.ts`).
Prefer reading the sitemap route's source over running a full build — the build
is slow and this skill does not need `.next/`.

Record the count per entity type. A corpus of ~1 700 fiches against a few dozen
visited URLs is the central fact of this report, and the reason "which page
underperforms" is the wrong first question.

## Step 3 — Classify

Every visited URL gets exactly one verdict. This is a ROT-style content audit
(Redundant, Outdated, Trivial), adapted to an atlas whose pages are corpus
records rather than articles.

| Verdict     | Trigger                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Keep**    | Holds attention and leads somewhere — decent time on page, scroll depth above ~60 %, bounce below the site average                       |
| **Improve** | Attracts visits but ends the session — high bounce with non-trivial time on page is a page that _worked_ and then offered no next step   |
| **Merge**   | Competes with another URL for the same intent — the directory and the fiche both answering "les Yoruba" is cannibalisation, not coverage |
| **Create**  | Demand lands on a hub with no fiche behind it, or an entry page reveals an intent the corpus does not serve                              |

Four patterns to look for by name, because each has a different fix and they are
easily confused:

1. **Dead end** — high bounce _and_ high time on page _and_ high scroll depth.
   The visitor read the whole thing and left. This is not a quality problem; it
   is a missing next step. It is the single most valuable finding this audit
   produces, and it belongs to `/ethniafrica-experience-optimizer`.
2. **Bounce-through** — high bounce, low time, low scroll. Wrong expectation set
   upstream, usually by the link that brought them.
3. **Cannibalisation** — two URLs, one intent. The repository has a known shape
   for this: directories shadow the fiches beneath them.
4. **Channel with no attribution** — a channel being actively published to that
   appears nowhere in `sources`. Check for missing UTM parameters before
   concluding the channel does not work: without them Plausible files social
   referrers under Direct, and the content-to-traffic link is simply unmeasured.

## Step 4 — Compare against the previous report

Read the most recent existing file in `docs/audience/`. Report movement, not
just level: a page that fell out of the top ten matters more than one that sits
at rank nine in both. If there is no previous report, say so and record this run
as the baseline.

## Step 5 — Write the report

Write `docs/audience/audit-YYYY-MM-DD.md`, dated by the run date. Never
overwrite a previous report — the series is the point.

Structure:

```markdown
# Audience audit — YYYY-MM-DD

Period measured: … (consented sessions only; a floor, not the audience)

## Headline

| Metric | This period | Previous | Δ |

## Acquisition

Per source: visitors, bounce, duration. Name every published channel that
carries zero attributed traffic, and whether UTM tagging would explain it.

## Devices

Mobile vs desktop, each with its own bounce and duration. Flag any gap wider
than the site average — the site is mobile-first by charter, so a mobile
session that underperforms desktop is a contract violation, not a curiosity.

## Page verdicts

| URL | Visitors | Bounce | Time | Scroll | Verdict | Why |

## Corpus coverage

Fiches published vs fiches visited, per entity type.

## Findings

Numbered, each one sentence, each tied to a number above.

## Handoffs

### For /ethniafrica-experience-optimizer

### For /ethniafrica-content-strategist
```

The two handoff sections are mandatory and must be actionable on their own. A
finding no downstream skill can act on belongs in Findings, not in a handoff.

## Reference baseline — 2026-09-07 (30 days)

The first measured run, kept here as the comparison point. Consented sessions.

- **55 unique visitors**, 71 visits, 219 pageviews, 3.08 views/visit, 54 % bounce, 4m34 average visit.
- **Sources**: LinkedIn 25 (45 %), Direct 17, Google 11, Ecosia 1, chatgpt.com 1. **TikTok, Instagram and YouTube: absent**, despite three Shorts published 2026-09-05.
- **Devices**: mobile 50 (65 % bounce, 2m10), desktop 5 (18 % bounce, 12m12).
- **Top pages**: `/fr` (29), `/fr/jeux/mercator` (15, **92 % bounce**, 1m46, 76 % scroll), `/fr/atlas/pays` (6), `/fr/atlas/recherche` (6), `/fr/atlas/peuples` (4), then a long tail of fiches at 1–3 visitors each.
- **Corpus**: 796 patronymes, 776 peuples, 54 pays, 25 langues, 24 familles — against roughly 50 URLs visited at all.

The three findings that shaped the pipeline: the Mercator game is the site's
second page and a textbook dead end; LinkedIn carries nearly half the traffic
while the publishing plan schedules it last; and 91 % of visitors are on mobile,
where they bounce nearly four times as often as on desktop.

## Boundaries

- Visual, brand, typography and token questions → `/afrik-art-director`.
- Game design questions → `/afrik-game-designer`.
- Writing or sourcing fiche content → `/afrik-curator`.

This skill measures and classifies. It does not fix, and it does not decide what
to publish.
