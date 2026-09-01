# Capturing the surface

How to actually look at this site. Every trap below produced a wrong conclusion
the first time it was hit, which is why they are written down rather than
rediscovered.

## Where to point the browser

**Not at recette.** `https://recette.africatlas.com` sits behind Vercel SSO
deployment protection: `curl` and headless Playwright are redirected to
`vercel.com/sso-api` and never reach the app. Only a browser carrying the user's
Vercel session gets in.

So serve it locally, against the recette database:

```sh
cp .env.local <worktree>/.env.local          # recette Supabase credentials
export PATH=$HOME/.nvm/versions/node/v22.14.0/bin:$PATH   # Node 22, not 20
npm run dev -- --port 3111
```

In a worktree, `node_modules` must be real — `vitest` walks up the tree but
`next dev` does not (turbopack.root). Clone it with `cp -Rc` (APFS clone, near
instant) rather than reinstalling.

## The five traps

### 1. The consent banner covers the lower half of every capture

`ethni-consent` is a **localStorage key**, not a cookie —
`CONSENT_STORAGE_KEY` in `src/lib/consent.ts`. This page said "a plain cookie"
until 2026-08-30, and `addCookies` is silent about landing nowhere: the capture
succeeds, the banner is in the shot, and the finding you were chasing is under
it.

**Seed it, do not click it** — clicking depends on the banner having mounted,
which on a cold dev route it often has not, and a failed click is just as
silent:

```js
await context.addInitScript(() => {
  window.localStorage.setItem(
    "ethni-consent",
    JSON.stringify({
      hasConsented: true,
      preferences: { essential: true, analytics: true, functional: true },
      consentDate: new Date().toISOString(),
    })
  );
});
```

`addInitScript`, not `page.evaluate` after `goto`: the banner decides on first
paint, so a value written after navigation arrives too late for the very shot
you are taking.

### 2. A globe needs 20 seconds, not 7

Headless Chromium does have WebGL — SwiftShader via ANGLE, no flags strictly
required, though these make it deterministic:

```
--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist
```

But the atlas paints a **flat-map fallback first** and swaps to the three.js
globe when it is ready. At 7 s past `networkidle` you photograph the fallback,
which at fiche zoom reads as a broken two-tone blob, and conclude the fly-to
failed. It has not. Wait 20 s on any route with a globe, and say in the report
which wait a judgement was made at.

### 3. `fullPage` fails on globe pages

Playwright stretches the viewport to the document height for a full-page shot.
On a page with a WebGL canvas that drops the context and the CDP call fails with
`Protocol error (Page.captureScreenshot)`. On very long pages it also overflows
the capture buffer at `deviceScaleFactor: 2`.

Two mitigations, both needed:

- pass `scale: "css"` so the shot is not multiplied by the device pixel ratio;
- for anything you actually intend to _read_, capture **screen-height slices**
  instead, scrolling by `0.92 × viewport height` so nothing falls in a seam.

A full-page shot is for the gestalt — is this page a document or a queue. A
slice is for the judgement.

### 4. `curl` sees the streaming fallback

Routes with a `loading.tsx` return the shell, not the content, so scraping
hrefs with `curl | grep` yields nothing. Read the live DOM instead. Fiche URLs
carry the corpus identifier verbatim — `/fr/atlas/peuples/PPL_KUNG`,
`/fr/atlas/pays/ZAF`, `/fr/atlas/familles/FLG_ATLANTIQUE`.

### 5. A worktree-isolated session refuses compound shell

No `&&`, no heredoc, no pipelines the sandbox cannot verify. Write the script to
`$CLAUDE_JOB_DIR/tmp` and run it as a single `bash <path>`. A script placed
outside the project also cannot resolve `playwright` by package name — import it
by absolute path:

```js
import pw from "<worktree>/node_modules/playwright/index.js";
const { chromium } = pw;
```

## Measuring rather than eyeballing

Three probes catch what a screenshot cannot, and each has already overturned an
eyeball judgement:

**Computed colour.** Read `getComputedStyle(h1).color` per page. This is how the
two-ink problem surfaced: the home paints `#2c2018` (`--afh-text`), every fiche
and facet paints `rgb(48,37,29)` — which is `hsl(25 25% 15%)`, shadcn's
`--foreground`. It is also how a hub `h1` was found to be
`rgba(0, 0, 0, 0)`, painted only by `background-clip: text`.

**Rhythm.** Walk the direct children of `main`, take each one's
`getBoundingClientRect()`, and list the gaps between consecutive bands. A page
with one cadence shows two or three distinct values; a page with none shows
eight.

**Accent scope.** Count the distinct `.afh-accent-*` wrappers mounted on a page.
The doctrine says one; measuring says three or four on every route sampled.

## Route inventory

The public surface, for a full sweep:

```
/fr
/fr/atlas/peuples               /fr/dossiers/anecdotes       /fr/jeux/mercator
/fr/atlas/pays                  /fr/dossiers/doctrine        /fr/jeux/quiz
/fr/atlas/familles              /fr/dossiers/migrations
/fr/atlas/peuples/PPL_KUNG      /fr/dossiers/appellations
/fr/atlas/pays/ZAF              /fr/dossiers/regards/colonisation-et-resistances
/fr/atlas/familles/FLG_ATLANTIQUE
/fr/atlas/peuples/PPL_KUNG/liens
/fr/atlas/recherche?q=yoruba
/fr/comparer   /fr/about   /fr/contribute   /fr/plan-du-site   /fr/signalements
/fr/mentions-legales   /fr/accessibilite   /fr/confidentialite
/fr/compte/connexion   /fr/compte/inscription   /fr/report-error
/docs/api/v2
/fr/atlas/peuples/ceci-nexiste-pas        ← the 404, which has no shell
```

**There is no `/fr/atlas`, `/fr/dossiers` or `/fr/jeux`.** ETNI-1555
removed the three axis landing pages: an axis is a heading in the masthead that
opens a panel of direct module links, never a page of its own, and
`navigationCharter.test.tsx` holds that shape. Pointing the harness at one of
them photographs the 404 and reads as a broken sweep. The axis segments survive
only as the prefix of their children — `/fr/atlas/*`, `/fr/dossiers/*`,
`/fr/jeux/*`.

Document heights at 430 px, as a sense of scale — a page an order of magnitude
longer than its siblings is a finding in itself:

| Route                                                      | px     |
| ---------------------------------------------------------- | ------ |
| `/fr/dossiers/regards/colonisation-et-resistances`         | 29 679 |
| `/fr/atlas/peuples/PPL_KUNG`                               | 15 195 |
| `/fr`                                                      | 8 381  |
| `/fr/atlas/pays/ZAF` · `/fr/atlas/familles/FLG_ATLANTIQUE` | ~7 300 |
| `/fr/comparer`                                             | 1 106  |
