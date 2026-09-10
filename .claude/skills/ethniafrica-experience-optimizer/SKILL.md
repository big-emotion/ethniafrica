---
name: ethniafrica-experience-optimizer
description: Turns the audience audit into navigation and experience fixes for EthniAfrica, mobile first. Consumes the dated report written by audience-audit and proposes prioritised changes to information architecture, entry and exit paths, next-step design, internal linking as navigation, empty states and mobile ergonomics — each one anchored to a measured number. Judges from the rendered page at 430px, never from the code alone. Use when the user asks "pourquoi ça rebondit", "améliorer la navigation", "le mobile ne va pas", "UX du site", "que faire de cette page", or invokes /ethniafrica-experience-optimizer.
metadata:
  author: Big Emotion
  version: "1.0.0"
  argument-hint: "[route or page URL] [--report=docs/audience/audit-YYYY-MM-DD.md]"
---

# EthniAfrica Experience Optimizer

Consumes the audience audit and answers one question: **why does the measured
behaviour differ from the intended behaviour, and what change closes the gap?**

It is a **consumer** in the three-skill pipeline. Its evidence comes from
`docs/audience/`, written by `audience-audit`.

```
audience-audit  →  docs/audience/audit-YYYY-MM-DD.md  →  this skill
```

## Step 1 — Load the evidence, or stop

Read the most recent file in `docs/audience/`.

- **No report** → do not proceed. Say so and run `audience-audit`
  first. A UX opinion with no measurement is a preference, and this skill exists
  precisely because preferences were already available for free.
- **Report older than 30 days** → say so, offer to refresh, and proceed only if
  the user accepts stale evidence.

Read the report's `## Handoffs → For /ethniafrica-experience-optimizer` section
first, then the page verdicts table. Every recommendation this skill emits must
cite a row from that table.

## Step 2 — Look at the actual page, at 430px

This surface cannot be judged from source. Serve it locally — recette sits
behind Vercel SSO and cannot be captured.

```bash
npm run dev     # then load the route at 430px width
```

Order is not negotiable and is inverted from how the code reads: **mobile
(430px) first, then tablet (720px), then desktop (800px container max-width)**.
The audit's device split is the reason — the audience is overwhelmingly mobile
while the reviewer's instinct is desktop.

Judge in this order:

1. What is above the fold, before any scroll.
2. What the visitor can _do_ next, without scrolling back up.
3. Whether the header, in its retracted state, still offers a way out.
4. Whether anything below the fold is reachable by someone who does not scroll.

## Step 3 — Diagnose against the four measured patterns

The audit names the pattern; this skill supplies the fix. They are not
interchangeable:

| Pattern in the report                                  | What it means here                                 | Where the fix lives                                                                                                                 |
| ------------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Dead end** — high bounce, high time, high scroll     | The page delivered. It then offered nowhere to go. | End-of-page next step: related fiches, the parent hub, the sibling entity. Not a banner — a link the reader wants.                  |
| **Bounce-through** — high bounce, low time, low scroll | The visitor arrived expecting something else.      | Fix the promise upstream (the link, the title, the first screen), not the page body.                                                |
| **Cannibalisation** — two URLs, one intent             | Directory and fiche compete.                       | Decide which one owns the intent; make the other route to it.                                                                       |
| **Unattributed channel**                               | Traffic arrives unlabelled.                        | UTM tagging on outbound links. This is instrumentation, not design — hand it back rather than redesigning around a measurement gap. |

The dead end is the pattern that pays. A page with high scroll depth and high
bounce has already earned the reader's attention and thrown it away; adding a
next step costs one component and converts a terminated session into a second
pageview.

## Step 4 — Prioritise

Rank by `reach × confidence ÷ effort`, where reach is the visitor count the
report measured for that URL and confidence is how directly the number supports
the diagnosis. Publish the ranking with its inputs visible — a priority whose
arithmetic is hidden is an opinion wearing a number.

At low traffic volumes, prefer changes that apply to a **template** over changes
that apply to one URL. A fix to the fiche layout reaches 1 700 pages; a fix to
one fiche reaches one, and the report cannot tell you which fiche will matter
next month.

## Step 5 — Deliver

One document per session, in the terminal or as a page if the user wants to
share it. Per recommendation:

- The measured evidence (URL, metric, value, from which report).
- The diagnosis, in one sentence.
- The change, concrete enough to implement.
- The breakpoint it targets, and what it must not break at the others.
- How the next audit will confirm or refute it — name the metric and the
  direction. A recommendation with no falsifier does not ship.

If the user wants the work scheduled, hand each recommendation to
`/ethniafrica-spec`, which drafts the Confluence entry and the Jira ticket to
this project's standard. Do not file thin tickets from here.

## Repository facts that change the diagnosis

Four measured behaviours that look like design problems and are not:

- **`loading.tsx` files under `[lang]` cause soft-404s**, and an axis loading
  state can land in a shell's slot. A route that reads as empty may be a
  streaming fallback, not a content gap — `curl` sees the fallback, a browser
  sees the page.
- **`mobile-text.css` centres `<label>` elements** unless a form declares
  `text-left`. Misaligned form labels on mobile are inherited, not authored.
- **Directories shadow the fiches beneath them** — the known cannibalisation
  shape in this codebase.
- **The pinned header retracts and closes its own menu** regardless of scroll
  direction. Navigation that "disappears" on mobile is usually this.

## Boundaries

- **Brand, colour, typography, spacing, tokens, whether a composition holds
  together → `/afrik-art-director`.** That skill owns the look and the charters;
  this one owns the path. When a recommendation needs a new token or changes an
  accent, stop and hand it over.
- Game mechanics and quiz items → `/afrik-game-designer`. This skill may say the
  Mercator game is a dead end; it may not redesign the game.
- What to publish next → `content-strategist`.
- Fiche content and sourcing → `/afrik-curator`.

This skill proposes. It does not implement, and it does not merge.
