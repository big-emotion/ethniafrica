# Typography Charter

What the type on EthniAfrica asserts, and what it forbids. This is the
counterpart of [`atlas-charter.md`](./atlas-charter.md) and
[`games-charter.md`](./games-charter.md) for a surface that had a specimen
(`src/stories/design-system/Type.mdx`) but no doctrine: nine sizes were shown,
and nothing said when to reach for `h2` rather than `h3`.

The scale itself lives in `src/styles/tokens/type.css`.
`src/styles/__tests__/typeScaleCharter.test.ts` fails the build if the file
drifts from the rules in §1 and §2, and `afh/no-raw-font-size` fails it if a
component reintroduces a size outside the scale.

## 1. Nine roles, no tenth

A role is a job, not a size. Two things that do the same job take the same
token even when a designer would have nudged one of them by a pixel; two
things that do different jobs never share a token because they happen to
render at the same size.

| Role      | Token                | Renders          | Family · weight        | HTML                       |
| --------- | -------------------- | ---------------- | ---------------------- | -------------------------- |
| `hero`    | `--afh-text-hero`    | 34 → 52 px       | display 600            | `h1`, once per page        |
| `h1`      | `--afh-text-h1`      | 27 → 40 px       | display 600            | `h1`                       |
| `h2`      | `--afh-text-h2`      | 22 → 30 px       | display 600            | `h2`                       |
| `h3`      | `--afh-text-h3`      | 19 → 23 px       | display 600            | `h3`                       |
| `lead`    | `--afh-text-lead`    | 19 → 22 px       | body 400               | `p`, first of a fiche      |
| `body`    | `--afh-text-body`    | 17 → 19 px       | body 400               | `p`, `li`, `td`            |
| `small`   | `--afh-text-small`   | 16 px            | body 400               | control labels, `button`   |
| `caption` | `--afh-text-caption` | 13 px            | body 400               | `figcaption`, source lines |
| `eyebrow` | `--afh-text-eyebrow` | 12 px · UP · 600 | body 600, 0.16em track | `p`/`span` above a heading |

Each role carries a paired `--afh-leading-*`. Setting a size without its
leading is how a 52 px hero ends up on 1.65 and reads as a stack of unrelated
lines.

**The eyebrow is a dress, not a size.** `--afh-text-eyebrow` is 12 px, but the
role is uppercase, semibold and tracked at 0.16em — `--afh-eyebrow-transform`,
`--afh-eyebrow-weight` and `--afh-eyebrow-tracking` carry those. A caller that
takes the size alone has written a caption, and should say `caption`.

### Retired: `micro` and `nano`

They rendered at 10 px and 9 px. Both are gone, and their callers moved up to
`caption` or `eyebrow`.

Two reasons, and the second is the binding one. The audit found no reference
site that sets running text below 11 px, and none that sets lowercase text
there at all. And axe's `color-contrast` rule holds anything under 18.66 px
bold / 24 px regular to 4.5:1 — at 9 px on a warm parchment ground, the muted
ink the mockups use clears 2.8:1. The small roles were an accessibility debt
dressed as a density choice.

## 2. Fluid where it is read, fixed where it is operated

The six editorial roles (`hero` → `body`) are one `clamp()` each, anchored at
**390 px** and **1200 px**. No `@media` step, and none may come back: the two
breakpoint steps the scale used to carry are exactly what the clamps replace,
and a leftover step is a second, competing scale.

The three utility roles (`small`, `caption`, `eyebrow`) are fixed lengths. A
button label that grows with the window drifts away from the button.

**Every clamp intercept is written in `rem`.** A `clamp()` whose preferred term
is in pixels ignores the reader's browser font-size setting outright — the `vw`
term cannot restore it — and fails WCAG 1.4.4. This is the one line of §2 the
charter test asserts character by character.

## 3. Semantic and visual are allowed to disagree — up to a point

A `<h2>` may be painted with `--afh-text-body`. The document outline is what a
screen reader walks; the size is what a sighted reader weighs. They answer
different questions, so they are allowed to diverge.

Four cases are legitimate, and they are the only four:

1. **The key figure.** `789 peuples` set at `hero` inside a `<p>` — it is a
   number, not a section.
2. **The autonym.** `<AutonymExonymHeading>` sets the autonym at the heading
   role and the exonym one role down inside the same heading element. The
   exonym is not a subheading; it is a gloss.
