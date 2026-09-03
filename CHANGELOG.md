# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file starts at `2.0.0`. History before that release lives in `git log` only —
the `1.x` tags predate the changelog and were never accompanied by release notes.

## [Unreleased]

## [4.1.1] - 2026-09-03

The accessibility and routing defects the newly armed end-to-end suite found, and
the release mechanics that let a deploy measure production's schema instead of
trusting a hand-kept ledger. No change to the corpus.

### Fixed

- **A canonical deep link answers `308` instead of redirecting from the client.**
  `/fr/atlas/pays?country=COM` answered `200` and then redirected in the browser:
  only the page component handled the current address, behind a `loading.tsx`, so
  the shell streamed a `200` before `permanentRedirect` ran. The reader still
  landed on the fiche, but a crawler spent its visit on the directory and the
  rendered document carried a nonce the first response never authorised. Answered
  in the middleware now (#823).
- **The fiche globe marks the country it flew to.** Since the list picker replaced
  the pinned markers, choosing a country moved the camera and left nothing on the
  stage — the panel named Tanzanie while the globe pointed at nothing, which is the
  opposite of what the atlas charter §5 asks (#823).
- **A `<Link>` no longer renders inside a `<button>`.** Every migration row is a
  button and `ClassificationBadge` always rendered a link: nested interactive
  controls, serious impact in axe (#823).
- **113 interactive elements below the 44px floor** are resized — the globe toolbar
  pills, the zoom pair, the footprint picker, the chapter rail's « Signaler », and
  the footer, breadcrumb, source list, ISO-code column and family link (WCAG 2.5.8)
  (#823).
- **Two rows reflow at 200% text zoom.** The footer's columns and social marks are
  sized in rem, so an 800px viewport still matched `md` and the row ran 253px past
  the document edge; the migrations event rows spent the same excess on overflow at
  430px (#823).

### Changed

- **Production's schema is measured and applied by the deploy itself, no longer by
  hand.** `check:migration-state` takes `--target=production` and reads production's
  own ledger through `applied_migrations()` (migration `042`) instead of a hand-kept
  runbook. `deploy-production.yml` runs it as a `migrate` job the deploy `needs:`: it
  measures, refuses a `db push` plan wider than that measurement, applies, and
  measures again — so a Release published against a behind schema fails before
  anything reaches the VPS. Credentials resolve through a module that refuses to fall
  back from one environment to the other, because reporting recette's ledger under
  production's name is the failure the gate exists to prevent (#826).
- Both corpus syncs upload the loader's per-fiche error report as an artifact when
  they fail. The loader logs only a path, and a path on a runner is unreadable — that
  is how an apply-phase failure stayed undiagnosed behind a clean preview (#826).
- `CLAUDE.md` records that production migrations stopped being manual, and separates
  the two credentials the schema work needs: the PostgREST endpoint reads the ledger,
  only DDL needs the direct Postgres connection (#828).
- **The end-to-end suite now describes the page a reader actually gets.** Consent is
  seeded at config level, so the banner is no longer a `role="dialog"` on the first
  paint of every spec, padding the tap-target sweep with its own controls and
  intercepting pointer events aimed at the page underneath; webkit is installed, so
  the `tablet-720` project stops failing on a browser nobody downloaded. The
  tap-target sweep also stops counting sentences: WCAG 2.5.8's inline exception now
  requires the control to be inline-level _and_ its containing block to hold text the
  control does not, which is why the footer, breadcrumb and source list were fixed at
  source rather than excused (#823).
- **Every worktree is provisioned, and branches off `recette`.** A fresh
  `git worktree add` carries no `node_modules`, no `.env.local` and no
  `core.hooksPath`, and none of the three fails loudly: `vitest`, `tsc` and `eslint`
  resolve upward into the main checkout and pass, including against a dependency the
  worktree never installed, which is how a local green ships a CI red.
  `scripts/setup-worktree.sh` clones `node_modules` with `cp -Rc` — a clonefile on
  APFS — copies the env files and restores husky, wired through a `PostToolUse` hook,
  `.worktreeinclude` and `npm run worktree:setup` so no creation path is missed. It
  also warns when the clone still resolves `origin/HEAD` to `main`, which is what had
  every agent worktree starting behind the integration branch (#830).
- **The pre-merge path stops waiting on audits that gate nothing.** Lighthouse and
  Playwright are in neither branch's protection, yet over the 300 workflow runs of
  2026-09-03 they concluded 32/32 and 27/33 red while adding a p90 of 20.2 min to a
  blocking path of 13.6. Both move to a nightly run against `recette`, the promotion
  into `main`, and `workflow_dispatch`. Nothing that gates a merge is removed or
  weakened. The path gets faster instead: `concurrency` with `cancel-in-progress` on
  the six workflows that lacked it — `recette-data-sync.yml` keeps it `false`, a
  partial corpus load must never be cancelled — the a11y gate sweeping its 367
  stories and 19 live routes four at a time, and the Next.js and Chromium caches
  `ci.yml` already restored (#831).

## [4.1.0] - 2026-09-03

172 commits since `4.0.0`. The corpus grew a whole dimension — names — and the
release also repairs four quality gates that had been reporting success without
measuring anything.

### Added

- **The name dimension.** Patronyme fiches are authored, researched and served:
  the `PAT_*` corpus reaches 780 fiches across every linguistic family, with a
  dedicated route, a public `/api/v2` payload, and the anthroponym queue closed
  at quota for all 54 countries (ETNI-1461, ETNI-1464, REQ-133).
- **The language dimension.** A language fiche per family, a facet service, the
  language axis on the atlas shell, and language as its own search-result kind
  (ETNI-1507, ETNI-1508, REQ-136).
- **One search surface.** Three competing search surfaces consolidate into a
  single canonical SERP with named lens chips, typo tolerance through `pg_trgm`,
  near-miss leads on a zero-result query, and person, name and language as
  first-class result kinds (ETNI-1796, ETNI-1415, REQ-124 → REQ-126, REQ-135).
- **« Nommer »** opens with _Qui a donné ce nom ?_, its founding dossier and a
  glossary; the anecdotes page carries 43 notices drawn from the corpus.
- Reporting without an account, with admin access on an allowlist.
- A contact page, media credits on the people fiche (REQ-128), the corpus
  bibliography as a searchable surface, and historical affiliation on the fiche
  (REQ-127).

### Changed

- **Every source title now names the resource it points at.** `sources.title` is
  globally UNIQUE and every loader upserts on it, so 54 country fiches sharing
  one _UNFPA – World Population Dashboard_ title with 54 different URLs
  collapsed onto a single row — a reader following Angola's citation reached
  another country's dashboard. The same held for 17 fiches sharing
  _Glottolog 5.3_.
- The home opens on what a reader can do and states the corpus census, rather
  than turning a headline reel.
- 37 sources still carrying the retired numeric Tier 1/2 scale move onto the
  three-standing vocabulary, and four validator checks that still asserted that
  scale were translated with them.

### Fixed

- **The AFRIK corpus loads again.** The recette sync had failed repeatedly with
  777 patronymes and 0 inserted while `validateAfrikData` reported no errors on
  the same corpus. `checkSourceIdentity` and `check:afrik-loader` now model what
  the loader enforces, so CI fails on this class instead of the sync discovering
  it.
- **Lighthouse measures again.** It died on a `networkidle0` wait a page
  streaming RSC payloads never satisfies, and `lhci` aborts collection on the
  first URL whose setup throws — so no route after the first was ever evaluated.
  It now checks 19 URLs.
- **The E2E suite can no longer report a success it has not earned.** It skipped
  every step when its Supabase secrets were absent and concluded success; it now
  runs against recette.
- **The Saviez-vous band draws its illustrations.** Half the bank is a drawn
  onomastic plate rather than a photograph and the home rendered nothing for
  those — 33 of 67 facts showed prose beside an empty half.
- The CSP no longer hard-codes production's Supabase host, which silently
  blocked every other deployment's database calls in the browser.

### Removed

- The superseded axis-graph home: 2 600 lines across eighteen modules that
  nothing had imported since the page became `HomeHero` + `DidYouKnow`, with
  twelve of the thirteen `--home-text-*` tokens that had lost their reader.

### Security

- Flag-report quotas and the Supabase request deadline move into configuration
  rather than living as literals a redeploy is needed to change.

## [4.0.0] - 2026-09-01

A major because the public API changed shape, and an infrastructure release
because production left Vercel. 97 commits since `3.0.0`.

### Changed

- **BREAKING — `/api/v2/*` response envelopes are standardised.** Corpus endpoints
  now return the Module #0 envelope: licence, attribution, pagination and typed
  errors, consistently. Every consumer parsing a v2 payload must be updated
  (ETNI-1377).
- **Production is self-hosted on an OVH VPS in Gravelines and deploys only when a
  GitHub Release is published.** Not a push, not a tag. Vercel's automatic
  deployments are off — per-push preview builds from parallel agent sessions
  exhausted the Hobby plan's quota until the rate limit landed on `main` itself.
  The recette preview is now built on demand from the Actions tab.
- The AFRIK corpus sync is chained to the new deploy rather than to a Vercel
  deployment event that will never be emitted again.
- Access-mode labels moved to a nominal register — _L'atlas_, _Les dossiers_,
  _Les jeux_ — and the URL slugs follow (ETNI-1614, ETNI-1615).
- The three axis landing pages were removed; the hubs are reached directly
  (ETNI-1555).

### Added

- Language as a first-class entity: strict model, corpus directory, read service,
  schema, serializer, handler, public detail route and OpenAPI documentation
  (ETNI-1589 → ETNI-1594).
- Names Atlas wave 2 — 10 new sourced dossiers, a name-granularity alliance table,
  declared name variants, clan names harvested from fiche prose, and one strict
  model per naming subtype (ETNI-1454 → ETNI-1460).
- `spellingAliases` on peoples and languages, surfaced through search (DEC-034).
- A search-first home page (ETNI-1404), an About page (ETNI-1407), prefix and
  accent-insensitive search matching (ETNI-1397), and country-fiche and
  language-family prose in the search index (DEC-028).
- Atomic revision publication for moderation (ETNI-70), contributor notification
  on flag resolution (ETNI-73), and self-service API key management (ETNI-81).
- A person entity with a source-or-nothing trigger (ETNI-1382).

### Fixed

- The corpus sync's AFRIK loader never satisfied `assertions.fiche_revision_id`.
- `next-mdx-remote` is bundled through react-server aliasing, which was making the
  doctrine detail route 500 in a built server (ETNI-1622).
- Language speaker relations were not populated (ETNI-1646).
- Stale eleven-game references corrected across source, tests and the charter
  (ETNI-1620).

### Security

- The one-time secret audit of the public git history that `ci.yml`'s `--no-git`
  comment had promised was finally run. Production credentials are clean; the
  recette service-role key and Postgres password are in the history and are being
  rotated. See `docs/runbooks/secret-exposure-audit-2026-09.md`.

## [3.0.0] - 2026-08-31

The release that turns the atlas from a set of directories into a place you can
read. 510 commits since `2.1.0`: three navigation axes replace the flat module
grid, every fiche is rebuilt on a globe and a parchment, the games hub is cut to
what it can actually defend, and the source-tier vocabulary is unified across
code, database, API and interface.

### Breaking

- **One source-tier vocabulary.** `primary` / `secondary` / `tertiary` are gone
  from the database, the API payloads and the interface. The scale is now
  `official` / `referenced` / `unverified`, with authority (`tier`) and
  provenance (`source_kind`) kept as separate axes — AI-generated text is
  `unverified` + `ai_generated`, not a tier of its own. The doctrine flipped
  with it: nothing is forbidden, everything is labelled. Excluding oral,
  community and amateur knowledge would itself have been a colonial filter, so a
  weak source is published with its provenance visible rather than suppressed.
  Migration `041` rewrites existing rows. Consumers reading `tier` must update.
- **The production corpus sync now targets the production database.** It
  previously fired on a successful production deploy and wrote into the recette
  project, then POSTed cache revalidation to a site it had never written to. The
  production project is now configuration with no default, and a sync that would
  land on recette is refused outright.

### Added

- **Three entry points instead of a module grid.** _Explorer_, _Comprendre_ and
  _Jouer_ replace the flat navigation; every module is nested under the hub that
  leads to it, and the breadcrumb is derived from the route and mounted once in
  the shell.
- **Faceted hubs** for countries, peoples and families — one shared map across
  the three facets, database-side filtering, numbered pagination with a page-size
  choice, and a loop closed between the map and the list.
- **The fiches, rebuilt.** One globe and one parchment per fiche: a night band
  carrying the globe, a server-rendered parchment dossier below it, a sticky
  reading rail with a chapter summary, a title band, and a facts panel posed on
  the globe rather than glued to its edge. The globe turns, flattens to Mercator,
  flies to a subject and opens all 54 countries without leaving the page.
- **A closed markup grammar for fiche prose**, wired into all three fiches — never
  heuristic, so a reconstructed form or an em-dash aside cannot corrupt a clean
  fiche.
- **A ranked search.** Relevance is computed in Postgres over weighted AFRIK
  tsvectors through a dedicated RPC: exact matches first, confidence modulating
  without ordering, and a relation usable as a search of its own.
- **An entity comparator** — orchestrator, header with an explicit no-verdict
  rule, sticky bar, entity picker, share bar, and a generated Open Graph card.
- **The names atlas** (`/fr/noms`): name records with their own strict model and
  parser, a surname connection rule, a section on the people fiche, and
  `GET /v2/names`.
- **Colonisation and resistance** (`/fr/regards/colonisation-et-resistances`):
  imposed names, border crossings, an event chronology, a gaze-event narrative,
  and the colonial event types behind them.
- **Migrations as an interactive atlas** — path layer, time scrubber and detail
  sheet, with failure, empty and filtered states told apart.
- **Relations**: an ego-network graph, derived linguistic proximity, a per-people
  links page and `/v2/relations`.
- **A quiz built on what the corpus records** — seven templates that ask what the
  atlas is actually about, sessions scoped to a country or a language family and
  ordered from familiar ground outwards, a round that names its subject before
  asking, a shareable score card, and a bank-integrity gate in CI.
- **A Mercator game** measured off the committed outlines, asking by estimate
  rather than by coin flip.
- **Reader reporting without an account** — a one-question form, a general
  report that names no entity, the control on the reading rail, and an HMAC
  proof-of-work anti-bot challenge replacing Turnstile.
- **Anecdotes** — 24 sourced facts under _Comprendre_, read one at a time, with a
  picture and a way to answer back.
- **A type scale and an actions charter**: one fluid scale with nine roles, four
  shapes for a single action, the shadcn primitives moved onto the scale, and the
  header, footer and legal template brought onto it.
- **`sitemap.xml`, a generated `robots.txt` and `/fr/plan-du-site`.**
- **API versioning headers and a deprecation policy** (ETNI-77).
- Every wait now spends itself on a _Saviez-vous_ fact rather than a spinner.

### Changed

- The home opens on the reader's question in one sentence, over a textured globe,
  with three corpus-reading slices below and seed chips drawn from the corpus.
- The _Jouer_ hub is cut from eleven games to two it can defend, each filed onto
  the corpus entity it questions.
- Editorial readiness is separated from data availability — a module is
  advertised only when its data is live.
- Language-family counts, family branches and country distribution are computed
  from stored rows instead of embedded legacy values.
- A headcount is dated by its own census rather than by the atlas's reference
  year.
- 492 fiches can now state their own name; every country fiche carries a summary
  chapeau.
- Rate limiting is aligned with the canonical `api_keys` tiers.
- An unapplied Supabase migration is now impossible to miss.

### Fixed

- Structurally-expected empty fields are marked as missing rather than silently
  omitted.
- Canonical publication and audit dates render in UTC instead of slipping to the
  previous day west of Greenwich.
- The atlas ships a single globe engine; the point cloud is deleted.
- Accessibility gates for axe, keyboard, zoom and colour-blindness now cover the
  atlas, the comparator and the quiz.

## [2.1.0] - 2026-08-04

### Added

- Public flag reporting and moderation surfaces, including API endpoints, a
  unified submission form, the public moderation queue and Turnstile anti-spam
  protection (ETNI-58, ETNI-61, ETNI-62, ETNI-63).
- Contributor profile management with atomic account erasure and anonymized
  attribution for retained moderation records (ETNI-57).
- Pinned fiche version banners, frozen-doctrine links and pinned doctrine
  resolution for stable historical citations (ETNI-50, ETNI-53).
- Accessible citation components and formatting contracts for transparent
  source attribution (ETNI-48).
- OpenAPI 3.1 documentation with complete endpoint schemas and reusable error
  responses.
- A compact branded footer, legal pages and the territorial mosaic treatment
  for the Big Emotion identity.
- An AFRIK source-tier audit gate for validating people profiles before Prismic
  migration (ETNI-403).

### Changed

- Production deployments now synchronize AFRIK data after a successful deploy
  using the supported Node.js 22 runtime.
- Country and people indexes now paginate their Supabase reads, while country
  sorting and search use canonical French common names (ETNI-395, ETNI-397).
- Language-family people lists are derived from canonical relations instead of
  legacy embedded values (ETNI-394).
- Supabase migration numbering was normalized to preserve a single ordered
  sequence.

### Fixed

- Restored and hardened direct navigation hydration across public routes.
- Canonical publication and audit dates now render in UTC instead of shifting
  to the previous day in negative-offset time zones.
- External diaspora relations are skipped during AFRIK synchronization, and
  staging synchronization now includes target guards and drift verification
  (ETNI-396).
- Citation previews meet contrast requirements and accept relative fiche URLs
  (ETNI-48).
- Responsive titles retain a safe gradient fallback, and the Big Emotion logo
  renders its complete letterforms.

## [2.0.0] - 2026-07-21

First release since `v1.2.0` (2025-11-14). It covers the full V1 → V2 rewrite:
the public API, the data model, and the frontend were all replaced.

### Removed

- **BREAKING — public REST API v1 is gone.** `src/app/api/v1/**` was deleted;
  `/api/v2/*` is the only supported surface. Clients on v1 must migrate.
- **BREAKING — V1 data model removed.** The `regions`, `countries` (v1),
  `ethnic_groups`, `ethnic_group_*`, `languages` (v1) and `sources` tables were
  dropped in favour of the AFRIK schema (`afrik_language_families`,
  `afrik_languages`, `afrik_peoples`, `afrik_countries`,
  `afrik_people_countries`). Migration `007_remove_v1_add_v2_contribution_types.sql`.
- **BREAKING — legacy admin authentication removed.** The
  `ADMIN_USERNAME`/`ADMIN_PASSWORD` cookie gate and `src/proxy.ts` are gone,
  replaced by Supabase Auth with role-based access control.
- **BREAKING — locales `en`, `es` and `pt` dropped.** The interface is
  French-only; non-`fr` locale segments now 308-redirect to `/fr`.
- All client and HTTP cache layers removed in favour of ISR plus `pg_notify`
  invalidation.

### Added

- **AFRIK data pipeline** — source of truth moved from CSV/TXT to strict-model
  JSON under `dataset/source/afrik/`, loaded into Supabase. The corpus now holds
  789 peoples fiches, 24 linguistic families and 54 country fiches.
- **API v2** — layered route/handler/service architecture for
  `language-families`, `peoples`, `countries` and `search`, with an OpenAPI spec,
  Swagger docs at `/docs/api`, API-key authentication (PBKDF2-SHA256 with
  IP binding), Upstash Redis rate limiting, and a spec-diff gate for breaking
  changes.
- **Module #0 transparency fabric** — `sources`, `assertions`,
  `confidence_scores`, `flags`, `revisions`, `editorial_doctrine`, `user_roles`
  and `audit_log` tables, all RLS-enabled.
- **Per-assertion revision history** — `fiche_revisions` with typed FKs,
  append-only triggers, pinned-version URLs and ISR semantics, a paginated
  `/v2/feed/revisions` endpoint, and the `RevisionDrawer` UI (ETNI-45, ETNI-46,
  ETNI-51, ETNI-207).
- **Public flag system** — full DDL, state machine and public slugs, surfaced at
  `/fr/signalements/[slug]` (ETNI-54).
- **Full-text search** — Postgres FTS `search_vector` columns with GIN indexes,
  a `/v2/search` endpoint with confidence boosting, and a dedicated
  `/fr/recherche` page with filters and auto-suggest (ETNI-38).
- **Contributor accounts** — registration, login, COPPA/GDPR-K age gate, email
  gate and profile upsert (ETNI-55, ETNI-56).
- **Redesigned country and people pages** — the "Carte vivante" variant, plus
  `PeopleDetailViewV2` and its eight section components, related-entity
  navigation, breadcrumbs and keyboard shortcuts (ETNI-34, ETNI-36, ETNI-42).
- **Privacy and observability** — cookie-less Plausible analytics and Sentry,
  both gated on a WCAG 2.1 AA consent banner; PII scrubbing; EU data residency
  enforced at runtime; French privacy policy at `/fr/confidentialite`.
- **Data-integrity tooling** — FR26–FR31 validation checks, FR32 drift
  detection, a source-URL health job feeding confidence recomputation
  (ETNI-177), and the `afrik-curator` editorial skill.
- **Quality gates** — Storybook 8.x design system, axe-core accessibility CI,
  Playwright e2e scaffolding, and Lighthouse mobile CI.

### Changed

- Security headers hardened: CSP now uses a per-request nonce instead of
  `unsafe-inline` for `script-src`, and `style-src unsafe-inline` was removed.
- Server-side `console.*` calls replaced by the structured logger across API
  routes, lib files and the AFRIK loader; enforced by an ESLint `no-console` rule.
- Branding extracted into a `brand.ts` module to make the product name
  configurable.
- Demographic data realigned to authoritative sources across 30 countries; ZAF
  split into four StatsSA Census 2022 buckets. FR28 tolerance documented in
  `docs/adr/0001-fr28-demographic-tolerance.md`.
- Wikipedia citations swept from AFRIK fiches per the Tier policy — Wikipedia is
  a discovery meta-source, never a citable one.

### Fixed

- 24 WCAG violations caught by the axe-core gate, plus AA contrast on
  `ClassificationBadge`, `SourceChainSheet`, `DoctrineLinkCard` and the
  contested/reconstructive badges.
- Corrected `languageFamilyId` mismatches and relocated the affected fiches:
  `PPL_HADZA` and `PPL_SANDAWE` → `FLG_KHOISAN`, `PPL_YUNGUR` → `FLG_NIGERCONGO`,
  `PPL_ATTIE` → `FLG_BENOUECONGO`, `PPL_DORZE` and `PPL_GAMO` → `FLG_OMOTIQUE`,
  `PPL_BIDYOGO` → `FLG_ATLANTIQUE`, `PPL_AMERICO_LIBERIANS` → `FLG_CREOLE`.
- Removed 114 duplicate `PPL_*` files (101 in `FLG_NIGERCONGO`, 13 merged macro
  fiches) and the cross-family duplicates for Gedeo, Koorete, Wolayta, Sheko and
  Lobi.
- Deleted the `PPL_KHOZA_FAUXEX` and `PPL_TOKELAU_FAUXEX` sentinel test fiches
  and the extinct-peoples fiches with zero population.
- `audit_log` now records `actor_id` from `auth.uid()`; RLS restricts
  `audit_log` to admins and `api_keys` to their owners.
- Duplicate migration prefixes (`008_`, `015_`) resolved.
- Endonym now takes primacy over exonym in the country page names row.

[Unreleased]: https://github.com/big-emotion/ethniafrica/compare/v4.1.1...HEAD
[4.1.1]: https://github.com/big-emotion/ethniafrica/compare/v4.1.0...v4.1.1
[4.1.0]: https://github.com/big-emotion/ethniafrica/compare/v4.0.0...v4.1.0
[4.0.0]: https://github.com/big-emotion/ethniafrica/compare/v3.0.0...v4.0.0
[3.0.0]: https://github.com/big-emotion/ethniafrica/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/big-emotion/ethniafrica/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/big-emotion/ethniafrica/compare/v1.2.0...v2.0.0
