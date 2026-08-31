# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file starts at `2.0.0`. History before that release lives in `git log` only —
the `1.x` tags predate the changelog and were never accompanied by release notes.

## [Unreleased]

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

[Unreleased]: https://github.com/big-emotion/ethniafrica/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/big-emotion/ethniafrica/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/big-emotion/ethniafrica/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/big-emotion/ethniafrica/compare/v1.2.0...v2.0.0
