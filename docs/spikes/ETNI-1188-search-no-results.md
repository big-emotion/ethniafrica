# Spike ETNI-1188: free search returns no results on recette (REQ-002)

Wave 0 · timebox 2h · closed 2026-08-25

## Scope of this investigation

This spike ran inside an unattended CI sandbox with no configured Supabase
credentials, no Vercel/Supabase dashboard access, and no reachable URL for the
`recette` deployment. The Supabase MCP server available to this agent requires
an interactive OAuth flow (browser authorization + callback), which is not
possible in an unattended run. As a result, **the two candidate causes named in
the ticket — unmigrated/mispointed recette database vs. broken search
transport — could not be settled by directly probing the live recette
environment or its Supabase project.**

What *is* fully reproducible without any live access is a code-level defect
that independently explains the reported symptom, on every environment
(recette, main, and local), for every query. That defect is documented below.
The two originally-named candidate causes remain open until an operator with
dashboard access completes the steps in "Still needed from a human operator".

## Root cause found: response-shape mismatch on `/fr/recherche`

`GET /api/v2/search` returns the Module #0 envelope with peoples and countries
as separate arrays (`src/api/v2/handlers/search.ts:23-32`,
`src/api/v2/utils/response.ts:54-74`):

```json
{ "data": { "peoples": [...], "countries": [...], "total": N }, "meta": {...}, "errors": [] }
```

This is confirmed by the route-level test, which asserts against the real
shape (`src/app/api/v2/__tests__/search.test.ts:68-69`):

```ts
expect(body.data.peoples).toBeDefined();
expect(body.data.countries).toBeDefined();
```

But the search page that renders `/fr/recherche` reads a `results` array that
the API never sends (`src/components/pages/RecherchePageContent.tsx:205` and
`:246`):

```ts
setResults(mapApiResults(data.data?.results ?? []));
```

`data.data.results` is always `undefined`, so `?? []` always wins and
`results` is always empty — **regardless of what the database actually
contains**. The page then renders its empty state
(`RecherchePageContent.tsx:613`, `Aucun résultat pour « {committedQuery} ».`),
which matches the exact wording reported in this ticket for `maroc`, `bété`
and `congo`.

This is a pure frontend/backend contract bug, not a data or environment issue:
it reproduces identically against any Supabase project, on `recette`
*and* `main` (`git show origin/main:src/components/pages/RecherchePageContent.tsx`
carries the same `data.data?.results` reads), because the query never actually
reaches a working results path — the API response is discarded before it is
rendered.

### Why the existing test suite didn't catch it

Two independently-passing test suites disagree about the response contract,
and nothing connects them:

- `src/app/api/v2/__tests__/search.test.ts` asserts the real shape
  (`data.peoples` / `data.countries`).
- `src/components/pages/__tests__/RecherchePageContent.test.tsx` mocks
  `fetch` with `{ data: { results: [...], total } }`
  (`RecherchePageContent.test.tsx:104-129`) — the shape the *component*
  expects, not the shape the *route* returns.

Both suites are green in isolation, which is why `npm run test` / CI never
surfaced the break.

### A second, related defect on the same surfaces

The header/nav search modal (`SearchModalV2.tsx`) and the legacy
`SearchPageContent.tsx` (currently unreachable — see below) both call
`search()` in `src/lib/afrikLoader.ts`, which sends the query as
`?query=<term>` (`afrikLoader.ts:402`). `/api/v2/search` only accepts `?q=`
(`src/app/api/v2/search/route.ts:118`) and returns `400 INVALID_PARAM` for a
request with no `q`. `afrikLoader.search()` swallows any non-OK response and
returns `[]` (`afrikLoader.ts:416-420`), so the nav search modal also always
reports zero results, independently of the `/fr/recherche` bug above.

`SearchPageContent.tsx` (`src/components/pages/SearchPageContent.tsx`) shares
this `afrikLoader.search()` defect but is mounted only via the
`[lang]/[section]` catch-all route (`SectionPageClient.tsx:86-88`). Next.js
resolves the more specific literal route `[lang]/recherche/page.tsx` first, so
`SearchPageContent` is dead code for `/fr/recherche` and `/fr/search` — it is
not the page users hit, and not the source of the reported symptom, but it
carries the same underlying defect class.

## Supabase project id inventory (Given/When/Then #2)

**Not obtained.** This sandbox has no `NEXT_PUBLIC_SUPABASE_URL` (or any
Supabase env var) set, no `.env.local`, and no Vercel API access, so the
project id backing `recette`, `main`/production, or any preview deployment
could not be read. `AFRIK_STAGING_SUPABASE_URL` (referenced by the staging
sync guard, `docs/runbooks/afrik-staging-data-sync.md`) suggests a distinct
staging project exists, but its value is not present in this repository or
sandbox either.

### Still needed from a human operator

1. Read `NEXT_PUBLIC_SUPABASE_URL` from the Vercel project settings for each
   of: `recette` deployment, `main`/production deployment, and any other
   preview environment in scope.
2. Confirm each URL resolves to a distinct or shared Supabase project id, and
   record it here or in the corrective ticket.
3. With that access, directly query `afrik_countries` / `afrik_peoples` on the
   recette-linked project for `MAR`, `COD`, `COG` to settle whether the
   working-copy's "database reachable from here has the rows" evidence in the
   ticket actually matches what recette points at (the original candidate
   cause this spike was timeboxed to separate). The code-level defect above is
   sufficient on its own to explain the symptom, but does not rule out an
   additional data/config gap on recette.

## "Bété" coverage gap (recorded, not fixed — per ticket note)

Confirmed independently of the above: no fiche matching `bét*` exists in
`dataset/source/afrik/peuples/**`. This is a data coverage gap, not a search
defect, and is out of scope for the corrective ticket opened below.

## Corrective ticket

Opened as a Jira sub-task of ETNI-1188 (this repo's ferry MCP tooling only
exposes sub-task creation, not top-level issue creation, to this agent) naming
the cause and fix:

- Fix `RecherchePageContent.tsx` (`:205`, `:246`) to read
  `data.data.peoples` / `data.data.countries` (merging into the flat list the
  component already renders) instead of the non-existent `data.data.results`.
- Fix `afrikLoader.ts:402` to send `q` instead of `query`, since
  `SearchModalV2.tsx` depends on it for the nav search modal.
- Correct `RecherchePageContent.test.tsx`'s fetch mocks (`emptyApiResponse`,
  `suggestApiResponse`, `searchApiResponse`) to the real `{ peoples, countries,
  total }` envelope so the test suite would have caught this.
- Add or extend a contract-level test asserting the `/api/v2/search` response
  shape and the frontend consumer shape stay in sync, so this class of
  regression fails CI next time.