3. **The verbatim.** An oral-narrative pull quote set at `lead` inside a
   `<blockquote>`. It outweighs the body around it without claiming a rank in
   the outline.
4. **The standfirst.** The `lead` paragraph under a fiche title, which is
   `<p>`, never `<h2>`.

**The hard limit: never between two headings.** An `<h2>` painted at `h3` and
an `<h3>` painted at `h2` on the same page is not a divergence, it is a lie —
the reader sees a hierarchy the document does not have, and the two readings
contradict each other rather than complementing each other. Divergence is
permitted between a heading and a non-heading. Between two headings it is a
defect.

## 4. The card: three levels, and the title never competes

A card is a preview, not a page. It gets exactly three levels:

1. **The title** — `--afh-text-body`, set in `--afh-font-display`. Display
   family, body size: it reads as a title without ever outweighing the section
   heading that governs the grid it sits in. A card title at `h3` makes twelve
   cards shout over the one `h2` above them.
2. **The support** — `--afh-text-small`, body family. One or two lines.
3. **The metadata** — `--afh-text-caption`, or `--afh-text-eyebrow` when it is
   a category kicker above the title.

No fourth level. A card that needs one is a fiche.

## 5. Measure is set by the text, not by the shell

Prose is capped at `--afh-measure-prose` (65ch), independently of its
container. The country container is 800 px wide; at 19 px body that runs to
roughly 94 characters, half again the comfortable maximum. The 800 px is a
layout decision about the page; 65ch is a legibility decision about the
paragraph. Neither derives from the other.

This applies to running prose only. Tables, card grids and the atlas panel
fill their container.

## 6. How to reach a size

In descending order of preference:

1. **A Tailwind utility** — `text-afh-body`, `text-afh-caption`. The bridge is
   declared in `tailwind.config.ts` and every entry maps 1:1 onto a token.
2. **The token in CSS** — `font-size: var(--afh-text-body);`. For styled-jsx,
   `.css` files, and inline `style` objects.
3. **A surface-scoped token that aliases the scale** — `--country-text-*`,
   `--home-text-*`. Legitimate only as a named, greppable holding pen for a
   value not yet reconciled with the scale, with a ticket against it. Never as
   a permanent parallel scale.

Everything else is a defect the linter reports:

- `text-[14px]`, `xl:text-[10px]`, `text-[0.875rem]` — arbitrary Tailwind sizes.
- `font-size: 13px`, `font-size: clamp(30px, 5.6vw, 56px)` — raw CSS
  declarations. The sanctioned form is `font-size: var(--…)`; the rule keys off
  exactly that.

Two things the rule deliberately does **not** flag, because they are not
typography:

- `style={{ fontSize: 22 }}` in the satori OG-image routes, and `fontSize={11}`
  passed to Recharts, the atlas canvas and SVG label helpers. These are
  rendering parameters for a raster or a chart, and there are more than forty
  of them that must stay.
- `.css` files, which ESLint never parses. `country-tokens.css` and
  `people-tokens.css` are guarded by `src/styles/__tests__/colorTokens.test.ts`
  instead.

## 7. The ratchet

`afh/no-raw-font-size` is `error` across all of `src/`. It shipped alongside a
**debt register** in `eslint.config.mjs`: one line per file that still carried a
raw size, with its count — 31 files, 146 sizes. Each migration lot deleted its
lines and never added one. Deleting a line without fixing the file turned CI
red, so the register could not rot; adding a raw size to a file not on the list
failed immediately, so a directory awaiting its turn could not quietly
accumulate new debt.

**The register is now empty, and the ratchet is closed.** What remains in
`ignores` is the bench: `*.stories.*`, `*.test.*`, `__tests__/`, `*.mdx`.

Do not reopen it. A surface that needs a size the scale does not have takes
route 3 of §6 — a named, surface-scoped token with a ticket against it. The
worked example is `src/styles/home-tokens.css`: the home carried 25 hand-set
sizes, 20 of them half-steps (15.5, 14.5, 13.5, 12.5, 11.5, 10.5 px) that land
on no step of the scale. Rounding 12.5 to 12 or to 13 on the most visited page
in the product is a design decision no test here can settle, so the values were
named at their current pixel, byte for byte, and the reconciliation is a
separate ticket. The dette is now one table of twenty rows for a designer to
rule on, instead of a diff across eight components.
