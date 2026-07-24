# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file starts at `2.0.0`. History before that release lives in `git log` only —
the `1.x` tags predate the changelog and were never accompanied by release notes.

## [Unreleased]

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

[Unreleased]: https://github.com/big-emotion/ethniafrica/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/big-emotion/ethniafrica/compare/v1.2.0...v2.0.0
