---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/project-context.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-04-15.md
project_name: ethniafrica
user_name: Jnk
date: 2026-04-17
workflowType: epics-and-stories
status: complete
totalEpics: 7
totalStories: 77
frCoverage: 46/46
---

# ethniafrica - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for ethniafrica (working name: "Africa History"), decomposing the requirements from the PRD, UX Design Specification, and Architecture Decision Document into implementable stories.

The product is a brownfield continuation of EthniAfrica's V2 stack extended around a transversal Module #0 (Sources & Verification) verification fabric plus ten successor modules. MVP scope centers on Module #0 + Module #1 (People page) + Module #3 (Public API formalized), executed under hard dependency on an upstream data-audit-and-cleanup gate.

## Requirements Inventory

### Functional Requirements

**Content Discovery & Exploration**

- **FR1:** Users can browse people fiches organized by linguistic family, language, and country
- **FR2:** Users can search fiches by endonym, exonym, historical name, or alternative spelling
- **FR3:** Users can view a complete people fiche with structured sections (identity, origins, history, demographics, languages, culture, sources)
- **FR4:** Users can navigate from any fiche to its related entities (linguistic family, languages spoken, countries of presence) and back
- **FR5:** Users can access all public content without authentication, registration, or payment

**Source Transparency & Confidence**

- **FR6:** Visitors can see the confidence score of every fiche displayed above the fold, not buried in metadata
- **FR7:** Visitors can see the list of sources supporting factual assertions, classified by tier (primary, secondary, tertiary, ai-enriched)
- **FR8:** Visitors can follow each cited source to its external origin via a resolvable URL, with page and year where applicable
- **FR9:** Visitors can see the date of the most recent human audit of each fiche
- **FR10:** Visitors can see a visible disclaimer on unaudited fiches distinguishing them from audited content
- **FR11:** Visitors can see how a fiche's confidence score is computed (inputs and weighting)

**Public Contribution & Moderation**

- **FR12:** Registered contributors can submit a flag against a factual assertion, attaching a reason and optionally a counter-source
- **FR13:** Registered contributors can propose a textual correction to a fiche with supporting evidence
- **FR14:** Visitors can view the public moderation queue and the status of every open flag
- **FR15:** Moderators can triage flags (accept, reject, request more info, merge with a prior flag)
- **FR16:** Moderators can publish a revision that resolves one or more flags, producing an immutable audit-log entry
- **FR17:** Contributors can see the resolution outcome of flags they submitted and of flags they are watching

**Content Versioning & Citation**

- **FR18:** Every fiche has a stable, human-readable URL that always serves the current revision
- **FR19:** Every fiche has a pinned-version URL format that serves the exact content as of a given revision, permanently
- **FR20:** Visitors can read the full audit log of a fiche showing every revision with timestamp, moderator, and reason
- **FR21:** Visitors can generate a ready-to-paste citation block for a fiche that references a pinned version

**Editorial Governance & Doctrine**

- **FR22:** Visitors can read the public editorial doctrine (endonyms vs exonyms, contested classifications, sensitive-topic treatment) via a dedicated section
- **FR23:** Visitors can see each fiche's classification status (consensual, contested, colonial-legacy, reconstructive) with an inline explanation
- **FR24:** Contested fiches display a multi-perspective view presenting each documented position with its own sources
- **FR25:** Visitors can see which version of the editorial doctrine was in force when a given fiche revision was published

**Data Quality & Automation**

- **FR26:** The system validates that every FLG identifier matches its parent folder in the source tree
- **FR27:** The system validates that no two PPL identifiers designate the same people (duplicate detection)
- **FR28:** The system validates that demographic percentages sum to 100% per country
- **FR29:** The system validates that every ISO 639-3 and ISO 3166-1 alpha-3 code referenced is valid
- **FR30:** The system validates that every referenced source URL resolves
- **FR31:** A source URL that becomes unresolvable automatically lowers its fiche's confidence score and surfaces a public flag
- **FR32:** Continuous integration blocks merges that introduce data-integrity regressions across FR26–FR30

**Public API & Open Data Reuse**

- **FR33:** Third-party integrators can read any public fiche, source, and confidence metadata via a documented JSON API
- **FR34:** Third-party integrators can obtain a free API key with a known, published rate limit
- **FR35:** API responses embed attribution metadata (license, canonical URL, pinned version) sufficient for legally compliant citation
- **FR36:** The public API is documented via an authoritative OpenAPI 3.1 specification exposed at a stable URL
- **FR37:** Breaking API changes are communicated via a versioning policy with a minimum 6-month deprecation window
- **FR38:** Third-party integrators can discover updated fiches via a changelog or feed without polling every endpoint

**User Account & Contributor Lifecycle**

- **FR39:** Visitors can register a contributor account with email verification
- **FR40:** Contributors can submit flags and corrections under their account, with attribution visible in the public record
- **FR41:** Administrators can grant moderator status to verified contributors
- **FR42:** Contributors can manage their profile and delete their account, including flag attribution per GDPR

**Accessibility, Platform & Compliance**

- **FR43:** Users can access every user journey fully on mobile devices (320–430 px), tablets, and desktops without functional degradation
- **FR44:** Users relying on assistive technology can complete every user journey via keyboard and screen reader (WCAG 2.1 AA)
- **FR45:** The site displays a clear notice and age gate on account registration per COPPA / GDPR-K for users under 16
- **FR46:** The site exposes a cookie/tracking notice and consent surface compliant with GDPR

### NonFunctional Requirements

**Performance**

- **NFR1:** Public pages achieve Largest Contentful Paint ≤ 2.5 s at p75 on a 4G mobile profile (390 px viewport, 1.6 Mbps down / 750 kbps up); Cumulative Layout Shift ≤ 0.1; Interaction-to-Next-Paint ≤ 200 ms
- **NFR2:** Fiche detail pages render the above-the-fold content (identity + confidence score + primary endonym) within 1.5 s p75 on the same 4G profile
- **NFR3:** Public API endpoints respond within 300 ms p95 for cached reads and 800 ms p95 for uncached aggregate reads
- **NFR4:** Full-text search over the fiche corpus returns results within 500 ms p95 at MVP scale (~1 000 fiches)
- **NFR5:** Stable-reference endpoints (families, countries, languages) serve from edge cache with ≥ 95 % cache-hit ratio

**Security**

- **NFR6:** All data in transit is encrypted with TLS 1.2 or higher; HSTS is enforced
- **NFR7:** The Supabase service-role key is never exposed to browser-reachable code paths; a repo-wide static check blocks any `src/lib/supabase/admin.ts` import from client modules
- **NFR8:** User passwords are managed by Supabase Auth (bcrypt/argon2); no plaintext password ever reaches logs, Sentry, or structured events
- **NFR9:** State-changing API calls from the admin and moderator surfaces require an authenticated session and CSRF protection
- **NFR10:** API keys are stored as salted hashes; the raw key is shown exactly once at issuance and never again
- **NFR11:** Access to contributor PII (email, real identity behind a pseudonym) is logged to a server-side audit trail retained 90 days
- **NFR12:** Contributor account deletion removes PII within 30 days; contribution attribution is replaced by a deterministic pseudonym rather than hard-deleted, to preserve audit-log integrity — documented in the public privacy policy
- **NFR13:** Rate limits are enforced server-side and survive any client-side bypass attempt

**Scalability**

- **NFR14:** The system supports 100 000 monthly active visitors at MVP hardware tier (Supabase Pro + Vercel Pro) with no architectural change
- **NFR15:** The public API supports 1 000 concurrent connections under documented rate-limit bucketing
- **NFR16:** Scaling the fiche corpus to 10 000 (≈ 10× MVP) requires no schema change; pagination, indexes, and query patterns are designed for that upper bound
- **NFR17:** The edge-cache strategy absorbs traffic spikes of up to 20× baseline (e.g., a curriculum resource linking a specific fiche) without origin scaling

**Accessibility**

- **NFR18:** Every public surface conforms to WCAG 2.1 Level AA
- **NFR19:** Every user journey (browse, read, flag, moderate, cite) is fully operable by keyboard; no keyboard trap exists on any page
- **NFR20:** At least one full user journey per release is manually validated with VoiceOver (iOS + macOS) and NVDA (Windows)
- **NFR21:** Color contrast is ≥ 4.5 : 1 for body text and ≥ 3 : 1 for large text and non-text UI components; verified by axe-core in CI across MVP surfaces
- **NFR22:** All interactive elements expose a visible focus indicator; focus order matches DOM order
- **NFR23:** Motion respects `prefers-reduced-motion`; no auto-playing video; no animation carries essential meaning

**Reliability & Availability**

- **NFR24:** Public-site availability target is 99.5 % monthly (≈ 3.6 h downtime budget) reported on a public status page
- **NFR25:** Public-API read-endpoint availability target is 99.9 % monthly
- **NFR26:** Every data-mutating action (flag, moderation decision, revision publish, doctrine-version publish) is durably logged before the response returns success
- **NFR27:** Database backups run automatically at least daily with 30-day retention; recovery-time objective ≤ 4 h, recovery-point objective ≤ 24 h
- **NFR28:** Deployment rollback to the prior immutable build completes within 10 minutes

**Integration**

- **NFR29:** The authoritative OpenAPI 3.1 spec at `src/lib/api/openapiV2.ts` is the contract of record; CI fails if runtime responses drift from the spec
- **NFR30:** External source-URL health checks run at least weekly; every broken URL automatically produces a public flag and decrements the affected fiche's confidence score
- **NFR31:** JSON response envelopes are stable within a major API version; changes are additive only
- **NFR32:** Changelog and feed endpoints are idempotent and safe under replay

**Observability**

- **NFR33:** All server-side code (API routes, handlers, services, scripts) logs through `@/lib/api/logger`; no raw `console.*` in production paths
- **NFR34:** Runtime errors are captured in Sentry with 30-day retention and deduplication; personally identifiable fields are scrubbed before transport
- **NFR35:** Product-health metrics — confidence-score distribution, audit velocity, median flag-resolution time, API requests per key, CI-gate outcomes — are collected and queryable
- **NFR36:** Admin-surface events (moderation decisions, moderator grants, doctrine publishes) log actor, timestamp, target entity, and reason

**Maintainability**

- **NFR37:** Every new public UI primitive ships with a Storybook story (`@storybook/react-vite`); missing-story detection runs in CI
- **NFR38:** Every new API endpoint ships with a Zod validation schema co-located under `src/api/v2/schemas/` and an update to the OpenAPI spec in the same PR
- **NFR39:** `npm run type-check` (TypeScript) and the Vitest suite pass on every PR; merges are blocked otherwise
- **NFR40:** The full test suite completes in ≤ 5 minutes locally and in CI
- **NFR41:** The codebase remains open-source throughout; content is licensed CC-BY-SA-4.0, code under a permissive license (Architecture locks MIT); every PR preserves top-level license files

**Compliance & Legal**

- **NFR42:** All data processing conforms to GDPR — lawful-basis documentation, consent surfaces for analytics and tracking, right to access, right to erasure, public record of processing activities
- **NFR43:** Registration enforces COPPA / GDPR-K — users under 16 cannot self-register a contributor account; a clear notice explains why
- **NFR44:** Public content surfaces satisfy the EU Accessibility Act obligations applicable to public-interest digital services (effective 2025); compliance posture is documented publicly
- **NFR45:** Data-retention windows for logs, audit trails, and PII are specified in the public privacy policy and enforced programmatically (not by convention)

### Additional Requirements

_(Architecture + project-context invariants that shape implementation but are not functional or non-functional per se.)_

- **AR1 — No starter template; existing brownfield is the foundation.** Locked stack at MVP start: Next.js 16.0.8, React 18.3.1, TypeScript 5.8.3 (`strict: false`, `strictNullChecks: false`), Tailwind 3.4.17 + shadcn/ui, Supabase `@supabase/supabase-js` 2.81, Vitest 4 + happy-dom, Storybook `@storybook/react-vite` 8.6, tsx 4.20. Project initialization is NOT the first implementation story; the first is Module #0 substrate wiring.
- **AR2 — New Supabase tables via migrations 008–011:** `sources`, `assertions`, `confidence_scores`, `flags`, `revisions`, `editorial_doctrine`, `user_roles`, `audit_log`, `api_keys`; plus `classification_status` enum column on `afrik_peuples` + `afrik_familles_linguistiques`. Migration `007` exists but is not yet applied to prod.
- **AR3 — Postgres enforcement:** trigger on insert/update of demographic/classification fields rejects rows with no `assertions` entry; `recompute_confidence(entity_type, entity_id)` function fires on revision publish / flag status change / nightly sweep.
- **AR4 — New dependencies (install with `--legacy-peer-deps`):** `@supabase/ssr` + OAuth providers (GitHub, Google, ORCID), `@sentry/nextjs`, `@upstash/ratelimit` + `@upstash/redis`, `@next/mdx` + `@mdx-js/react` + `remark-gfm`, `@axe-core/playwright` (dev), `@lhci/cli` (dev). Sentry wizard is a one-time interactive install.
- **AR5 — Supabase Auth replaces admin cookie.** `ADMIN_USERNAME/PASSWORD` model replaced with Supabase Auth + `user_roles(reader | contributor | moderator | admin | advisor)`. OAuth providers: GitHub + Google + ORCID (ORCID may defer to first academic partner).
- **AR6 — Supabase RLS on all new tables:** read public, write role-gated; middleware gates `/admin/*` and `/moderation/*`.
- **AR7 — Middleware extensions (`src/middleware.ts`):** admin + moderator + contributor gates; CSRF on state-changing admin/moderation calls; CSP / HSTS / `X-Content-Type-Options` / `Referrer-Policy: strict-origin-when-cross-origin` headers; no inline scripts outside Next.js hashed ones.
- **AR8 — Response envelope (all `/v2/**`):** `{ data, meta: { license, attribution, confidence?, version?, pinned_url?, deprecation? }, errors: [] }`via`createApiResponse`/`createApiError`in`src/api/v2/utils/response.ts`. `meta.license = "CC-BY-SA-4.0"`. No naked data returns, no `{ success: true, ... }`, no raw arrays.
- **AR9 — Error code taxonomy (9 codes, UPPER_SNAKE, stable, documented in OpenAPI):** `VALIDATION_ERROR` 400 · `UNAUTHENTICATED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 · `SEMANTIC_ERROR` 422 · `RATE_LIMITED` 429 (with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) · `INTERNAL_ERROR` 500 (no stack in response, server-logged) · `UNAVAILABLE` 503.
- **AR10 — New API endpoints (Module #0 surface):** `GET /v2/peoples/{id}/revisions` · `GET /v2/peoples/{id}@v{n}` · `POST/GET /v2/flags` · `GET/PATCH /v2/flags/{id}` · `GET /v2/sources` · `GET /v2/sources/{id}` · `GET /v2/confidence/{entityType}/{entityId}` · `GET /v2/doctrine` · `GET /v2/health/verification` · `GET /v2/internal/moderation/queue` (role-gated) · `POST/PATCH /v2/internal/moderation/flags/{id}` · `GET /v2/feed/revisions` (Atom + JSON). Plus extensions to `/v2/peoples` filters: `minConfidence`, `classificationStatus`, `sinceVerifiedAfter`.
- **AR11 — Rate-limit tiers via Upstash sliding-window:** Anonymous 60 req/min per endpoint class · Contributor (session) 10 flags/hour + 100/day · API key free 10 req/s + 50 000 req/day · API key partner negotiated · Moderator/admin none. 429 responses include `Retry-After` + `X-RateLimit-*` headers.
- **AR12 — Versioning contract:** URL-path `/v2`, `/v3` when breaking. Additive-only within major. Deprecation: `Sunset: <RFC-1123>` + `Deprecation: true` + `Link: <v3-url>; rel="successor-version"`. 12-month minimum overlap window.
- **AR13 — Pinned-version URL scheme:** `/{lang}/{entity-segment}/{slug}@v{n}` (lowercase `v`, integer `n`, `@` literal). `@latest` and no suffix resolve to current (302 → `@v{current}` for `@latest`). Version routes: ISR `revalidate: false` (immutable). Current routes: ISR `revalidate: 3600` + on-demand invalidation via Postgres trigger.
- **AR14 — Immutable versioning invariant:** append-only `revisions` with `snapshot_jsonb` carrying full denormalized state at revision time. Pinned-version URLs render from snapshot directly, never from the live entity table. Source / doctrine references from a pinned version resolvable at pinned state (denormalized in snapshot or versioned independently). Confidence score on a pinned version is the score _at publication_, not a live recomputation.
- **AR15 — Confidence recomputation:** materialized pre-computed per-fiche score (`score`, `source_count`, `avg_source_quality`, `last_human_audit_at`, `open_flag_count`, `recomputed_at`). Event-driven via Postgres function on (a) new revision publish, (b) flag status change, (c) nightly CI sweep. Re-derivable from underlying data — no "cosmetic" scores, no editor overrides without log entry.
- **AR16 — Cache invalidation via `pg_notify`:** Postgres triggers on `revisions` insert → `pg_notify('cache_invalidate', payload)` → Next.js revalidation endpoint `/api/internal/revalidate` with shared secret.
- **AR17 — N+1 discipline for Module #0:** apply existing `getCountryRelationsMap()` batching pattern to `getSourcesMap(peopleIds)`, `getConfidenceMap(peopleIds)`, `getFlagsSummaryMap(peopleIds)`, `getLatestRevisionMap(peopleIds)`.
- **AR18 — Edge-caching semantics:** families / countries `s-maxage=86400, immutable` · people fiches `s-maxage=3600` with per-fiche cache-tag invalidation on moderation commit · flag writes `no-store` · public flag status `s-maxage=60`.
- **AR19 — Feed endpoint (FR38):** `GET /v2/feed/revisions?since={iso}` paginated revision diffs in Atom + JSON variants, cursor-based (no offset), idempotent + replay-safe.
- **AR20 — CI gates as blocking GitHub Actions:** `.github/workflows/ci.yml` (`make check`) · `lighthouse.yml` (Performance ≥ 85 mobile on `/`, `/pays/{sample}`, `/peuples/{sample}`) · `a11y.yml` (axe-core via Playwright — zero serious/critical) · `data-integrity.yml` nightly + pre-merge: FLG-folder mismatch, duplicate PPL ids, populations sum = 100 %, ISO 639-3 / 3166-1 α-3 validity, source URL resolvability on verified fiches, orphan fiches · `openapi-diff.yml` (breaking envelope changes fail unless commit trailer `api-breaking: true`).
- **AR21 — Data audit & cleanup (pre-MVP hard gate):** delete `PPL_TOKELAU_FAUXEX` · resolve 8 PPL duplicates · fix 6 `languageFamilyId` mismatches · remap invalid FLG codes (`FLG_KWA`, `FLG_NILO_SAHARIEN`, `FLG_OMOTIC`) · fix 5 zero-population fiches · normalize filenames (comma → underscore). Zero failing CI gates on `main` before any cross-fiche module ships.
- **AR22 — Search architecture:** Postgres FTS with `afrik_peuples.search_vector` + `afrik_pays.search_vector` (generated `tsvector` from `name || endonyms || alt_names`) + GIN indexes. `/v2/search` uses `websearch_to_tsquery('french', q)` · ranking by `ts_rank_cd` + confidence boost.
- **AR23 — Anti-spam on flag submission:** Cloudflare Turnstile (privacy-friendly, no-tracking CAPTCHA) server-side-verified via `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET` env vars. Invisible to user per UX rule.
- **AR24 — API-key schema (migration 011):** `api_keys(id, owner_id, key_hash (bcrypt), tier ∈ {free, partner}, origin_allowlist TEXT[], created_at, revoked_at, last_used_at)`. Raw key shown exactly once at issuance; only salted hash stored.
- **AR25 — Authentication matrix:** Public reads anonymous (IP rate-limit only) · Contributor actions (`POST /v2/flags`) session-based (Supabase Auth magic-link or GitHub/Google OAuth) with email verification before public visibility + opt-in identity · Moderator actions session + `role IN (moderator, admin, advisor)` · API key optional bearer token, scope read-only against `/v2/**` · Advisory-board auth via ORCID OAuth at Growth.
- **AR26 — Privacy defaults:** contributor identity opt-in per submission (default pseudonym + optional display name + optional region + "diaspora" / "autre") · aggregate-only analytics via Plausible (cookie-less, Do-Not-Track respected) · no cross-session tracking, no third-party ad trackers · `flags.reporter_contact` retained 24 months then auto-purged.
- **AR27 — Security-in-depth:** three enforcement layers — Supabase RLS · middleware gates · service-layer enforcement. Moderator actions write to `audit_log` in the same transaction as the mutation (service layer, not route). Flag status transitions: `open → triaged → (resolved | rejected)`, backward transitions forbidden (enum-checked).
- **AR28 — Observability:** structured logging via `@/lib/api/logger` exclusively; no `console.*` in `src/api/**` or `src/app/api/**` (ESLint rule `no-console`). Sentry with PII scrubbing — emails scrubbed, IPs truncated to /24. Product-health metrics: confidence-score distribution, audit velocity, median flag-resolution time, API requests per key, CI-gate outcomes. Admin-surface events log actor + timestamp + target + reason.
- **AR29 — Content licensing:** data CC-BY-SA-4.0 baseline (CC-BY-4.0 fallback pending short legal review); `meta.license = "CC-BY-SA-4.0"` in every `/v2/**` response; `/licence` page with worked examples; attribution-format snippet on every fiche; every downloaded CSV/Excel/JSON carries license metadata.
- **AR30 — Code licensing & rebrand-readiness:** code MIT; editorial doctrine CC-BY-4.0; rebrand-readiness via single source of truth (probably `src/lib/brand.ts` or env-driven config) for product name / canonical domain / attribution string / OG metadata. 301-redirect plan drafted pre-MVP, executed at Growth only if naming decision switches.
- **AR31 — Editorial doctrine:** versioned `editorial_doctrine` DB rows (`slug, title, mdx_source, version, published_at`); MDX rendered at `/fr/doctrine/[slug]` via `@next/mdx` + `remark-gfm` + `@mdx-js/react`; changes require advisory-board sign-off recorded in public changelog.
- **AR32 — Classification status enum:** column on `afrik_peuples` + `afrik_familles_linguistiques`, values `consensual | contested | colonial-legacy | reconstructive`. Fiches marked `contested` or `colonial-legacy` must cite ≥ 2 sources AND display doctrine-link banner; CI enforces the source-count rule.
- **AR33 — Endonym enforcement:** `autonym` column non-null required; fiches lacking `autonym` cannot reach `confidence ≥ medium`; CI flags missing autonyms.
- **AR34 — Living-culture cadence:** fiches for still-existing communities reviewed annually (vs. biennially for historical peoples); opt-in community-representative request channel recorded publicly per fiche.
- **AR35 — Transport + header hardening:** TLS 1.2+ with HSTS enforced; full CSP / HSTS / `X-Content-Type-Options` / `Referrer-Policy=strict-origin-when-cross-origin` via middleware.
- **AR36 — Backup & DR:** Supabase PITR (Pro plan); weekly `pg_dump` to S3 EU; RPO 24 h · RTO 4 h; deployment rollback ≤ 10 min.
- **AR37 — Data residency:** Vercel EU fra1 + Supabase EU eu-central-1 + Upstash Redis EU + Sentry EU data region + Plausible Cloud EU or self-hosted.
- **AR38 — Sentry wiring:** separate DSNs for client and server; `sentry.client.config.ts` + `sentry.server.config.ts` at repo root; `SENTRY_AUTH_TOKEN` for build-step source maps.
- **AR39 — Feature flags:** env-based only at MVP (`NEXT_PUBLIC_FEATURE_MODULE_ZERO_PUBLIC=true|false`); server-side via `src/lib/featureFlags.ts` (new), client-side via `process.env.NEXT_PUBLIC_*`; no runtime toggle service.
- **AR40 — Storybook governance:** `@storybook/react-vite` ONLY (Next 16 removes `next/config`, incompatible with `@storybook/nextjs`); every new public UI primitive ships a story at 430 / 720 / 800 px (+ 1024 for moderation); missing-story detection runs in CI; stylelint rule (once ESLint root config is restored) forbids raw hex / spacing px / font-size inside components.
- **AR41 — Known broken tooling (do not opportunistically fix):** `npm run lint` (`next lint`) and `npx eslint src/` are broken at root (no working `eslint.config.js` despite ESLint 9 + typescript-eslint in `package.json`); a scoped fix must land before Module #1 new UI ships. 6 pre-existing failures in `scripts/__tests__/migrateAfrikToDatabase.test.ts` + 4 in handler tests remain out of scope unless explicitly tasked.
- **AR42 — Structure additions:** new folders `src/components/system/`, `src/components/verification/`, `src/components/people/`, `src/components/moderation/`, `src/components/doctrine/`; `src/lib/verification/`; new hooks `use-confidence.ts`, `use-version.ts`, `use-flag-submission.ts`; new token sheet `src/styles/verification-tokens.css` (optional split); new types `src/types/verification.ts`, `src/types/api.ts`; new stories under `src/stories/verification/`; new transformers `src/lib/peopleDataTransformer.ts`; new utilities `src/lib/featureFlags.ts`, `src/lib/rateLimit.ts`; new scripts `scripts/recomputeConfidence.ts`, `scripts/seedSources.ts`; new migrations `008`–`011`.
- **AR43 — GDPR operational compliance:** right-to-erasure removes PII within 30 days; contribution attribution replaced by deterministic pseudonym (preserves audit-log integrity); cookie / consent surface GDPR-compliant; 16+ age gate at signup (GDPR-K); EU Accessibility Act 2025 alignment documented publicly.
- **AR44 — AFRIK data discipline (project-context invariants):** authorized sources only (UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA) — never invent data; 2025 reference year demographics; populations sum to exactly 100 % per country; TXT demographics must match DB; strict `public/modele-*.txt` models; colonial terms kept but explained, auto-appellations (endonyms) always provided.
- **AR45 — DB migration runbook:** Supabase migrations applied manually via `supabase db push` (no auto-migrate — too risky for a public-data project). Migrations numbered `008_module_zero_fabric.sql` · `009_classification_status_enum.sql` · `010_assertions_triggers.sql` · `011_api_keys.sql`. `007_remove_v1_add_v2_contribution_types.sql` not yet applied to prod — must ship before Module #0 migrations.

### UX Design Requirements

_(Actionable items from the UX Design Specification — each specific enough to yield a story with testable acceptance criteria.)_

**Design system foundation**

- **UX-DR1 — Design-system extraction & tokens:** rename `--country-*` → `--afh-*`; create `src/styles/tokens/` split by concern (`color.css`, `type.css`, `space.css`, `elevation.css`, `motion.css`, `radius.css`); widen L2 semantic tokens — confidence tiers (`--afh-conf-high/mid/low`), classification states (`--afh-classification-stable/contested/disputed`), source tiers (`--afh-source-primary/secondary/ai-flagged`), flag states (`--afh-flag-open/resolved`), true-error only for `--afh-error`; add type roles (`--afh-type-autonym` / `--afh-type-exonym`); add three density profiles (`--afh-density-reading` generous / `--afh-density-moderation` dense / `--afh-density-developer` technical) applied at surface root. `--country-*` remains as alias for one release.
- **UX-DR2 — Typography:** Fraunces (display / hero / autonym) + Nunito Sans (body / UI / chip / moderation / developer), self-hosted via `next/font/google`. Type scale mobile → desktop 9–48 px across 9 roles (`hero / h1 / h2 / h3 / body / small / caption / micro / nano`). Body line-height ≥ 1.6 · reading-surface line length 65–75 ch · source-chain-sheet line length 45–60 ch. Autonym uses display weight 900 in Fraunces; exonym body weight 500 in Nunito Sans — enforced at component level, not editorial. Weights used: 400/500/600/700/900.
- **UX-DR3 — Color palette (warm earthen decolonial, non-alarm):** surface `--afh-bg #FBF7F2` · `--afh-bg-warm #F5EDE0` · `--afh-card #FFFFFF` · `--afh-border #E8DFD3` · `--afh-text #2C2018` (contrast ≥ 13:1) · `--afh-text-soft #7A6B5D` (≥ 4.9:1). Semantic `--afh-green #2B6B42` · `--afh-gold #B8860B` · `--afh-terracotta #C2532A` · `--afh-earth #8B6B47` · `--afh-colonial #9B3030` · `--afh-error #B33A3A`. **Red (`--afh-error`) is reserved exclusively for true errors — never for contested classification, low confidence, or flagged content.** Demographic palette `--afh-demo-1..10 + other` preserved; hero gradient preserved.
- **UX-DR4 — Spacing / radii / motion:** spacing 4-unit scale 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24 px (`--afh-space-xs..5xl`). Radii 2 / 4 / 6 / 8 / 12 / 14 / 16 / 20 / full (`--afh-radius-base: 12`; buttons 6; full only for pills / avatars). Motion defaults: 400 ms fade-in on mount · 200 ms sheet slide + crossfade · `prefers-reduced-motion: reduce` resolves all motion tokens to 0.01 ms opacity-only. **No parallax · no scroll-triggered animation · no autoplay video · ever.**
- **UX-DR5 — Responsive breakpoints:** mobile `< 720 px` (canonical at 430 px, minimum 320 px) · tablet md 720–1199 px · desktop xl ≥ 1200 px (reading-surface max-width 800 px; moderation surface min 1024 px, max 1440 px; developer portal min 720 px, max 1200 px). Tailwind custom config maps `md: 720px`, `xl: 1200px`. All media queries `min-width` only — no `max-width` in production CSS. No horizontal scroll on body.
- **UX-DR6 — Public design-system documentation:** publish system in Storybook under `src/stories/design-system/*.mdx` (Color / Type / Spacing / Elevation / Motion / Radii pages) — publicly inspectable at `/design-system` as part of the radical-transparency posture.

**Reading-surface L3 components (Module #0 + Module #1 MVP-critical)**

- **UX-DR7 — `AutonymExonymHeading`:** autonym in Fraunces weight 900 with `lang={iso-639-3}` attribute · exonym in Nunito Sans weight 500 · variants `hero` / `inline` / `card` · optional IPA pronunciation (opt-in) · alternate names behind `+N autres` expandable · TypeScript enforces `autonym` required (exonym nullable). Bare name strings are a lint error elsewhere in the codebase.
- **UX-DR8 — `ConfidenceChip`:** inline pill "X % · N sources · vérifié YYYY-MM-DD" at end of paragraph/assertion · sizes `inline` (default) / `hero` · variant `contested` (typographic distinction, no icon) · tap target ≥ 44 × 44 px via wrapper padding even when visual pill smaller · `aria-label` carries full semantic ("ouvrir la chaîne de sources pour cette assertion (confiance 85 %, 4 sources, vérifiée le 8 février 2026)") · first-fiche subtle pulse animation respecting `prefers-reduced-motion`, then never again (one-shot implicit invitation) · fallback renders "voir les sources" link when data missing — never renders broken · JS budget ≤ 2 KB gzipped.
- **UX-DR9 — `ClassificationBadge`:** inline badge for `contested` / `disputed` · calm visual language (no red, no gauge, no traffic-light) · warm hue only (`--afh-earth` / `--afh-terracotta`) · paired with icon + text + color (never color alone).
- **UX-DR10 — `SourceChainSheet`:** bottom sheet on mobile < 1024 px (full-width, max 85 vh, swipe-down dismiss) · right-side sheet 420 px tablet md · 480 px desktop xl ≥ 1200 px. Contents in strict order: (1) disputed assertion quoted verbatim (Fraunces italic, left-border), (2) expanded confidence block with explainer sentence, (3) open-flag banner if any, (4) source list grouped by tier primary / secondary / tertiary / AI-flagged with title + author + year + page + resolvable URL + badge, (5) revision link if applicable, (6) flag CTA as graceful exit at bottom, (7) cite-this-assertion surfaces only after 4 s dwell time. 200 ms slide + crossfade · Esc / swipe-down / scrim-tap / Android hardware back all dismiss · `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on header · focus trap with return-focus-on-close · canonical URL captures open state (`/fr/peuples/seereer#chip-paragraph-3`) · broken source URL shown struck-through with "lien non résolu — signalé YYYY-MM-DD" calm badge · JS budget ≤ 8 KB gzipped, lazy-loaded (not in initial fiche bundle).
- **UX-DR11 — `FlagTarget` + `FlagForm`:** `FlagTarget` is text button at bottom of source list ("signaler cette assertion" — no icon, no alarm color, `--afh-terracotta` on tap). `FlagForm` replaces source list inside the same sheet (no new modal). Fields: (1) **Context** (pre-filled read-only, quoted assertion), (2) **Counter-source** (optional URL + free text, soft URL validation, resolvability checked server-side), (3) **Reasoning** (required, 500 chars max, counter appears at 450), (4) **Contributor identity** (optional: name + region dropdown of African regions + "diaspora" + "autre", defaults to anonymous), (5) **Email for notification** (optional, no account creation). Submit → sheet transitions to confirmation with public flag URL + copy-URL button + "retourner à la fiche" link. States: pristine · editing · validating · submitting · rate-limited (calm "réessayer plus tard" with timestamp) · error (retry, never auto-resubmit) · confirmed. No visible CAPTCHA; `aria-required` not asterisks alone; inline `role="alert"` errors tied via `aria-describedby`; submit disabled only during submission; Cmd/Ctrl+Enter submits.
- **UX-DR12 — `CitationBlock`:** `Tabs` switcher "version vivante" / "version figée @v34" (pinned variant only when pinned version exists). Preview pane plain text: _Title (autonym / exonym). Africa History. URL. Date d'accès. CC-BY-SA 4.0._ — CC-BY-SA attribution line is **non-optional**. Copy button primary, single tap, clipboard write + transient "copié" confirmation with `aria-live="polite"` region. Format selector (secondary): plain text (default) · BibTeX · markdown link. Printable-preview link (tertiary). Clipboard-permission-denied fallback: manually selectable preview with "sélectionner manuellement" hint.
- **UX-DR13 — `RevisionDrawer`:** revision history sheet showing revision count + date list (MVP minimal) · linked from `SourceChainSheet` revision link · full diff view deferred to Growth.
- **UX-DR14 — `PinnedVersionBanner`:** single-line banner pinned **below** the fiche header (never above — does not push autonym below fold). Contents: "version figée du YYYY-MM-DD (@v34) · voir la version vivante →". Warm background `--afh-bg-warm`, not alarm. `role="region"` `aria-label="indicateur de version figée"`. Dismissible to small "@v34" corner indicator with `localStorage` persistence **per-fiche only, not globally**. Expanded note when `hasRelevantResolvedFlags`: "depuis cette version figée, N assertion(s) ont été corrigée(s) — voir version vivante". Link to live version always visible, never hidden behind dismiss.
- **UX-DR15 — `DoctrineLinkCard`:** embedded in section footers on sensitive assertions (static content) · links to current doctrine version.
- **UX-DR16 — `FlagPublicStatus` + public flag URL page (`/fr/signalements/{id}`):** shows flag URL, disputed assertion, contributor reasoning, status (`open` / `triaged` / `resolved` / `rejected` / `en attente d'info complémentaire` / `clôturé sans réponse` / `en examen — conseil scientifique`), moderator reasoning (when resolved or rejected), contributor credit (name + region if disclosed), and changelog credit for accepted corrections. **Rejection ≠ deletion — URL stays public with reasoning.** 30-day "en attente d'info complémentaire" timer auto-closes to "clôturé sans réponse".
- **UX-DR17 — `PeopleDetailViewV2` + section components:** orchestrator mirroring Carte vivante 8-section scrollable pattern (adapt country-page pattern). Section components: `PeopleHero` (autonym + exonym + fiche-level `ConfidenceChip` hero variant + flag CTA), `PeopleOriginBlock`, `PeopleLanguageSection`, `PeopleHistoryTimeline`, `PeopleCultureGrid`, `PeopleRelatedPeoplesSection`, `PeopleCountriesSection`, `PeopleSourcesFooter`. Data flows through new `src/lib/peopleDataTransformer.ts`.

**Fiche reading-direction layout**

- **UX-DR18 — Direction D: prose-with-inline-chips fiche layout:** long-form flowing prose by section; inline `ConfidenceChip` at end of each verified paragraph (not in page chrome, not in a sidebar). **One chip per paragraph by default** — editorial discipline; per-sentence only for contested / politically-sensitive claims. Progressive hydration: prose SSR-rendered first; chips hydrate as a second wave to protect LCP. Failed chip hydration falls back to static "voir les sources" link; failed source URL shows struck-through with calm `lien non résolu — signalé` badge; broken state is itself a trust signal.
- **UX-DR19 — Core defining interaction:** chip tap → sheet opens in < 200 ms INP · sheet contents order per UX-DR10 · no navigation stack · canonical URL anchor captures open state so any opened chip is shareable · Esc / swipe-down / scrim-tap dismisses identically.

**Moderation-surface L3 components (Module #0 — Fatou, desktop-first)**

- **UX-DR20 — `ModeratorQueueRow`:** dense row desktop-first ≥ 1024 px · SLA counter (overdue-first sort, then newest) · flag summary · one-click action hint · auto-refresh every 30 s (non-blocking).
- **UX-DR21 — `ModeratorDecisionPanel`:** single-screen triage view (no tab-hopping) combining flag + disputed assertion + existing sources + counter-source preview + diff view + doctrine-clause links on sensitive assertions + assistant-suggested edit + history. Keystroke decisions: **A** accept (assistant suggestion → inline-editable in diff) · **R** reject (requires cited reasoning ≥ 1 source or doctrine clause) · **I** request info (30-day timer starts) · **E** escalate (advisory-board picker). Confirm dialog **only for rejection + escalation**. Pessimistic lock with 5-min inactivity "reprendre" offer; second moderator sees "en cours de traitement par X". State preserved if moderator closes mid-flag.
- **UX-DR22 — `FlagDiffView`:** side-by-side assertion diff inline inside `ModeratorDecisionPanel`.
- **UX-DR23 — `EscalationPicker`:** advisory-board routing picker — selects experts by domain, attaches thread, records moderator position. MVP deferrable to Growth if budget tight; fallback is ticketing the advisory board manually.

**Developer-portal L3 components (Module #3 — Thomas)**

- **UX-DR24 — `AttributionBlock`:** auto-suggested attribution reminder rendered beside every API response viewer in `/docs/api` · CC-BY-SA-4.0 attribution-format snippet copyable.
- **UX-DR25 — `ApiFilterChip`:** chip for `region` / `FLG` / `countryIso3` / `minConfidence` / `sinceVerifiedAfter` filters · active filters dismissible with `×` affordance · URL reflects filter state (shareable).

**Interaction and UX patterns**

- **UX-DR26 — Button hierarchy (3 tiers):** **primary** filled `--afh-green` or `--afh-gold`, one per view max; **secondary** outlined `--afh-text` on `--afh-border`; **tertiary** text-only with underline on hover/focus. **No primary buttons on the reading surface outside sheets/drawers** — fiche body has no "subscribe" / "join" CTA ever. Destructive actions (moderator reject, admin delete) = secondary outline + `--afh-error` text color — never a filled red button. Icon-only buttons forbidden on reading surface; icons paired with visible text labels. Button text = imperative French infinitive ("copier", "signaler", "voir"); never "Cliquer ici".
- **UX-DR27 — Feedback patterns (4 levels, distinct tones):** **Success** calm, inline, not celebratory — no toasts on reading surface, no confetti, no emoji, no exclamation marks. **Error** user-recoverable, inline red (`--afh-error`) only — specific and actionable ("URL invalide — vérifier le format"), paired with retry path. **Warning** (contested, stale, flagged) warm hues never red. **Info** neutral `--afh-text-soft` on `--afh-bg-warm`. **Toasts** forbidden on reading surface; allowed on moderation surface max one at a time, `aria-live="polite"`, dismissible, auto-dismiss 5 s. **Progress**: no indicator < 300 ms · inline skeleton / button-embedded spinner 300 ms – 2 s · progress UI + cancel > 2 s · async jobs use email notification not blocking spinner.
- **UX-DR28 — Form patterns:** single column on mobile · labels above fields · no placeholder-as-label · on-blur validation (never mid-typing, never on focus) · inline `role="alert"` errors tied via `aria-describedby` · red text + red left-border on invalid field (never a red banner) · required `aria-required="true"` + "(requis)" label suffix · optional fields labelled "(facultatif)" when absence might confuse · primary submit bottom-left-aligned · disabled only during submission (never before touch) · Cmd/Ctrl + Enter submits any form with ≥ 2 fields · no auto-submit on last-field blur. Privacy: no form-field-content analytics, ever · local `sessionStorage` only · email/identity fields default anonymous.
- **UX-DR29 — Navigation patterns:** mobile compact top bar (logo + language-family dropdown + search icon — **no hamburger menu**) · desktop widened top bar with inline horizontal nav (countries · peuples · familles · about · doctrine · API) · moderator surface has its own nav (queue · history · flags · escalations · doctrine). Breadcrumbs inline below hero on fiche + country pages exposing AFRIK hierarchy (Familles → FLG_BANTU → Kikongo → Bakongo → RDC), small type `--afh-text-soft`; never on home, doctrine, or moderator pages. Browser back always works — never hijacked. Sheets add history entries so Android hardware back closes sheet before page. Scroll position preserved on sheet close. Search = dedicated page `/fr/recherche`, not a modal. `/` focuses search input from any page (progressive enhancement).
- **UX-DR30 — Modals & overlays — sheets preferred:** bottom sheet on mobile, side sheet on desktop · scrim 40 % opacity on reading surface · always dismissible by scrim tap / Esc / swipe-down / hardware back. **Dialogs** only for true interruptions (moderator reject confirmation, admin destructive, session expiry); centered, focus-trapped, Esc-dismissible, cancel button visually equivalent to confirm; never for marketing / announcements / onboarding. **Popovers not used** (fail on touch). **Tooltips** desktop-only hover 400 ms delay, arrow pointing target, never sole information source; used for source-type badges, chip meta, moderator SLA countdowns.
- **UX-DR31 — Loading / empty / error states:** SSR content instant · skeletons `--afh-bg-warm` with subtle shimmer respecting `prefers-reduced-motion` · never centered spinner on blank page (text-first degradation preferred). **404** calm page with fiche URL pattern + search affordance + "signaler une URL cassée" CTA. **500** plain "une erreur est survenue" + retry button + error-reference copyable for support. **Network offline** degrades reading surface to last-cached prose with banner "hors-ligne — affichage d'une version en cache". **Empty search**: calm French message + suggestions + search tips; never "Oops!" or emoji. **Empty moderator queue**: "Aucun signalement en attente — bon travail." (the one place a small dignified celebration is allowed). **No illustrations of sad face, crying robot, broken element — ever.** Dignity holds in failure.
- **UX-DR32 — Search & filtering:** text input with submit button (not instant — queries rate-limited for perf) · auto-suggest from 2+ chars, max 6 suggestions · no search-history retention beyond session (privacy default) · filters as chips **always visible** at top of results (never hidden behind accordion) · active filters dismissible with `×` · "Clear all" text link to right of chip row · URL reflects filter state (every filtered view shareable) · sort control = dropdown not chip row · **no-results** state offers check-spelling / broader query / browse by FLG / "signaler donnée manquante" (opens flag form pre-populated with search query).
- **UX-DR33 — Authentication UX:** **Reader** no account, no login, no cookie wall, ever. **Contributor (flagging)** no account required; optional email for resolution notification; optional name for changelog credit. **Moderator** invite-only login via Supabase Auth session cookie; no self-registration; 2FA required for advisory-board members. **Developer** API key via email-linked request flow (Thomas's journey); no account dashboard at MVP — key management via email. **Logout** clears session cookie; no "are you sure?"; moderator reminder-to-commit-pending-decisions shown if applicable.
- **UX-DR34 — Microcopy tone:** librarian, not marketer · French-first CEFR B1 · default to "vous" at MVP (re-examine with francophone copywriter). **Forbidden phrases:** "Oops!" · "Sorry!" · "Merci de…" imperative · "Cliquer ici" · "En savoir plus" · any phrase starting with "We" · excitement signaling ("génial", "super", "parfait", 🎉). **Preferred:** state-confirmation past participles ("copié", "publié", "signalé", "vérifié") · action infinitives ("voir", "consulter", "ouvrir", "lire"). Dates: ISO format (2026-02-08) in UI + long-form ("le 8 février 2026") in prose.

**Accessibility**

- **UX-DR35 — WCAG conformance:** WCAG 2.1 Level AA on all public surfaces · AAA on `SourceChainSheet` (body 7:1, large text 4.5:1). Automated gates: axe-core via Vitest zero violations on L3 component stories · Lighthouse CI Performance ≥ 85, Accessibility = 100, Best Practices ≥ 95 on mobile reference routes · `eslint-plugin-jsx-a11y` error level · contrast-ratio snapshot test covering every Step-8 palette pairing.
- **UX-DR36 — Semantic HTML + ARIA:** no `<div>` buttons · no `<span>` headings (`AutonymExonymHeading` renders `<h2>` / `<h3>`, never styled paragraphs) · `ConfidenceChip` `role="button"` + `aria-label` containing assertion excerpt + `aria-expanded` · `SourceChainSheet` `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to the assertion excerpt · focus trap while sheet open; background `aria-hidden="true"` and `inert`; return focus to triggering chip on close.
- **UX-DR37 — Keyboard + touch + focus:** full keyboard nav, no keyboard trap anywhere · tab-reachable chips (Enter/Space opens sheet) · focus indicator 2–3 px `--afh-gold` outline with 2 px offset, never clipped, never suppressed without replacement · 44 × 44 px minimum touch targets (enforced by component padding even when visual glyph smaller) · skip-to-content link on every page · Esc closes sheets consistently.
- **UX-DR38 — Language markup:** `<html lang="fr">` default; every autonym rendered inline receives `lang="{iso-639-3}"` (e.g. `<span lang="yo">Yorùbá</span>`) so VoiceOver / NVDA pronounce endonyms correctly and translation tools scrape them correctly.
- **UX-DR39 — Motion + zoom + color independence:** all animations honor `prefers-reduced-motion: reduce` (no vestibular hazard) · layout reflows without horizontal scrollbars at 200 % text zoom on all breakpoints · **color is never the sole signal** — confidence tiers pair icon + text + color; monochrome print preserves meaning.
- **UX-DR40 — Keyboard shortcuts (desktop-only, discoverable via `?` modal):** `f` flag current assertion · `s` open source sheet for current assertion · `⌘/Ctrl + K` global search · `g p` peoples index · `g f` families index · `Escape` close sheet / dismiss modal.
- **UX-DR41 — Screen-reader announcements (defining interaction):** chip focus: "Source vérifiée par 2 références académiques. Entrée pour ouvrir la chaîne de sources." Sheet open: "Chaîne de sources pour : {assertion}. 3 sources. Première source : …"

**Testing & device matrix**

- **UX-DR42 — Device matrix (real devices, not emulators):** low-end Android Samsung Galaxy A14 on Chrome with throttled 4G (reference device) · mid-range Pixel 7 on Chrome · iPhone SE (small) + iPhone 14 (standard) on Safari · macOS Chrome + Firefox + Safari · Windows Chrome + Edge · iPad Safari + Samsung Tab A. IE11, below-last-2-major-versions browsers, JAWS explicitly not in gate.
- **UX-DR43 — Per-module manual a11y testing:** keyboard-only full-journey pass on new surface · VoiceOver (iOS Safari) + TalkBack (Android Chrome) + NVDA (Windows Firefox) pass in French on the defining interaction · 200 % zoom sanity on mobile/tablet/desktop · `prefers-reduced-motion: reduce` visual check · color-blindness simulation (deuteranopia, protanopia, tritanopia) on any surface using confidence palette.
- **UX-DR44 — Per-major-module user testing:** minimum 3 target-audience users (at least 1 continental African + 1 diaspora + 1 educator); ≥ 1 session on a genuinely constrained connection; **observed failure on the defining interaction (chip → sheet) is a release blocker**; recruit via partner institutions.
- **UX-DR45 — PR checklist (8 points enforced in PR template):** (1) axe-core passes on all modified stories, (2) keyboard navigation verified on modified surface, (3) screen-reader labels present on novel interactive elements, (4) contrast ratios documented for new color pairings, (5) mobile 430 px screenshot attached, (6) tablet + desktop screenshots attached if layout changes, (7) `prefers-reduced-motion` variant documented if animation added, (8) no regression in Lighthouse mobile score on reference routes.

**Performance and progressive enhancement**

- **UX-DR46 — Performance budgets (a11y + posture dimension):** LCP ≤ 2.5 s on 4G throttled (Lighthouse mobile profile) · INP ≤ 200 ms for the defining interaction (chip tap → sheet visible) · CLS ≤ 0.1 on fiche (reserve space for chips and media) · people-fiche HTML + CSS + critical JS ≤ 500 KB uncompressed · `ConfidenceChip` JS ≤ 2 KB gzipped · `SourceChainSheet` JS ≤ 8 KB gzipped and lazy-loaded.
- **UX-DR47 — Progressive enhancement baseline:** every reading-surface component renders meaningful content from SSR alone · interactivity hydrates second · failed hydration degrades to static · broken chip data falls back to static "voir les sources" link that opens the sheet anyway · broken source URL shown struck-through + "lien non résolu — signalé YYYY-MM-DD" calm badge (broken state is itself a trust signal, not hidden failure).

**Component library governance**

- **UX-DR48 — L3 component library location & governance:** L3 components live in **`src/components/system/`** (new folder; separate from domain-specific `src/components/country/`, `src/components/people/`). Published to Storybook publicly at `/design-system`. Every L3 ships: (a) Storybook story at 430 / 720 / 800 px (+ 1024 for moderation), (b) Vitest + Testing Library tests covering states + a11y (axe-core), (c) TypeScript API documented in story autodocs tab, (d) mobile screenshot committed alongside. **No component carries business logic** — data fetching, validation, side effects live in hooks (`useConfidenceChip`, `useFlagSubmission`) or server actions; components receive props and render.
- **UX-DR49 — Decolonial-posture enforcement rules (lint/component-level):** (1) **Autonym-first rule** — any component displaying a people or language name must use `AutonymExonymHeading` or inherit; bare strings are a lint error. (2) **Source-attached rule** — any component displaying a factual assertion must accept a `confidenceChip` slot (nullable for editorial prose, required for data-model-backed assertions). (3) **Non-alarm semantic rule** — the color `--afh-error` may only be referenced by components whose name includes `Error`, `Invalid`, or `Broken`; lint-enforced. (4) **Public-artifact rule** — any contribution action (flag, edit, escalation) that creates a persistent record must return a public URL in the success response; if backend doesn't return one, the component fails closed — no success state rendered. (5) **Dignity rule** — no engagement metrics (view counts, like counts, contributor leaderboards) rendered on any surface; component props cannot accept them; data model does not expose them.

**Editorial discipline + content rules**

- **UX-DR50 — Editorial chip-density + confidence rules:** one `ConfidenceChip` per paragraph by default; finer granularity (per-sentence) only for contested / politically-sensitive claims — enforced editorially, not technically. Never show confidence below 30 % without a human-written explainer in the sheet. "Verified by" dates older than 18 months show a soft caption "à re-vérifier" **in the sheet, not on the chip itself**. No emoji, no icon on the chip; the chip is typographic. Transparency artifacts (flag URLs, pinned versions, revision history) remain public even after resolution — rejection ≠ deletion.

### FR Coverage Map

| FR   | Epic         | Note                                                    |
| ---- | ------------ | ------------------------------------------------------- |
| FR1  | Epic 2       | Browse people fiches by family / language / country     |
| FR2  | Epic 2       | Search by endonym, exonym, historical, alt-spelling     |
| FR3  | Epic 2       | Complete people fiche with structured sections          |
| FR4  | Epic 2       | Navigation to related entities                          |
| FR5  | Epic 2       | All content free and unauthenticated                    |
| FR6  | Epic 1       | Confidence score above the fold                         |
| FR7  | Epic 1       | Source list classified by tier                          |
| FR8  | Epic 1       | Resolvable URL + page + year for each source            |
| FR9  | Epic 1       | Date of most recent human audit                         |
| FR10 | Epic 1       | Unaudited-fiche disclaimer                              |
| FR11 | Epic 1       | Confidence computation explainer                        |
| FR12 | Epic 4       | Contributor submits flag                                |
| FR13 | Epic 4       | Contributor proposes textual correction                 |
| FR14 | Epic 4       | Public moderation queue (read-view)                     |
| FR15 | Epic 5       | Moderator triages flags                                 |
| FR16 | Epic 5       | Moderator publishes revision with audit-log entry       |
| FR17 | Epic 4       | Contributor sees resolution outcome                     |
| FR18 | Epic 3       | Stable URL serves current revision                      |
| FR19 | Epic 3       | Pinned-version URL serves exact content @v{n}           |
| FR20 | Epic 3       | Full audit log per fiche                                |
| FR21 | Epic 3       | Auto-generated citation block                           |
| FR22 | Epic 1       | Public editorial doctrine page                          |
| FR23 | Epic 1       | Classification status inline + explainer                |
| FR24 | Epic 1       | Multi-perspective view on contested fiches              |
| FR25 | Epic 1       | Doctrine version in force at revision time              |
| FR26 | Epic 0       | FLG identifier matches parent folder                    |
| FR27 | Epic 0       | PPL duplicate detection                                 |
| FR28 | Epic 0       | Demographics sum to 100 % per country                   |
| FR29 | Epic 0       | ISO 639-3 / 3166-1 alpha-3 validity                     |
| FR30 | Epic 0       | Source URL resolvability                                |
| FR31 | Epic 0       | Unresolvable URL → confidence drop + public flag        |
| FR32 | Epic 0       | CI blocks merges on data-integrity regressions          |
| FR33 | Epic 6       | Third-party JSON API read access                        |
| FR34 | Epic 6       | Free API key with published rate limit                  |
| FR35 | Epic 6       | Attribution metadata in API responses                   |
| FR36 | Epic 6       | OpenAPI 3.1 spec at stable URL                          |
| FR37 | Epic 6       | Versioning policy with 6-month deprecation window       |
| FR38 | Epic 6       | Feed / changelog endpoint for updated fiches            |
| FR39 | Epic 4       | Contributor account registration + email verification   |
| FR40 | Epic 4       | Flags submitted under account with public attribution   |
| FR41 | Epic 5       | Admin grants moderator status                           |
| FR42 | Epic 4       | Profile management + GDPR account deletion              |
| FR43 | All UI epics | Mobile / tablet / desktop functional (cross-cutting AC) |
| FR44 | All UI epics | WCAG 2.1 AA keyboard + screen reader (cross-cutting AC) |
| FR45 | Epic 4       | COPPA / GDPR-K age gate at registration                 |
| FR46 | Epic 0       | Cookie / tracking consent surface                       |

All 46 FRs mapped.

## Epic List

### Epic 0: Trustworthy Data Baseline & Platform Foundation

The AFRIK dataset passes structural integrity checks and platform observability / security / compliance wiring is operational — every subsequent feature epic ships on a trustworthy, auditable foundation.

**FRs covered:** FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR46

**Key deliverables:** pre-MVP data cleanup per AR21 (delete `PPL_TOKELAU_FAUXEX`, resolve 8 duplicates, fix 6 FLG mismatches, fix 5 zero-population fiches, normalize filenames) · migrations 008–011 scaffolded · CI data-integrity + Lighthouse + axe-core + OpenAPI-diff blocking gates · Sentry + Plausible + structured logger · Supabase Auth bootstrap · cookie / consent surface · rebrand-readiness single source of truth · security headers (CSP / HSTS / `X-Content-Type-Options`).

**Depends on:** — (foundation)
**Enables:** Epics 1–6

---

### Epic 1: Source Transparency Fabric (Module #0 core)

Every fiche displays confidence score above the fold, classification status, and a tappable chain of sources tracing back to verifiable external origins. Visitors understand the editorial doctrine.

**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR22, FR23, FR24, FR25

**Key deliverables:** `sources` + `assertions` + `confidence_scores` + `editorial_doctrine` tables populated · `ConfidenceChip`, `ClassificationBadge`, `SourceChainSheet`, `DoctrineLinkCard` L3 components · `/fr/doctrine/[slug]` MDX page via `@next/mdx` · event-driven confidence recomputation on flag / revision triggers · unaudited-fiche disclaimer · multi-perspective view for contested classifications · Africa History design-system token sheet (`--afh-*`, Storybook publication at `/design-system`).

**Depends on:** Epic 0 (migrations, Sentry, logger, design-system foundation)
**Enables:** Epics 2, 3, 4

---

### Epic 2: People Fiche Reading Experience (Module #1)

Visitors discover, search, and read complete endonym-first people fiches with full decolonial-posture compliance — accessible across mobile / tablet / desktop, LCP ≤ 2.5 s on 4G.

**FRs covered:** FR1, FR2, FR3, FR4, FR5

**Key deliverables:** `PeopleDetailViewV2` orchestrator + 8 section components · `AutonymExonymHeading` with `lang={iso-639-3}` · Direction D (prose-with-inline-chips) layout · Postgres FTS search with `search_vector` + GIN indexes · `/fr/recherche` search page · breadcrumbs + top-bar navigation · Storybook public `/design-system` publication extended · Lighthouse CI Performance ≥ 85 mobile gate on reference routes.

**Depends on:** Epic 1 (`ConfidenceChip` + `ClassificationBadge` primitives embedded in prose)
**Enables:** Epic 3 (reading surface hosts the pinned-version banner and citation block), cross-cut into Epics 4–6

---

### Epic 3: Pinned Versions, Revision History & Citation

Users cite stable pinned URLs (`/{lang}/{entity}/{slug}@v{n}`) that permanently serve content as of a given revision; users browse revision history with transparent changelogs; auto-generated citation blocks carry correct CC-BY-SA-4.0 attribution.

**FRs covered:** FR18, FR19, FR20, FR21

**Key deliverables:** append-only `revisions` table with `snapshot_jsonb` · pinned-URL routing (ISR `revalidate: false`) · current-URL ISR with `pg_notify` on-demand invalidation · `CitationBlock` with live / pinned tabs · `RevisionDrawer` + `PinnedVersionBanner` components · feed endpoint `/v2/feed/revisions` (Atom + JSON, cursor paginated) · audit-log public surface.

**Depends on:** Epics 1, 2 (surface to host pinned banner and citation block; revisions reference assertions + doctrine version)
**Enables:** Epic 6 (feed endpoint exposes revisions to API consumers)

---

### Epic 4: Community Contributions (Flags & Corrections)

Anyone can register as a contributor, submit a flag or proposed correction against any assertion, and see the public URL + status of every flag — rejection never means deletion.

**FRs covered:** FR12, FR13, FR14, FR17, FR39, FR40, FR42, FR45

**Key deliverables:** `flags` table with state machine (`open → triaged → resolved | rejected`) · contributor account lifecycle via Supabase Auth (magic-link + GitHub / Google OAuth) · `FlagTarget`, `FlagForm`, `FlagPublicStatus` L3 components · public flag page `/fr/signalements/{id}` · public moderation queue read-view · Cloudflare Turnstile anti-spam · rate-limit (10 flags / hr + 100 / day per contributor) · COPPA / GDPR-K age gate at registration · GDPR right-to-erasure (pseudonym-preserving attribution).

**Depends on:** Epic 0 (Supabase Auth bootstrap + Turnstile + Upstash rate-limit), Epic 1 (flags attach to `assertions`)
**Enables:** Epic 5 (flags are the input to moderation)

---

### Epic 5: Moderation & Editorial Workflow

Moderators triage flags from a dense single-screen panel; editors publish revisions that produce immutable audit-log entries; administrators grant moderator status to verified contributors.

**FRs covered:** FR15, FR16, FR41

**Key deliverables:** `user_roles` table (`reader / contributor / moderator / admin / advisor`) + `audit_log` table · role-gated middleware on `/admin/*` and `/moderation/*` · `ModeratorQueueRow`, `ModeratorDecisionPanel`, `FlagDiffView`, `EscalationPicker` L3 components · keyboard-triage shortcuts (A / R / I / E) · service-layer audit-log writer (same transaction as mutation) · advisory-board ORCID OAuth (deferrable to Growth) · admin-grant-moderator flow.

**Depends on:** Epic 4 (flags queue feeds moderation), Epic 3 (revision publish writes to append-only table)
**Enables:** full Module #0 moderation cycle

---

### Epic 6: Public API & Developer Portal (Module #3)

Developers request an API key, consume a documented versioned REST API with proper CC-BY-SA-4.0 attribution metadata in every response, and receive 6-month deprecation notice on breaking changes.

**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38

**Key deliverables:** `api_keys` table (bcrypt hash, raw key shown once) · OpenAPI 3.1 spec finalized + CI drift gate · response envelope `{ data, meta, errors }` with `license` / `attribution` / `pinned_url` / `deprecation` meta · 9-code error taxonomy (`VALIDATION_ERROR` … `UNAVAILABLE`) · Upstash rate-limit tiers (free 10 rps + 50 000/day, partner negotiated) · `Sunset` + `Deprecation` + `Link: successor-version` headers + 12-month overlap contract · `/docs/api` developer portal · `AttributionBlock` + `ApiFilterChip` L3 components · changelog feed (extends Epic 3 feed).

**Depends on:** Epic 0 (api_keys migration, rate-limit substrate), Epic 1–3 (content + versioning + feed)
**Enables:** third-party consumers of the public data

---

### Dependency summary

```
Epic 0 ──┬─► Epic 1 ──┬─► Epic 2 ──► Epic 3 ──┐
         │            │                        │
         │            └─► Epic 4 ──► Epic 5    │
         │                                     │
         └──────────────────────────────────► Epic 6
```

Epic 6 can begin spec work early (OpenAPI finalization, developer-portal scaffolding) and integrate read-surfaces as Epics 1–3 land.

---

## Epic 0: Trustworthy Data Baseline & Platform Foundation

**Epic goal:** The AFRIK dataset passes structural integrity checks and platform observability / security / compliance wiring is operational — every subsequent feature epic ships on a trustworthy, auditable foundation.

### Story 0.1: Apply migration 007 and scaffold migrations 008–011

As a platform maintainer,
I want the pending migration 007 applied to prod and new migrations 008–011 scaffolded with empty RLS-gated table skeletons,
So that Module #0 feature epics can populate each table without schema-gating delay.

**Acceptance Criteria:**

**Given** migration `007_remove_v1_add_v2_contribution_types.sql` exists in `supabase/migrations/` and is not yet applied to prod
**When** I run `supabase db push` against prod
**Then** migration 007 applies idempotently and prior V1 contribution types are removed

**Given** migrations 008–011 do not exist
**When** I create `008_module_zero_fabric.sql`, `009_classification_status_enum.sql`, `010_assertions_triggers.sql`, `011_api_keys.sql`
**Then** they create empty table DDL for `sources`, `assertions`, `confidence_scores`, `flags`, `revisions`, `editorial_doctrine`, `user_roles`, `audit_log`, `api_keys`
**And** each new table has RLS enabled with a default `read public, write deny` policy pending per-epic override
**And** the `classification_status` enum (`consensual | contested | colonial-legacy | reconstructive`) is declared and added as a nullable column to `afrik_peuples` and `afrik_familles_linguistiques`
**And** `supabase db push --dry-run` on a fresh database applies all 008–011 without error

---

### Story 0.2: Execute pre-MVP AFRIK data cleanup

As a data steward,
I want the documented data-integrity issues resolved in the canonical AFRIK source and in Supabase,
So that the MVP launch gate passes and public fiches reflect trustworthy content.

**Acceptance Criteria:**

**Given** `PPL_TOKELAU_FAUXEX` exists as a sentinel test fiche
**When** the cleanup script runs
**Then** the fiche is removed from `dataset/source/afrik/` and from `afrik_peuples`

**Given** 8 duplicate PPL identifiers have been catalogued in the audit report
**When** I resolve them (merge or rename per the audit decision log)
**Then** no two PPL identifiers designate the same people
**And** the CI data-integrity gate (Story 0.3) reports zero duplicates

**Given** 6 fiches have `languageFamilyId` values that do not match their parent folder
**When** I correct the mismatches
**Then** every fiche's `languageFamilyId` matches its parent folder in `dataset/source/afrik/peuples/`

**Given** invalid FLG codes exist (`FLG_KWA`, `FLG_NILO_SAHARIEN`, `FLG_OMOTIC`)
**When** I remap them to valid FLGs per the editorial decision log
**Then** every referenced FLG identifier exists in `afrik_familles_linguistiques`

**Given** 5 fiches report zero population in every country of presence
**When** I correct them to sourced non-zero values
**Then** no fiche shows `total_population = 0`

**Given** filenames contain commas rather than underscores
**When** I normalize them (`,` → `_`)
**Then** every file under `dataset/source/afrik/peuples/` follows the `PPL_*.txt` naming convention

---

### Story 0.3: Automated CI data-integrity gate

As a repository maintainer,
I want a blocking GitHub Action that enforces structural data integrity on every PR and nightly,
So that no regression to FR26–FR30 reaches `main`.

**Acceptance Criteria:**

**Given** `.github/workflows/data-integrity.yml` does not exist
**When** I create it with pre-merge + nightly schedule
**Then** the workflow runs `tsx scripts/validateAfrikData.ts` extended to check: FLG folder match (FR26), PPL duplicates (FR27), population sum = 100 % per country (FR28), ISO-639-3 + ISO-3166-1 α-3 validity (FR29), source URL resolvability on verified fiches (FR30), and orphan fiches (no parent FLG)
**And** the workflow blocks merge when any check fails (FR32)

**Given** a source URL becomes unresolvable during the nightly sweep
**When** the gate detects the failure
**Then** the URL is logged to `dataset/source-url-health.log` with timestamp
**And** a hook scheduled for Epic 1 reads the log and triggers confidence recomputation (FR31)

**Given** the full workflow run
**When** CI executes on a clean baseline
**Then** it completes in ≤ 5 minutes (NFR40)

---

### Story 0.4: CI Lighthouse gate on mobile reference routes

As a performance-conscious maintainer,
I want a blocking Lighthouse CI workflow that measures mobile performance on reference routes,
So that fiches always meet the LCP ≤ 2.5 s / INP ≤ 200 ms / CLS ≤ 0.1 targets (NFR1).

**Acceptance Criteria:**

**Given** `@lhci/cli` is not yet installed
**When** I install it with `--legacy-peer-deps` and configure `.lighthouserc.js`
**Then** the config targets the mobile profile with 4G throttling on reference routes `/`, `/fr/pays/{sample}`, `/fr/peuples/{sample}`
**And** thresholds are Performance ≥ 85, Accessibility = 100, Best Practices ≥ 95 (UX-DR35)

**Given** `.github/workflows/lighthouse.yml` runs on every PR
**When** a threshold is not met
**Then** the check fails and the PR is blocked from merge
**And** the workflow comments the Lighthouse report URL on the PR

**Given** reference sample routes exist
**When** data cleanup (Story 0.2) is complete
**Then** the sample routes remain valid

---

### Story 0.5: CI axe-core and OpenAPI-diff gates

As a quality gatekeeper,
I want axe-core accessibility checks and OpenAPI drift detection running in CI,
So that WCAG violations and breaking API changes cannot reach `main` (NFR18, NFR29).

**Acceptance Criteria:**

**Given** `@axe-core/playwright` is not yet installed
**When** I install it as a dev dependency and wire `.github/workflows/a11y.yml`
**Then** axe-core runs via Playwright against Storybook stories for every L3 component
**And** the workflow fails on any serious or critical violation (zero tolerance)

**Given** the OpenAPI spec lives at `src/lib/api/openapiV2.ts`
**When** I create `.github/workflows/openapi-diff.yml`
**Then** the workflow diffs the generated spec against the last merged `main`
**And** any breaking change (removed endpoint, removed field, narrowed type) fails the check
**And** the check is overridden only when the commit message trailer contains `api-breaking: true`

---

### Story 0.6: Sentry error tracking with PII scrubbing

As an operator,
I want runtime errors captured in Sentry with EU data residency and PII scrubbed,
So that I can diagnose incidents without breaching GDPR (NFR34, AR28, AR38).

**Acceptance Criteria:**

**Given** `@sentry/nextjs` is not yet installed
**When** I run the Sentry wizard once and commit the generated config
**Then** `sentry.client.config.ts` and `sentry.server.config.ts` exist at repo root
**And** `SENTRY_AUTH_TOKEN` is set for build-step source-map uploads
**And** the Sentry project uses the EU data region

**Given** PII scrubbing is enabled
**When** an event is captured
**Then** email values are stripped and IP addresses are truncated to /24 before transport
**And** retention is 30 days with deduplication

**Given** a test error is thrown in dev mode
**When** I inspect the resulting Sentry event payload
**Then** no email address and no full IP is present

---

### Story 0.7: Plausible cookie-less analytics

As a privacy-respecting operator,
I want product analytics via Plausible (EU) with no cross-session tracking,
So that contributor interactions can be measured without cookies or identifiers (AR26, AR37, NFR42).

**Acceptance Criteria:**

**Given** Plausible is not yet integrated
**When** I configure self-hosted or EU Plausible Cloud with the script injected only after consent is granted
**Then** page views are reported without cookies, without cross-session tracking, and with DNT respected
**And** no third-party ad tracker is loaded on any page

**Given** a load-test pageview fires
**When** I check the Plausible dashboard
**Then** the event is visible with anonymous attribution only

**Given** the Plausible script is referenced in `<head>`
**When** the page loads
**Then** the tag is loaded with `defer` and `crossorigin` flags, non-render-blocking

---

### Story 0.8: Structured logger enforcement via ESLint

As a code reviewer,
I want `console.*` usage forbidden in server-side production paths via ESLint,
So that all observability flows through `@/lib/api/logger` (NFR33, AR28).

**Acceptance Criteria:**

**Given** the ESLint config at repo root is currently broken (AR41)
**When** I restore a working `eslint.config.js` as part of this story
**Then** `npm run lint` executes without a configuration error

**Given** ESLint is functional
**When** I enable `no-console` at error level with overrides for test files
**Then** any `console.log`, `console.error`, etc. in `src/api/**` or `src/app/api/**` fails lint
**And** `@/lib/api/logger` remains the sanctioned log path

**Given** residual `console.*` calls exist on the current codebase
**When** I migrate them to `logger`
**Then** `npm run lint` exits 0
**And** the rule is documented inline in `eslint.config.js`

---

### Story 0.9: Supabase Auth bootstrap with user_roles

As a platform operator,
I want admin access migrated from `ADMIN_USERNAME` / `ADMIN_PASSWORD` to Supabase Auth with role-based access,
So that contributor, moderator, admin, and advisor surfaces can be gated consistently (AR5, AR25).

**Acceptance Criteria:**

**Given** the existing admin flow uses `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars
**When** I enable Supabase Auth with magic-link + GitHub + Google OAuth providers (ORCID deferred)
**Then** `user_roles` is populated per migration 008 with enum values `reader`, `contributor`, `moderator`, `admin`, `advisor`
**And** the first admin user is seeded via script with a documented email

**Given** the middleware protects `/admin/*`
**When** a non-admin authenticated user attempts to access `/admin/*`
**Then** the request is redirected to a "forbidden" page with HTTP 403

**Given** `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars were previously required
**When** Supabase Auth is fully wired
**Then** the legacy env vars are removed from `.env.example` and the documentation references Supabase Auth only

**Given** a user signs out
**When** the logout request completes
**Then** the session cookie is invalidated and subsequent admin navigation requires re-authentication

---

### Story 0.10: Security headers + TLS hardening middleware

As a security-conscious operator,
I want CSP, HSTS, X-Content-Type-Options, and Referrer-Policy enforced via middleware,
So that all responses meet NFR6 and AR35.

**Acceptance Criteria:**

**Given** `src/middleware.ts` does not yet set security headers
**When** I extend the middleware to emit response headers on all routes
**Then** every response carries `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
**And** `X-Content-Type-Options: nosniff`
**And** `Referrer-Policy: strict-origin-when-cross-origin`
**And** a Content-Security-Policy compatible with the Next.js 16 hashed-script model (no inline scripts outside Next's own)

**Given** the app is deployed
**When** I run `curl -I` on a reference route
**Then** the above headers are present in the response

**Given** mixed-content or TLS < 1.2 is attempted
**When** the request reaches the edge
**Then** it is rejected per Vercel's default hardened TLS configuration

---

### Story 0.11: Cookie / consent surface and privacy policy (FR46)

As a visitor subject to GDPR,
I want a clear cookie and tracking notice with a granular consent surface,
So that I can meaningfully consent before analytics or non-essential storage is used (FR46, AR43, NFR42, NFR45).

**Acceptance Criteria:**

**Given** no consent surface exists today
**When** I visit any page on a fresh browser
**Then** a non-blocking consent banner appears explaining what is stored and offering accept / reject / customize options

**Given** I reject non-essential storage
**When** the page continues to load
**Then** Plausible, Sentry user context, and any non-essential cookie are not loaded
**And** the rejection is persisted per-visitor (first-party cookie or localStorage) for 12 months

**Given** the consent banner is rendered
**When** I navigate via keyboard only
**Then** the banner is focus-trappable, keyboard-dismissable, labelled with `aria-labelledby`, and carries `role="dialog"` (WCAG 2.1 AA compliant)

**Given** the privacy policy at `/fr/confidentialite` does not yet exist
**When** I create it as a static page
**Then** it lists every processor, data-retention window, user right (access, erasure), and the lawful basis for each processing activity

---

### Story 0.12: Rebrand-readiness single source of truth

As a product owner contemplating the "Africa History" rename,
I want a single config surface driving product name, canonical domain, attribution string, and OG metadata,
So that a future rebrand does not require a codebase-wide grep-and-replace (AR30).

**Acceptance Criteria:**

**Given** product-name strings are currently scattered across `layout.tsx`, translations, and attribution blocks
**When** I create `src/lib/brand.ts` (or equivalent env-driven config)
**Then** the module exports `PRODUCT_NAME`, `CANONICAL_DOMAIN`, `ATTRIBUTION_STRING`, `OG_TITLE`, `OG_DESCRIPTION`, `SITE_LOCALE`

**Given** all consumers are refactored
**When** I grep for the hard-coded string `"EthniAfrica"` under `src/` (excluding the source of truth module itself)
**Then** the search returns zero matches

**Given** `PRODUCT_NAME` is swapped via env on a preview deploy
**When** I rebuild
**Then** the entire UI reflects the new name without any source-file edit

**Given** the brand module exists
**When** I open it
**Then** the header documents the rebrand-switch procedure

---

### Story 0.13: Data residency verification

As a compliance officer,
I want every third-party processor confirmed in EU data residency,
So that AR37 holds and GDPR territorial-scope assumptions are documented.

**Acceptance Criteria:**

**Given** external processors in use are Vercel, Supabase, Upstash, Sentry, and Plausible
**When** I verify each in its dashboard or config
**Then** Vercel deploys target `fra1` (EU Frankfurt)
**And** the Supabase project is `eu-central-1`
**And** Upstash Redis is the EU region
**And** Sentry data region is EU
**And** Plausible is EU Cloud or self-hosted on EU infrastructure

**Given** the verification is complete
**When** I document the residency configuration
**Then** `docs/infra-data-residency.md` exists with a dated attestation
**And** the privacy policy (Story 0.11) references this documentation

---

## Epic 1: Source Transparency Fabric (Module #0 core)

**Epic goal:** Every fiche displays confidence score above the fold, classification status, and a tappable chain of sources tracing back to verifiable external origins. Visitors understand the editorial doctrine.

### Story 1.1: Africa History design-system tokens + typography foundation

As a design-system maintainer,
I want the Africa History design tokens (`--afh-*`) and typography stack published in Storybook,
So that every L3 component can reference a single source of truth for color / type / space / elevation / motion / radii (UX-DR1–6).

**Acceptance Criteria:**

**Given** `--country-*` tokens currently exist under `src/styles/country-tokens.css`
**When** I create `src/styles/tokens/` split by concern (`color.css`, `type.css`, `space.css`, `elevation.css`, `motion.css`, `radius.css`) using `--afh-*` prefix
**Then** all new tokens are available across the app
**And** `--country-*` variables remain as aliases for one release

**Given** L2 semantic tokens do not yet exist
**When** I add confidence-tier (`--afh-conf-high/mid/low`), classification-state (`--afh-classification-stable/contested/disputed`), source-tier (`--afh-source-primary/secondary/ai-flagged`), flag-state (`--afh-flag-open/resolved`) tokens plus three density profiles (`--afh-density-reading/moderation/developer`)
**Then** components reference them by semantic name only

**Given** Fraunces + Nunito Sans are not yet installed
**When** I add them via `next/font/google` in `src/app/layout.tsx` with variables `--font-fraunces` and `--font-nunito-sans`
**Then** the 9-role type scale (`hero / h1 / h2 / h3 / body / small / caption / micro / nano`) is available at mobile → desktop sizes

**Given** `prefers-reduced-motion: reduce`
**When** motion tokens render
**Then** all durations resolve to `0.01 ms` opacity-only (no transforms)

**Given** color `--afh-error` exists
**When** a component whose name does not include `Error`, `Invalid`, or `Broken` references it
**Then** a lint rule error is raised (UX-DR49 rule 3)

**Given** Storybook is configured
**When** I add MDX pages under `src/stories/design-system/` (Color / Type / Spacing / Elevation / Motion / Radii)
**Then** `npm run storybook` renders them under a "Design System" category
**And** the Storybook build deploys publicly at `/design-system`

---

### Story 1.2: Database schema for Module #0 fabric (migrations 008 + 009 + 010)

As a platform maintainer,
I want `sources`, `assertions`, `confidence_scores`, and `editorial_doctrine` tables populated with full DDL plus the classification enum,
So that Module #0 business logic can read and write structured verification data (AR2, AR32).

**Acceptance Criteria:**

**Given** migration 008 has an empty skeleton for `sources`
**When** I add full DDL
**Then** `sources(id, title, author, year, tier ∈ {primary|secondary|tertiary|ai-enriched}, url, page, notes, added_at, verified_at)` is defined with indexes on `tier` and `verified_at`

**Given** migration 008 skeleton for `assertions`
**When** I add DDL
**Then** `assertions(id, entity_type, entity_id, field_path, statement, position, source_ids[], confidence_level, authored_at, authored_by, superseded_by)` exists with index on `(entity_type, entity_id)` and `position` nullable for non-contested

**Given** migration 008 skeleton for `confidence_scores`
**When** I add DDL
**Then** `confidence_scores(entity_type, entity_id, score, source_count, avg_source_quality, last_human_audit_at, open_flag_count, recomputed_at)` exists with unique constraint on `(entity_type, entity_id)`

**Given** migration 009 declares the `classification_status` enum
**When** migration 009 runs
**Then** the column is added to `afrik_peuples` and `afrik_familles_linguistiques` as nullable with a `CHECK` constraint on the enum values

**Given** migration 010 skeleton for `editorial_doctrine`
**When** I add DDL
**Then** `editorial_doctrine(id, slug, title, mdx_source, version, published_at, superseded_at)` exists with a unique index on `(slug, version)`

**Given** RLS is enabled on all new tables
**When** an anonymous client attempts `SELECT`
**Then** the query succeeds
**And** when an anonymous client attempts `INSERT` / `UPDATE` / `DELETE`, the query fails

**Given** a fresh database
**When** I run `supabase db push`
**Then** migrations 008–010 apply without error

---

### Story 1.3: Postgres triggers — assertions required + confidence recomputation

As a data-integrity enforcer,
I want Postgres triggers enforcing "no demographic or classification change without an `assertions` row" plus automatic confidence recomputation on revision / flag events,
So that every fact on the site is source-backed and the confidence score stays derivable (AR3, AR15).

**Acceptance Criteria:**

**Given** an `UPDATE` to any demographic or classification field on `afrik_peuples` (e.g., `total_population`, `classification_status`)
**When** no row exists in `assertions` referencing that entity plus `field_path`
**Then** the UPDATE is rejected with a clear error message naming the missing field path

**Given** `recompute_confidence(entity_type TEXT, entity_id UUID)` does not yet exist
**When** I create it as a PL/pgSQL function
**Then** it reads all current `assertions` plus `sources` plus open flag count plus `last_human_audit_at` for the entity
**And** it upserts the derived row into `confidence_scores`

**Given** a new row is inserted into `revisions`
**When** the insert trigger fires
**Then** `recompute_confidence` is called for the affected entity

**Given** an existing row in `flags` transitions into or out of `open`
**When** the trigger fires
**Then** `recompute_confidence` runs for the affected entity

**Given** a nightly scheduled job
**When** it runs
**Then** `recompute_confidence` fires for every entity in `afrik_peuples` + `afrik_familles_linguistiques`

**Given** a confidence recomputation completes
**When** I read `confidence_scores.recomputed_at`
**Then** the value is the current timestamp

**Given** a migration script attempts to bulk-update demographic data without inserting `assertions` rows
**When** the script runs
**Then** the transaction is rejected (no override without explicit DBA action, logged in `audit_log`)

---

### Story 1.4: N+1 batch data helpers for Module #0 reads

As a backend maintainer,
I want batch-read helpers for sources, confidence, flag-summary, and latest-revision data,
So that fiche routes avoid N+1 queries (AR17).

**Acceptance Criteria:**

**Given** an array of `peopleIds`
**When** I call `getSourcesMap(peopleIds)`
**Then** the function performs exactly one SQL query and returns `Map<peopleId, Source[]>`

**Given** the same input
**When** I call `getConfidenceMap(peopleIds)`
**Then** one SQL query returns `Map<peopleId, ConfidenceScore>`

**Given** the same input
**When** I call `getFlagsSummaryMap(peopleIds)`
**Then** one SQL query returns `Map<peopleId, { openCount, totalCount }>`

**Given** the same input
**When** I call `getLatestRevisionMap(peopleIds)`
**Then** one SQL query returns `Map<peopleId, Revision>`

**Given** a unit test with 50 people IDs
**When** any of the four helpers is called
**Then** the Supabase query log shows exactly one query, not 50

**Given** the helpers live under `src/lib/supabase/queries/afrik/`
**When** imported
**Then** they conform to the existing `logger` pattern for errors (no `console.*`)

---

### Story 1.5: `ConfidenceChip` L3 component

As a reader,
I want a tappable confidence chip at the end of each assertion showing the confidence score, source count, and audit date,
So that I can see and trust the provenance of every fact inline (FR6, FR9, FR11, UX-DR8, UX-DR19, UX-DR50).

**Acceptance Criteria:**

**Given** an assertion with `confidence_score`, `source_count`, and `last_human_audit_at`
**When** `ConfidenceChip` renders
**Then** it displays "X % · N sources · vérifié YYYY-MM-DD" as a typographic inline pill — no emoji, no icon

**Given** variants `inline` (default), `hero`, and `contested`
**When** each is rendered
**Then** sizing follows design-system spacing tokens and the `contested` variant uses typographic distinction only (no red, no alarm, no gauge)

**Given** the chip is keyboard-focused
**When** I press Enter or Space
**Then** `SourceChainSheet` opens within 200 ms INP

**Given** touch input
**When** I tap the chip (target ≥ 44 × 44 px via wrapper padding even when visual pill is smaller)
**Then** the sheet opens

**Given** VoiceOver / NVDA focuses the chip
**When** announcement fires
**Then** `aria-label` reads exactly: "ouvrir la chaîne de sources pour cette assertion (confiance X %, N sources, vérifiée le [long French date])"

**Given** the very first chip rendered in a session
**When** the fiche loads
**Then** a one-shot subtle pulse animation plays honoring `prefers-reduced-motion: reduce` (resolves to 0.01 ms) and never repeats in subsequent sessions

**Given** chip data is missing or null
**When** the chip would render
**Then** a "voir les sources" text link fallback is rendered instead — never a broken state

**Given** the gzipped chip bundle
**When** measured in CI
**Then** it is ≤ 2 KB (UX-DR46)

**Given** a Storybook story for the chip
**When** the a11y workflow (Story 0.5) runs
**Then** zero axe-core serious / critical violations are reported

---

### Story 1.6: `ClassificationBadge` L3 component

As a reader,
I want an inline badge displaying the classification status of a contested / colonial-legacy / reconstructive people or family,
So that I can immediately see how the identity category is framed editorially (FR23, UX-DR9).

**Acceptance Criteria:**

**Given** `classification_status ∈ {consensual, contested, colonial-legacy, reconstructive}`
**When** `ClassificationBadge` renders
**Then** it displays the French label paired with an icon (no emoji) in a warm hue (`--afh-earth` or `--afh-terracotta`) — never red

**Given** `status = consensual`
**When** rendered
**Then** the badge is visually neutral or omitted per editorial rule

**Given** `status ∈ {contested, colonial-legacy}`
**When** rendered
**Then** a `DoctrineLinkCard` (Story 1.8) is paired inline or in the section footer

**Given** color is disabled (monochrome print or color-blindness simulation)
**When** rendered
**Then** the status remains distinguishable via icon + text (color is never the sole signal)

**Given** a Storybook story at 430 / 720 / 800 / 1024 px
**When** `npm run build-storybook` runs
**Then** every breakpoint renders without overflow and passes axe-core

---

### Story 1.7: `SourceChainSheet` L3 component

As a reader,
I want a lazy-loaded sheet that opens from any `ConfidenceChip` showing the full chain of sources, confidence explanation, and flag CTA,
So that I can trace any assertion to its verifiable origin (FR7, FR8, FR11, FR24, UX-DR10, UX-DR19).

**Acceptance Criteria:**

**Given** viewport width `< 1024 px`
**When** the sheet opens
**Then** it renders as a bottom sheet (full-width, max 85 vh, swipe-down dismiss)

**Given** viewport `720–1199 px`
**When** the sheet opens
**Then** it renders as a right-side sheet 420 px wide

**Given** viewport `≥ 1200 px`
**When** the sheet opens
**Then** it renders as a right-side sheet 480 px wide

**Given** the sheet is open
**When** I inspect its content
**Then** sections appear in strict order: (1) disputed assertion quoted verbatim (Fraunces italic, left-border), (2) confidence block with explainer sentence, (3) open-flag banner if any, (4) source list grouped by tier (`primary / secondary / tertiary / ai-flagged`) with title + author + year + page + resolvable URL + tier badge, (5) revision link if applicable, (6) `FlagTarget` shell button at bottom ("signaler cette assertion", `--afh-terracotta`, dispatches to placeholder Epic 4 handler), (7) cite-this-assertion affordance appears only after 4 s dwell

**Given** a contested assertion with multiple `assertions.position` rows
**When** section 4 renders
**Then** positions are grouped with a separate source list per position (FR24 multi-perspective)

**Given** the opening animation
**When** the sheet appears
**Then** it plays 200 ms slide + crossfade, honoring `prefers-reduced-motion: reduce`

**Given** the sheet is open
**When** I press Esc / swipe down / tap the scrim / press Android hardware back
**Then** it dismisses identically and returns focus to the triggering chip

**Given** accessibility
**When** the sheet opens
**Then** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` point to the assertion excerpt, focus is trapped, background receives `aria-hidden="true"` + `inert`

**Given** the sheet is open
**When** I inspect the canonical URL
**Then** the open state is captured via anchor (e.g. `/fr/peuples/seereer#chip-paragraph-3`) so sharing the URL reopens the sheet

**Given** a source URL is flagged broken by the nightly health-check
**When** rendered in the source list
**Then** the URL is shown struck-through with a calm "lien non résolu — signalé YYYY-MM-DD" badge (never hidden, never alarm-colored)

**Given** the sheet JS is lazy-loaded on chip tap
**When** measured in CI
**Then** its gzipped size is ≤ 8 KB and is not included in the initial fiche bundle (UX-DR46)

**Given** the sheet surface targets WCAG AAA
**When** axe-core runs
**Then** body-text contrast ≥ 7 : 1 and large-text contrast ≥ 4.5 : 1 are verified

---

### Story 1.8: `DoctrineLinkCard` L3 component

As a reader encountering a sensitive assertion,
I want a static card at the section footer linking to the current editorial doctrine version in force,
So that I understand how contested / colonial terms are editorially framed (FR25, UX-DR15).

**Acceptance Criteria:**

**Given** a fiche section with a `contested` or `colonial-legacy` classification
**When** `DoctrineLinkCard` renders in the section footer
**Then** it displays a warm-background card (`--afh-bg-warm`) with static French copy explaining the doctrine and a text link to the doctrine page

**Given** the card's pinned-version target (FR25)
**When** the consuming fiche has a `doctrine_version` reference on its revision
**Then** the link resolves to `/fr/doctrine/{slug}@v{n}` once Epic 3 pinned-URL routing lands; until then, the link resolves to the live doctrine page with an inline note "version en vigueur au moment de la publication — historique disponible prochainement"

**Given** the card has a Storybook story
**When** axe-core runs
**Then** zero serious / critical violations are reported

---

### Story 1.9: Module #0 public read API endpoints

As a future API consumer,
I want `/v2/sources`, `/v2/sources/{id}`, `/v2/confidence/{entityType}/{entityId}`, and `/v2/doctrine` endpoints,
So that source and confidence metadata is programmatically accessible alongside fiche content (FR7, FR8, FR11, AR8, AR10).

**Acceptance Criteria:**

**Given** the 3-layer pattern (`route → handler → service`)
**When** I create `src/app/api/v2/sources/route.ts`, `src/app/api/v2/sources/[id]/route.ts`, `src/app/api/v2/confidence/[entityType]/[entityId]/route.ts`, `src/app/api/v2/doctrine/route.ts`
**Then** each route validates params (Zod schema under `src/api/v2/schemas/`), calls the corresponding handler, calls the service, and returns via `createApiResponse` / `createApiError`

**Given** the response envelope
**When** I GET any of the new endpoints
**Then** the JSON payload matches `{ data, meta: { license: "CC-BY-SA-4.0", attribution, confidence?, pinned_url? }, errors: [] }`

**Given** edge-caching semantics
**When** I GET `/v2/sources`
**Then** the response carries `Cache-Control: s-maxage=86400, immutable` (AR18)

**Given** `/v2/confidence/{entityType}/{entityId}`
**When** queried
**Then** the response payload includes `score`, `source_count`, `avg_source_quality`, `last_human_audit_at`, `open_flag_count`, `recomputed_at`

**Given** `/v2/doctrine` without query params
**When** called
**Then** it returns current versions of all doctrine slugs

**Given** the OpenAPI spec at `src/lib/api/openapiV2.ts`
**When** I add the new endpoints
**Then** the spec includes their path + response schema + error taxonomy (AR9)
**And** the CI OpenAPI-diff gate (Story 0.5) passes

**Given** unit tests under `src/api/v2/__tests__/` and `src/app/api/v2/__tests__/`
**When** I run `npm run api-tests`
**Then** all new endpoint tests pass (route + handler + service for each)

---

### Story 1.10: Editorial doctrine seed + MDX rendering page

As a visitor,
I want to read the public editorial doctrine at `/fr/doctrine/[slug]`,
So that I understand the editorial methodology governing what I read (FR22, AR31, AR4).

**Acceptance Criteria:**

**Given** `@next/mdx` + `@mdx-js/react` + `remark-gfm` are not yet installed
**When** I install them with `--legacy-peer-deps` and configure them in `next.config.ts`
**Then** `.mdx` sources render as JSX pages

**Given** the `editorial_doctrine` table (Story 1.2)
**When** I seed initial rows for slugs `endonymes-vs-exonymes`, `classifications-contestees`, `heritage-colonial`, `topics-sensibles` with `version = 1`
**Then** each row carries `title`, `mdx_source`, `published_at = NOW()`

**Given** the page route at `src/app/[lang]/doctrine/[slug]/page.tsx`
**When** I request `/fr/doctrine/classifications-contestees`
**Then** the current doctrine version renders with its `mdx_source`
**And** a visible version label reads "v1 · publiée le [long French date]"

**Given** a slug does not exist
**When** requested
**Then** a calm 404 page renders (not an alarm state)

**Given** the page has a Storybook or page-level test
**When** axe-core runs
**Then** zero serious / critical violations are reported

**Given** AR34 requires advisory-board sign-off recorded in a public changelog
**When** a doctrine update ships at MVP
**Then** a changelog link renders on the page (MVP: static link to the relevant git commit; full changelog UI deferred to Growth)

---

### Story 1.11: Unaudited-fiche disclaimer + last-audit tracking

As a reader,
I want a visible disclaimer on fiches that have never been audited or whose last audit is > 18 months old,
So that I can distinguish audited from unaudited content at a glance (FR9, FR10, AR34).

**Acceptance Criteria:**

**Given** a fiche has `confidence_scores.last_human_audit_at = NULL`
**When** the fiche renders
**Then** a disclaimer banner appears above the fold stating "fiche non auditée — lire avec précaution"

**Given** `last_human_audit_at` is older than 18 months
**When** the fiche renders
**Then** the disclaimer reads "dernière vérification : [long French date] · à re-vérifier"

**Given** the disclaimer banner
**When** rendered
**Then** it uses `--afh-bg-warm` background (not alarm), includes `role="region"` and `aria-label`, and is dismissible per-fiche with `localStorage` persistence

**Given** an audit date > 18 months on an otherwise-verified assertion
**When** the chip + sheet render
**Then** the "à re-vérifier" caption appears inside the sheet (Story 1.7), not on the chip itself (UX-DR50)

**Given** a moderator publishes a revision with an audit flag (Epic 5)
**When** the confidence-recomputation trigger (Story 1.3) fires
**Then** `last_human_audit_at` is updated and the banner re-renders on next request

---

### Story 1.12: Editorial CI rules — endonym enforcement + classification source-count

As a repository maintainer,
I want CI rules enforcing "every `confidence ≥ medium` fiche has an `autonym`" and "every `contested` / `colonial-legacy` fiche cites ≥ 2 sources plus embeds a `DoctrineLinkCard`",
So that decolonial-posture rules are mechanically enforced (AR32, AR33).

**Acceptance Criteria:**

**Given** a fiche has no `autonym`
**When** the CI data-integrity gate (Story 0.3) runs
**Then** the fiche is allowed at `confidence < medium` and flagged when it reaches `confidence ≥ medium`

**Given** a fiche's `classification_status ∈ {contested, colonial-legacy}`
**When** the CI gate inspects its `assertions` rows
**Then** it asserts `sources.length ≥ 2` aggregated across the fiche's assertions and blocks merge otherwise

**Given** the same fiche
**When** the CI gate inspects the rendered page (via snapshot test or component unit test)
**Then** it asserts a `DoctrineLinkCard` is present in the section footer

**Given** a violation is detected
**When** CI fails
**Then** the PR annotation identifies the offending fiche slug and the specific rule that failed

---

## Epic 2: People Fiche Reading Experience (Module #1)

**Epic goal:** Visitors discover, search, and read complete endonym-first people fiches with full decolonial-posture compliance — accessible across mobile / tablet / desktop, LCP ≤ 2.5 s on 4G.

### Story 2.1: `AutonymExonymHeading` L3 component

As a reader,
I want headings that present the endonym (autonym) first in its original language with proper pronunciation semantics, followed by the exonym,
So that endonym primacy is enforced visually and by assistive technology (UX-DR7, FR3).

**Acceptance Criteria:**

**Given** props `{ autonym, autonymIso639_3, exonym?, alternateNames?, ipa? }`
**When** the component renders with `variant="hero"`
**Then** the autonym displays in Fraunces weight 900 with a `lang={autonymIso639_3}` attribute and the exonym displays in Nunito Sans weight 500 beside it

**Given** `variant="inline"` or `variant="card"`
**When** rendered
**Then** typographic weights scale per the design-system type roles (Story 1.1) while `lang` attribute and endonym-first order are preserved

**Given** the `autonym` prop is missing
**When** the component is compiled
**Then** the TypeScript build fails (prop is required)

**Given** `alternateNames` contains > 1 entry
**When** rendered
**Then** only the first is visible and a `+N autres` affordance expands the rest (keyboard + touch accessible)

**Given** `ipa` is provided
**When** rendered
**Then** an opt-in IPA pronunciation appears adjacent to the autonym with `aria-label` announcing it as phonetic

**Given** an ESLint rule enforcing "no bare people/language name strings outside `AutonymExonymHeading`"
**When** I add a rule to `eslint.config.js`
**Then** any raw people-name string literal in `src/components/people/**` or `src/components/country/**` fires a lint error (decolonial-posture rule UX-DR49 #1)

**Given** a Storybook story at 430 / 720 / 1200 px
**When** axe-core runs
**Then** zero serious / critical violations are reported
**And** VoiceOver / NVDA pronounces the autonym using the `lang` attribute

---

### Story 2.2: `peopleDataTransformer`

As a frontend engineer,
I want a pure transformer mapping backend `PeopleDetail` to a structured `PeoplePageData` shape,
So that section components receive type-safe, UI-ready data without per-component mapping (AR42).

**Acceptance Criteria:**

**Given** `src/lib/peopleDataTransformer.ts` does not exist
**When** I create it alongside unit tests at `src/lib/__tests__/peopleDataTransformer.test.ts`
**Then** the module exports `transformPeopleData(raw: PeopleDetail): PeoplePageData`

**Given** a canonical `PeopleDetail` fixture
**When** `transformPeopleData` runs
**Then** it returns a `PeoplePageData` object with 8 section payloads: `hero`, `origin`, `language`, `history`, `culture`, `relatedPeoples`, `countries`, `sources`

**Given** nested mapping needs
**When** I inspect the module
**Then** nine named transform helpers (one per section plus two utility helpers) are exported and unit-tested independently

**Given** a `PeopleDetail` with missing or nullable fields
**When** transformed
**Then** each section payload has sensible defaults (empty arrays, nulls) — never throws

**Given** the component `PeopleDetailViewV2` (Story 2.3)
**When** it imports `transformPeopleData`
**Then** the returned data shape type-checks under `strict: false` and covers every field used by the 8 section components

**Given** a Vitest suite targeting the transformer
**When** executed
**Then** ≥ 30 tests pass covering each helper plus edge cases (mirrors Carte vivante transformer test density)

---

### Story 2.3: `PeopleDetailViewV2` orchestrator + 8 section components

As a reader,
I want a scrollable 8-section people fiche layout following the Carte vivante pattern,
So that I read a complete, coherent narrative from identity through culture to sources (FR3, UX-DR17).

**Acceptance Criteria:**

**Given** `src/components/people/` does not yet contain a V2 orchestrator
**When** I create `PeopleDetailViewV2.tsx` plus section components `PeopleHero`, `PeopleOriginBlock`, `PeopleLanguageSection`, `PeopleHistoryTimeline`, `PeopleCultureGrid`, `PeopleRelatedPeoplesSection`, `PeopleCountriesSection`, `PeopleSourcesFooter`
**Then** the orchestrator imports `transformPeopleData` (Story 2.2) and passes each section its typed payload

**Given** the orchestrator renders
**When** scroll position is 0
**Then** `PeopleHero` renders above the fold with `AutonymExonymHeading` variant `hero` plus a fiche-level `ConfidenceChip` variant `hero` plus a flag CTA (dispatches to Epic 4 handler shell)

**Given** the fiche mounts
**When** measured server-side
**Then** every section renders via SSR with no client-only blockers (UX-DR47 progressive enhancement)

**Given** a section has no data
**When** rendered
**Then** the section gracefully omits itself or renders a calm empty-state per UX-DR31

**Given** mobile 430 px viewport
**When** the fiche renders
**Then** layout fits without horizontal scroll and breakpoints escalate to 720 px tablet and 1200 px desktop (reading-surface `max-width: 800 px`) (UX-DR5)

**Given** each section has a Storybook story at 430 / 720 / 1200 px
**When** `npm run build-storybook` runs
**Then** all stories render and axe-core reports zero serious / critical violations per story

---

### Story 2.4: Direction D prose-with-inline-chips layout

As a reader,
I want long-form flowing prose with a `ConfidenceChip` at the end of each verified paragraph,
So that I read a coherent narrative while every assertion is traceable inline (FR3, FR6, UX-DR18, UX-DR19).

**Acceptance Criteria:**

**Given** `PeopleHistoryTimeline`, `PeopleOriginBlock`, `PeopleCultureGrid`, `PeopleLanguageSection` (Story 2.3)
**When** each renders a verified paragraph
**Then** a `ConfidenceChip` (Story 1.5) appears at the end of the paragraph — one chip per paragraph by default (UX-DR50)

**Given** a paragraph contains a contested or politically sensitive claim
**When** authored with per-sentence granularity
**Then** multiple chips may appear inline per sentence (editorial decision)

**Given** progressive hydration
**When** the page SSR response arrives
**Then** the prose renders immediately with chip placeholders
**And** chips hydrate as a second wave after the prose is interactive (protects LCP)

**Given** chip hydration fails or the chip data is missing
**When** the page reaches interactive state
**Then** the chip falls back to a static "voir les sources" text link that still opens `SourceChainSheet` on click

**Given** the prose uses reading-surface density tokens
**When** rendered
**Then** line height ≥ 1.6 and line length stays within 65–75 ch (UX-DR2)

**Given** Lighthouse runs on `/fr/peuples/{sample}`
**When** the page loads on mobile 4G profile
**Then** LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (NFR1, UX-DR46)

---

### Story 2.5: Postgres FTS search infrastructure

As a backend engineer,
I want `search_vector` `tsvector` columns plus GIN indexes on `afrik_peuples` and `afrik_pays`,
So that search queries use French-language full-text ranking at scale (AR22, FR2, NFR4).

**Acceptance Criteria:**

**Given** `afrik_peuples` has no `search_vector` column today
**When** I add a new migration `012_search_vectors.sql`
**Then** it adds generated `search_vector tsvector` columns on `afrik_peuples` and `afrik_pays`
**And** the generation expression concatenates `name || endonyms || alt_names` using `to_tsvector('french', ...)`

**Given** the migration
**When** applied
**Then** a `GIN` index is created on each `search_vector` column

**Given** a query `SELECT ... WHERE search_vector @@ websearch_to_tsquery('french', $1)`
**When** measured at 1 000-fiche scale
**Then** the query returns in ≤ 500 ms p95 (NFR4)

**Given** French-stemmed queries (e.g., `"kikongo"` matches `"kikongos"`)
**When** executed
**Then** matches are returned (French language dictionary applied)

**Given** the migration runs against prod data
**When** applied
**Then** existing rows are backfilled automatically via the generated column expression

---

### Story 2.6: `/v2/search` API endpoint

As a frontend engineer,
I want a `/v2/search` endpoint returning ranked people + country results,
So that the public search page delivers FR2 with ranking by relevance plus confidence boost (FR2, AR10, NFR4).

**Acceptance Criteria:**

**Given** the 3-layer pattern
**When** I create `src/app/api/v2/search/route.ts` plus handler plus service
**Then** the route validates `q`, `limit`, `offset`, `classificationStatus?`, `minConfidence?`, `sinceVerifiedAfter?` params

**Given** a query string `q`
**When** the handler runs
**Then** it invokes `websearch_to_tsquery('french', q)` and ranks results by `ts_rank_cd` multiplied by a confidence boost (`score/100`)

**Given** the endpoint returns
**When** I inspect the envelope
**Then** the response matches `{ data: { peoples: [...], countries: [...], total }, meta: { license, attribution }, errors: [] }`

**Given** a rate-limited client exceeds the anonymous budget
**When** the 61st request in a minute arrives
**Then** the response is `429 RATE_LIMITED` with `Retry-After`, `X-RateLimit-*` headers (AR11)

**Given** the OpenAPI spec
**When** I register the endpoint
**Then** the spec includes the path + all params + response schema + error codes and OpenAPI-diff CI gate (Story 0.5) passes

**Given** unit tests under `src/api/v2/__tests__/search.test.ts`
**When** I run `npm run api-tests`
**Then** tests cover happy path, empty query, invalid params, filter combinations, rate-limit response — all pass

**Given** performance measurement
**When** 50 concurrent queries hit the endpoint at 1 000-fiche scale
**Then** p95 latency ≤ 500 ms (NFR4)

---

### Story 2.7: `/fr/recherche` search page

As a visitor,
I want a public search page with visible filter chips, auto-suggest, and shareable URLs,
So that I can find fiches by endonym, exonym, or historical name quickly (FR2, UX-DR32).

**Acceptance Criteria:**

**Given** the route `src/app/[lang]/recherche/page.tsx` does not exist
**When** I create it
**Then** the page renders a text input plus visible submit button (not instant-search) plus results list

**Given** the input has ≥ 2 characters
**When** I type
**Then** up to 6 auto-suggest entries appear from `/v2/search?limit=6`
**And** no search history is retained beyond the session (privacy default)

**Given** filters `classificationStatus`, `minConfidence`, `region`
**When** applied
**Then** they render as dismissible chips always visible at the top of results (never behind an accordion)
**And** a "Tout effacer" text link sits to the right of the chip row

**Given** the URL
**When** filters are active
**Then** the URL reflects the filter state so the view is shareable

**Given** no results
**When** the empty-state renders
**Then** it shows calm French copy with check-spelling suggestion plus "Parcourir par famille" plus "Signaler donnée manquante" (pre-populates the flag form with the query)

**Given** a sort control
**When** rendered
**Then** it is a dropdown (not chip row)

**Given** keyboard accessibility
**When** I press `/` from any page
**Then** focus moves to the search input (progressive enhancement)

**Given** axe-core runs on `/fr/recherche`
**When** checked
**Then** zero serious / critical violations are reported

---

### Story 2.8: Navigation shell + breadcrumbs + keyboard shortcuts

As a visitor,
I want a consistent top-bar navigation plus breadcrumbs showing the AFRIK hierarchy on every fiche,
So that I can orient myself and move between entities with keyboard or touch (FR4, UX-DR29, UX-DR40).

**Acceptance Criteria:**

**Given** the existing top bar uses a hamburger menu
**When** I refactor `DesktopNavBar` + `MobileMenu`
**Then** mobile shows a compact top bar (logo + FLG dropdown + search icon) — no hamburger
**And** desktop shows an inline horizontal nav: Pays · Peuples · Familles · À propos · Doctrine · API

**Given** a fiche page renders
**When** it loads
**Then** breadcrumbs appear inline below the hero exposing `Familles → FLG_BANTU → Kikongo → Bakongo → RDC` (small type, `--afh-text-soft`)

**Given** breadcrumbs
**When** rendered on the home page, doctrine pages, or moderator pages
**Then** they do not appear

**Given** keyboard shortcut `/`
**When** pressed from any page
**Then** focus moves to the search input

**Given** keyboard shortcut `⌘K` / `Ctrl+K`
**When** pressed
**Then** it routes to `/fr/recherche` (global search)

**Given** keyboard shortcuts `g p` (peoples index) and `g f` (families index)
**When** pressed sequentially on desktop
**Then** navigation occurs to the respective index

**Given** `Escape`
**When** pressed while a sheet is open
**Then** the sheet dismisses (chained to Story 1.7)

**Given** a `?` modal lists shortcuts
**When** a user presses `?`
**Then** a dismissible modal displays the shortcut cheatsheet

**Given** scroll position
**When** a sheet dismisses
**Then** scroll position is preserved

**Given** browser back button
**When** I press it after opening a sheet
**Then** the sheet closes before the page navigates (sheets add history entries)

---

### Story 2.9: Browse-index pages — familles, peuples, pays

As a visitor,
I want index pages listing all linguistic families, peoples, and countries,
So that I can browse the AFRIK corpus by hierarchy without a search query (FR1).

**Acceptance Criteria:**

**Given** `/fr/familles`, `/fr/peuples`, `/fr/pays` index pages do not yet follow V2 conventions
**When** I update them to consume `useListView` hook (`src/hooks/use-list-view.ts`) and V2 AFRIK queries
**Then** each renders a sortable, filterable list with links to fiches

**Given** the index pages
**When** rendered
**Then** they use SSG with ISR (`revalidate: 3600`, per AR18) and cache-tag invalidation on moderation commits

**Given** a list item
**When** rendered
**Then** it shows `AutonymExonymHeading` variant `card` plus `ConfidenceChip` variant `inline` plus `ClassificationBadge` where applicable

**Given** the family index at `/fr/familles`
**When** rendered
**Then** entries show FLG code + exonym + endonym + linked peoples count

**Given** the peoples index at `/fr/peuples`
**When** rendered
**Then** entries show endonym + exonym + parent FLG (linked) + country chips

**Given** the countries index at `/fr/pays`
**When** rendered
**Then** entries show flag emoji + country name + ISO-3166-1 α-3 + peoples count (links to country fiche)

**Given** each index page
**When** axe-core runs
**Then** zero serious / critical violations are reported
**And** Lighthouse mobile perf ≥ 85 is maintained

---

### Story 2.10: Related-entities navigation from fiche

As a reader,
I want every fiche to link to its related entities (linguistic family, languages spoken, countries of presence, related peoples) and back,
So that I can follow the AFRIK hierarchy from any starting point (FR4).

**Acceptance Criteria:**

**Given** a people fiche
**When** I inspect `PeopleRelatedPeoplesSection`, `PeopleLanguageSection`, `PeopleCountriesSection` (Story 2.3)
**Then** each section renders linked entities with `AutonymExonymHeading` variant `card`

**Given** I navigate from a people fiche to a related country
**When** the country fiche loads
**Then** its peoples list links back to the original people — navigation is symmetric

**Given** a people fiche links to its family
**When** I navigate
**Then** the family page lists all peoples in that family with return-link structure

**Given** breadcrumbs from Story 2.8
**When** I navigate between related entities
**Then** breadcrumbs update to reflect the current path within the AFRIK hierarchy

**Given** a fiche has no related entities in a category
**When** rendered
**Then** the corresponding section gracefully omits itself (no empty "Peuples associés" with nothing inside)

---

### Story 2.11: Loading / empty / error / 404 surfaces

As a visitor,
I want calm, dignified loading, empty, and error states across every reading surface,
So that failure is legible and never alarm-inducing (UX-DR31, UX-DR47).

**Acceptance Criteria:**

**Given** a page is loading client-side
**When** the skeleton renders
**Then** it uses `--afh-bg-warm` background with a subtle shimmer respecting `prefers-reduced-motion: reduce`
**And** no centered spinner appears on a blank page (text-first degradation preferred)

**Given** a 404 response
**When** the page renders
**Then** the message is calm French ("Fiche introuvable") with the fiche-URL pattern explained, a search affordance, and a "Signaler une URL cassée" CTA
**And** no sad-face, emoji, or illustration appears

**Given** a 500 response
**When** the page renders
**Then** it displays "Une erreur est survenue" plus a retry button plus a copyable error reference for support

**Given** the network is offline (PWA degradation — MVP-optional)
**When** a fiche is cached
**Then** the reading surface renders the last-cached prose with a banner "hors-ligne — affichage d'une version en cache"

**Given** an empty search state
**When** no results match
**Then** calm French copy appears with check-spelling and browse-by-FLG affordances (as per Story 2.7)

**Given** any empty state
**When** rendered
**Then** it uses `--afh-text-soft` on `--afh-bg-warm` and no exclamation marks, no "Oops!", no emoji

---

### Story 2.12: Reading-surface performance + accessibility integration validation

As a release gatekeeper,
I want Lighthouse + axe-core + manual a11y testing to pass on reference fiche routes,
So that FR43 + FR44 + NFR1 + UX-DR35 + UX-DR42–45 are demonstrably met before Epic 2 closes.

**Acceptance Criteria:**

**Given** reference routes `/`, `/fr/pays/{sample}`, `/fr/peuples/{sample}` (and the new index pages from Story 2.9)
**When** Lighthouse CI (Story 0.4) runs on mobile 4G
**Then** Performance ≥ 85, Accessibility = 100, Best Practices ≥ 95 on each route

**Given** Storybook stories for every new L3 component in Epic 2
**When** the a11y CI workflow (Story 0.5) runs
**Then** zero axe-core serious / critical violations are reported per story

**Given** a keyboard-only user
**When** I execute a full journey (browse → search → fiche → related → back) on mobile, tablet, and desktop
**Then** every interactive element is reachable with Tab, actionable with Enter/Space, and dismissable with Esc where applicable — no keyboard trap anywhere

**Given** VoiceOver (iOS Safari) + TalkBack (Android Chrome) + NVDA (Windows Firefox)
**When** the defining interaction (chip → sheet) is tested in French
**Then** announcements are correct and the flow completes without assistive-tech blockers

**Given** 200 % text zoom on mobile / tablet / desktop
**When** applied to fiche + search + index pages
**Then** layout reflows without horizontal scroll

**Given** `prefers-reduced-motion: reduce`
**When** enabled
**Then** no transform-based animation plays anywhere on the reading surface

**Given** 430 / 720 / 1200 px screenshots
**When** the Epic 2 branch is ready
**Then** screenshots are committed under the PR description per UX-DR45 checklist items 5 and 6

**Given** real-device matrix (UX-DR42)
**When** tested on Samsung Galaxy A14 on 4G (reference device) + Pixel 7 + iPhone SE + iPhone 14
**Then** every flow works without regression
**And** results are documented in the PR description

---

## Epic 3: Pinned Versions, Revision History & Citation

**Epic goal:** Users cite stable pinned URLs (`/{lang}/{entity}/{slug}@v{n}`) that permanently serve content as of a given revision; users browse revision history with transparent changelogs; auto-generated citation blocks carry correct CC-BY-SA-4.0 attribution.

### Story 3.1: `revisions` table DDL + append-only invariant

As a platform maintainer,
I want the `revisions` table populated with append-only constraints and a full JSONB snapshot of entity state at publication,
So that pinned-version URLs render from frozen data, never from the live entity (AR14).

**Acceptance Criteria:**

**Given** migration 008 has an empty skeleton for `revisions`
**When** I add full DDL
**Then** `revisions(id, entity_type, entity_id, version, snapshot_jsonb, moderator_id, reason, published_at, doctrine_version_id)` is defined with a unique constraint on `(entity_type, entity_id, version)`

**Given** the append-only invariant
**When** I add triggers
**Then** `UPDATE` and `DELETE` on `revisions` rows are rejected at the database level (no exception for superuser except via documented DBA runbook)

**Given** `snapshot_jsonb`
**When** a revision is published (by Epic 5 moderator workflow)
**Then** the column is populated with the full denormalized entity state — including source references and the doctrine version in force at publication

**Given** RLS on `revisions`
**When** an anonymous client queries
**Then** `SELECT` succeeds (public audit trail)
**And** `INSERT` / `UPDATE` / `DELETE` are denied for anonymous and contributor roles

**Given** a Vitest suite targeting the revisions schema
**When** executed
**Then** tests cover: insert succeeds, update rejected, delete rejected, unique-version-per-entity enforced, `snapshot_jsonb` round-trips faithfully

---

### Story 3.2: Pinned-URL routing + ISR semantics

As a reader who cites a fiche in a paper,
I want stable `/{lang}/{entity}/{slug}@v{n}` URLs that permanently serve the content as of revision `n`,
So that my citations remain valid forever regardless of future edits (FR18, FR19, AR13, AR14).

**Acceptance Criteria:**

**Given** Next.js App Router does not yet match the `@v{n}` pattern
**When** I extend `src/app/[lang]/peuples/[slug]/page.tsx` and analogous country / family routes to parse an `@v{n}` suffix
**Then** requests to `/fr/peuples/bakongo@v34` render the snapshot at version 34

**Given** a request to `/fr/peuples/bakongo`
**When** the handler resolves
**Then** it renders the current live revision with ISR `revalidate: 3600`

**Given** a request to `/fr/peuples/bakongo@latest`
**When** handled
**Then** it responds with `302` redirect to `/fr/peuples/bakongo@v{current}` where `{current}` is the latest version integer

**Given** a pinned-version URL
**When** rendered
**Then** the page reads `snapshot_jsonb` from `revisions` — never the live `afrik_peuples` row — and ISR is set to `revalidate: false` (immutable)

**Given** a pinned URL where the version does not exist
**When** requested
**Then** a calm 404 renders (per Story 2.11) with "Version introuvable" copy

**Given** URL syntax validation
**When** I request `/fr/peuples/bakongo@V34` (uppercase V) or `/fr/peuples/bakongo@v34.1` (non-integer)
**Then** the response is 404 — the literal `@v{integer}` syntax is the only accepted form

**Given** a pinned URL
**When** the page renders
**Then** the fiche's `ConfidenceChip` shows the confidence at publication (frozen in snapshot), not a live recomputation (AR14 invariant)

**Given** a unit test suite under `src/app/[lang]/peuples/__tests__/`
**When** I run `npm run test`
**Then** tests cover: live URL, pinned URL, `@latest`, non-existent version, invalid suffix syntax, and snapshot-vs-live divergence

---

### Story 3.3: `pg_notify` cache invalidation wiring

As a platform operator,
I want Postgres triggers to notify Next.js when a revision is published so the live fiche page cache invalidates immediately,
So that readers never see stale live content after a moderation commit (AR16, AR18).

**Acceptance Criteria:**

**Given** the `revisions` table (Story 3.1)
**When** a row is inserted
**Then** a Postgres trigger fires `pg_notify('cache_invalidate', jsonb_build_object('entity_type', entity_type, 'entity_id', entity_id, 'slug', slug))`

**Given** the Next.js revalidate endpoint `/api/internal/revalidate` does not exist
**When** I create it at `src/app/api/internal/revalidate/route.ts`
**Then** the endpoint accepts POST with `{ entity_type, entity_id, slug }` and an `Authorization` header carrying `SUPABASE_WEBHOOK_SECRET`

**Given** the shared secret is wrong or missing
**When** a request arrives
**Then** the response is `401 UNAUTHENTICATED`

**Given** a valid payload
**When** the handler runs
**Then** it calls Next.js `revalidateTag(...)` or `revalidatePath(...)` for the live fiche URL (not pinned URLs — those are immutable)

**Given** a Supabase Edge Function or database webhook bridges `pg_notify` to HTTP POST
**When** a revision is inserted
**Then** within 10 seconds the Next.js endpoint is called and the relevant cache tag is invalidated

**Given** stable-reference endpoints (`/v2/sources`, families, countries)
**When** a revision affecting them is published
**Then** their cache-tag is invalidated per AR18 `s-maxage=86400, immutable` semantics

**Given** an integration test against a staging environment
**When** a revision is inserted via SQL
**Then** within 10 seconds a GET on the live fiche URL returns updated content

---

### Story 3.4: `CitationBlock` L3 component

As a researcher,
I want a citation block on every fiche that auto-generates a CC-BY-SA-4.0-attributed citation with a pinned-version toggle and copy-to-clipboard,
So that I can cite fiches correctly in a single tap (FR21, UX-DR12).

**Acceptance Criteria:**

**Given** `CitationBlock` renders on a fiche
**When** the fiche has at least one published revision
**Then** the component displays two tabs: "Version vivante" (default) and "Version figée @v{n}" (only when on a pinned URL or when user opens the drawer on a live fiche)

**Given** the active tab
**When** the preview renders as plain text
**Then** the format is exactly: `{Title (autonym / exonym)}. {ProductName}. {URL}. Consulté le {long French date}. CC-BY-SA 4.0.`

**Given** the CC-BY-SA-4.0 attribution line
**When** I attempt to remove it via props
**Then** the component continues to render the license line — it is not optional (decolonial-posture rule UX-DR49 #4)

**Given** the copy button
**When** I tap it
**Then** the clipboard receives the preview text and a transient "copié" confirmation appears in an `aria-live="polite"` region

**Given** the clipboard permission is denied
**When** the user taps copy
**Then** the preview text becomes manually selectable with a "sélectionner manuellement" hint (fallback, never a broken state)

**Given** a format selector
**When** I switch to BibTeX or Markdown
**Then** the preview re-renders in the chosen format with the license line preserved

**Given** a printable-preview tertiary link
**When** clicked
**Then** a print-optimized view opens

**Given** the component has a Storybook story at 430 / 720 / 1200 px
**When** axe-core runs
**Then** zero serious / critical violations are reported and copy-to-clipboard flow is keyboard-accessible

---

### Story 3.5: `RevisionDrawer` L3 component + audit-log rendering

As a reader wanting to know how a fiche has evolved,
I want a revision drawer listing every published revision with date, moderator, and reason,
So that I can audit the editorial history of any fiche (FR20, UX-DR13).

**Acceptance Criteria:**

**Given** a fiche with ≥ 1 revision
**When** `RevisionDrawer` opens (from the `SourceChainSheet` revision link or a dedicated fiche-footer entry point)
**Then** it renders a drawer listing every revision with: version number · publication date (long French) · moderator pseudonym · reason (truncated with expand)

**Given** the drawer
**When** rendered on mobile < 1024 px
**Then** it uses the bottom-sheet pattern (full-width, swipe-down dismiss) identical to `SourceChainSheet`

**Given** the drawer
**When** rendered ≥ 1024 px
**Then** it uses the right-side sheet pattern (420–480 px)

**Given** each revision row
**When** tapped
**Then** it navigates to the pinned-version URL `@v{n}` (Story 3.2)

**Given** the full audit log (FR20)
**When** a user wants it in a standalone view
**Then** the same data is rendered as a dedicated "Historique" section at the bottom of the fiche (above `PeopleSourcesFooter`) listing all revisions inline

**Given** a fiche has zero published revisions (fresh fiche)
**When** the drawer opens
**Then** an empty state reads calmly "Aucune révision publiée — fiche initiale"

**Given** the drawer consumes `/v2/peoples/{id}/revisions` (Story 3.7)
**When** the request fails
**Then** a retry affordance appears with calm French error copy (per UX-DR27 error pattern)

**Given** axe-core runs
**When** the drawer is open
**Then** focus is trapped, Esc dismisses, background carries `inert`, and zero serious / critical violations are reported

---

### Story 3.6: `PinnedVersionBanner` L3 component

As a reader viewing a pinned-version URL,
I want a clear banner telling me I'm looking at a frozen version with a one-tap link to the live version,
So that I understand my context and can reach the current state without guessing the URL (UX-DR14).

**Acceptance Criteria:**

**Given** a pinned URL (`@v{n}`) is active
**When** the fiche renders
**Then** `PinnedVersionBanner` appears as a single-line strip pinned below the fiche header (never above — must not push the autonym below the fold)

**Given** the banner
**When** rendered
**Then** it reads: "Version figée du {long French date} (@v{n}) · voir la version vivante →"
**And** it uses `--afh-bg-warm` background — not alarm-colored

**Given** the banner accessibility
**When** a screen reader announces it
**Then** `role="region"` + `aria-label="indicateur de version figée"` are set

**Given** I tap the dismiss control
**When** the banner collapses
**Then** it renders as a small "@v{n}" corner indicator
**And** the dismissal is persisted to `localStorage` per-fiche (never globally) so another fiche shows the full banner

**Given** the pinned version has `hasRelevantResolvedFlags = true` (one or more flags resolved between this pinned version and live)
**When** the banner renders
**Then** it shows an expanded note: "Depuis cette version figée, {N} assertion(s) ont été corrigée(s) — voir version vivante"

**Given** the "voir la version vivante" link
**When** inspected
**Then** it is always visible regardless of dismiss state (never hidden behind the corner indicator)

**Given** a Storybook story at 430 / 720 / 1200 px with three variants (default / dismissed / with-resolved-flags-note)
**When** axe-core runs
**Then** zero serious / critical violations are reported

---

### Story 3.7: API — revisions list + pinned-version endpoints

As an API consumer,
I want `GET /v2/peoples/{id}/revisions` (paginated list) and `GET /v2/peoples/{id}@v{n}` (snapshot),
So that external integrations can render revision history and resolve pinned versions (AR10, AR14).

**Acceptance Criteria:**

**Given** the 3-layer pattern
**When** I create `src/app/api/v2/peoples/[id]/revisions/route.ts` and `src/app/api/v2/peoples/[id]@v[n]/route.ts` (or equivalent routing)
**Then** each endpoint validates params, calls its handler, calls its service, and returns via `createApiResponse` / `createApiError`

**Given** `GET /v2/peoples/{id}/revisions?limit=20&cursor={cursor}`
**When** called
**Then** the response contains an array of `{ version, published_at, moderator_pseudonym, reason, pinned_url }` ordered by `version DESC`
**And** the envelope includes cursor-based pagination (no offset)

**Given** `GET /v2/peoples/{id}@v{n}`
**When** called with a valid `n`
**Then** the response contains the full snapshot from `revisions.snapshot_jsonb` plus `meta: { license, attribution, confidence (at publication), pinned_url }` — read from snapshot, never from the live entity

**Given** an invalid `n` or unknown id
**When** called
**Then** the response is `404 NOT_FOUND` per the error taxonomy (AR9)

**Given** edge-caching semantics
**When** a pinned-version response is returned
**Then** headers include `Cache-Control: s-maxage=31536000, immutable` (AR18 + AR14 — pinned data never changes)

**Given** the OpenAPI spec
**When** I register the new endpoints
**Then** paths, params, response schemas, and error codes are documented and the OpenAPI-diff gate (Story 0.5) passes

**Given** unit tests under `src/api/v2/__tests__/`
**When** `npm run api-tests` runs
**Then** tests cover: happy path, pagination, invalid id, invalid version, snapshot-vs-live divergence — all pass

---

### Story 3.8: Feed endpoint `/v2/feed/revisions`

As a developer building an alerting or mirroring integration,
I want a cursor-paginated Atom + JSON feed of recent revisions filterable by `since`,
So that I can discover updated fiches without polling every endpoint (FR38 preparation, AR19, NFR32).

**Acceptance Criteria:**

**Given** `src/app/api/v2/feed/revisions/route.ts` does not exist
**When** I create it using the 3-layer pattern
**Then** the route accepts `?since={iso8601}&limit={1-100}&cursor={cursor}&format={atom|json}`

**Given** `format=json` (default)
**When** called
**Then** the response matches the standard envelope with `data: [{ entity_type, entity_id, slug, version, published_at, pinned_url, summary }]`

**Given** `format=atom`
**When** called
**Then** the response `Content-Type: application/atom+xml` with a valid Atom 1.0 feed — title, id, updated, and entry elements per revision

**Given** an idempotency check
**When** the same request is replayed with the same cursor
**Then** the response body is byte-identical (no timestamps inside the payload that change on replay) — NFR32

**Given** edge caching
**When** the feed is returned
**Then** headers include `Cache-Control: s-maxage=60` (AR18)

**Given** the OpenAPI spec
**When** I register `/v2/feed/revisions`
**Then** paths + params + both response schemas are documented and the OpenAPI-diff gate passes

**Given** rate-limit buckets
**When** an anonymous client calls the feed > 60 req/min
**Then** `429 RATE_LIMITED` with `Retry-After` + `X-RateLimit-*` headers

---

### Story 3.9: Pinned doctrine-version resolution

As a reader viewing a pinned-version fiche,
I want the `DoctrineLinkCard` to link to the doctrine version that was in force at publication — not the live doctrine,
So that I can read the editorial framing exactly as it applied to the frozen content (FR25, closes Story 1.8 inline note).

**Acceptance Criteria:**

**Given** a fiche revision carries `doctrine_version_id` (referenced in `snapshot_jsonb`)
**When** `DoctrineLinkCard` (Story 1.8) renders on a pinned-version URL
**Then** its link resolves to `/fr/doctrine/{slug}@v{n}` where `n` is the doctrine version in force at the fiche revision's publication

**Given** the same card on a live fiche URL
**When** rendered
**Then** the link resolves to the live `/fr/doctrine/{slug}` (current doctrine)

**Given** the doctrine pinned route `/fr/doctrine/{slug}@v{n}`
**When** requested
**Then** the page renders the `editorial_doctrine` row where `(slug, version) = (slug, n)` with a version label "v{n} · publiée le {long French date}"

**Given** the inline note "version en vigueur au moment de la publication — historique disponible prochainement" from Story 1.8
**When** this story ships
**Then** the note is removed because the full pinned-doctrine link is now live

**Given** a unit test
**When** a fiche revision with `doctrine_version_id = 42` renders
**Then** the `DoctrineLinkCard` link's `href` resolves to the doctrine slug `@v42` path

---

## Epic 4: Community Contributions (Flags & Corrections)

**Epic goal:** Registered contributors submit public, auditable flags and textual correction proposals against any assertion, source, or fiche section; every flag gets a permanent public URL with status; anti-spam, rate-limiting, and GDPR-K age-gating protect the platform; all contributions are visible on a public moderation queue before moderator action.

**Key deliverables:** `flags` + `contributor_profiles` tables populated · Supabase Auth configured (magic-link + GitHub + Google OAuth) · COPPA / GDPR-K age gate · unified `FlagForm` L3 component dispatched from `FlagTarget` · `/fr/signalements` public index + `/fr/signalements/{id}` permanent flag page · `POST /v2/flags` + `GET /v2/flags` + `GET /v2/flags/{id}` public API endpoints · Cloudflare Turnstile wiring · Upstash rate-limit per contributor · GDPR right-to-erasure flow on contributor profile.

### Story 4.1: `flags` table DDL + state machine + RLS

As a platform maintainer,
I want the `flags` table fully defined with an enforced state machine and row-level security that lets anyone read but only authenticated contributors insert,
So that every community contribution is auditable, permanent, and safe to expose publicly (AR3, AR15, FR12, FR13).

**Acceptance Criteria:**

**Given** migration 011 has an empty skeleton for `flags`
**When** I add full DDL
**Then** `flags(id uuid pk, created_at, updated_at, contributor_id references auth.users, target_type ∈ {assertion|source|fiche_section|classification}, target_id uuid, target_field_path text nullable, flag_kind ∈ {inaccurate|missing-source|broken-url|offensive|correction-proposal|other}, reason_text, counter_source_url nullable, counter_source_citation nullable, proposed_rewrite nullable, status ∈ {open|under_review|accepted|rejected|withdrawn|duplicate}, moderator_id nullable, moderator_notes nullable, resolved_at nullable, public_slug text unique, turnstile_token_verified bool)` is defined

**Given** the state machine
**When** I add a CHECK constraint + trigger
**Then** only transitions `open → under_review | withdrawn`, `under_review → accepted | rejected | duplicate`, and terminal states (`accepted | rejected | duplicate | withdrawn`) that cannot transition further are permitted
**And** any forbidden transition raises an error naming the attempted source and target state

**Given** `public_slug` must be stable and URL-safe
**When** a flag is inserted
**Then** a BEFORE-INSERT trigger populates `public_slug` with a 10-character base32 code (Crockford) derived from `id`, unique at the column level

**Given** RLS is enabled on `flags`
**When** an anonymous client runs `SELECT`
**Then** the query returns rows (public audit trail per FR14, FR17)

**Given** RLS policies
**When** an authenticated contributor runs `INSERT`
**Then** the row is accepted only if `contributor_id = auth.uid()` and `turnstile_token_verified = true`

**Given** RLS policies
**When** an authenticated contributor runs `UPDATE`
**Then** only `status = withdrawn` on their own `open` rows is permitted — all other updates are rejected (moderators update via the service-role admin client per Epic 5)

**Given** RLS policies
**When** any client runs `DELETE`
**Then** the query is rejected (append-only — hard delete only via DBA runbook)

**Given** a Vitest suite under `supabase/__tests__/flags-rls.test.ts`
**When** executed
**Then** coverage includes: public read, anonymous insert rejected, authenticated insert with mismatched `contributor_id` rejected, valid transition accepted, forbidden transition rejected, delete rejected, and `public_slug` uniqueness

---

### Story 4.2: Supabase Auth — contributor registration + email verification + login UI

As a reader who wants to contribute,
I want to register with email (magic-link), GitHub, or Google and receive email verification,
So that I can submit flags and corrections attributable to a verified account (FR39, FR40).

**Acceptance Criteria:**

**Given** Supabase Auth is not yet configured for contributor-facing flows
**When** I enable providers in Supabase dashboard + commit the provider config under `supabase/config.toml`
**Then** magic-link, GitHub OAuth, and Google OAuth are active in the local and production projects

**Given** `/fr/compte/inscription` does not yet exist
**When** I create the page at `src/app/[lang]/compte/inscription/page.tsx`
**Then** it renders a form with "email (lien magique)", "continuer avec GitHub", "continuer avec Google" choices plus a consent checkbox for CC-BY-SA-4.0 licensing of contributions (FR39)
**And** all copy is French (FR43)
**And** the form passes axe-core with zero serious/critical violations (FR44)

**Given** a contributor completes magic-link registration
**When** the callback fires at `src/app/api/auth/callback/route.ts`
**Then** a row is inserted into `contributor_profiles(id = auth.uid(), display_name, created_at, age_confirmed_at nullable, public bool default false)`

**Given** a contributor uses GitHub or Google OAuth
**When** the provider callback returns
**Then** the same `contributor_profiles` row is upserted with `display_name` prefilled from the provider claim

**Given** an unverified email
**When** the user attempts to submit a flag
**Then** the API rejects with `403 UNAUTHORIZED` and the UI shows "email non vérifié — cliquez sur le lien dans votre boîte mail"

**Given** `/fr/compte/connexion` does not yet exist
**When** I create the page
**Then** it mirrors the registration form, minus the license checkbox, with a "mot de passe oublié ? → lien magique" affordance

**Given** a Playwright test under `e2e/contributor-auth.spec.ts`
**When** executed
**Then** it covers the magic-link flow end-to-end against a local Supabase with Inbucket capturing the verification email

---

### Story 4.3: COPPA / GDPR-K age gate at registration

As a platform compliant with child-data law,
I want registration to require the user to confirm they are 16 or older (or 13 with parental consent per jurisdiction) before `contributor_profiles` is marked active,
So that the platform never stores personal data from minors without safeguards (FR45, AR24).

**Acceptance Criteria:**

**Given** the registration form from Story 4.2
**When** it renders
**Then** it includes a required checkbox labeled "Je confirme avoir 16 ans ou plus (ou 13 ans avec l'accord d'un parent dans ma juridiction)" with a link to `/fr/politique-confidentialite#mineurs`

**Given** the checkbox is unchecked
**When** the user submits
**Then** the client-side validation blocks submission with the message "cette confirmation est requise"

**Given** the checkbox is checked and the form passes
**When** the Supabase Auth callback lands
**Then** `contributor_profiles.age_confirmed_at` is set to `now()`

**Given** a contributor exists without `age_confirmed_at`
**When** they attempt to submit a flag
**Then** the API rejects with `403 UNAUTHORIZED` and the UI redirects to `/fr/compte/profil` with a prompt to confirm age

**Given** a privacy-policy page anchor `/fr/politique-confidentialite#mineurs`
**When** I create it via MDX
**Then** it documents: minimum age 16, 13 with parental consent, no ad tracking, only Plausible cookieless analytics, data-retention windows, and right-to-erasure process (Story 4.4)

**Given** a Vitest suite under `src/app/[lang]/compte/__tests__/age-gate.test.tsx`
**When** executed
**Then** it covers: checkbox renders, submission blocked without check, `age_confirmed_at` populated after check, flag-submit blocked when `age_confirmed_at IS NULL`

---

### Story 4.4: Contributor profile page + GDPR right-to-erasure

As a contributor with GDPR rights,
I want a profile page where I can update my display name, set my profile public or private, and request permanent erasure of my personal data,
So that the platform honors my data-subject rights under GDPR (FR42, AR24).

**Acceptance Criteria:**

**Given** `/fr/compte/profil` does not yet exist
**When** I create it at `src/app/[lang]/compte/profil/page.tsx` (protected by middleware redirect to `/fr/compte/connexion` if unauthenticated)
**Then** it displays `display_name`, `public` toggle, email (masked except prefix + domain), `created_at`, and age-confirmation status

**Given** the contributor edits `display_name`
**When** they save
**Then** `contributor_profiles.display_name` is updated via a server action that validates length 2–40 characters and rejects profanity from a curated list

**Given** the `public` toggle is on
**When** a flag authored by this contributor renders publicly (Stories 4.7, 4.8)
**Then** the public view shows `display_name`
**And** when the toggle is off, the public view shows "contributeur anonyme"

**Given** the profile page has a "Supprimer mon compte et mes données" button
**When** the contributor clicks it
**Then** a confirmation dialog warns "cette action est irréversible — vos signalements resteront publics sans votre nom" and requires typing `SUPPRIMER` to confirm

**Given** confirmed erasure
**When** the server action runs
**Then** it: (a) deletes the `auth.users` row via service-role client, (b) anonymizes all `flags.contributor_id` for this user to `NULL` and sets `contributor_display_name_snapshot = NULL` on each, (c) deletes the `contributor_profiles` row, (d) writes an `audit_log` entry with the erasure timestamp and the user's ID hash (no email)

**Given** an erasure request is in progress
**When** the transaction fails partway
**Then** the entire operation is rolled back and the user sees "suppression échouée — merci de réessayer ou de nous contacter"

**Given** a Playwright test under `e2e/contributor-erasure.spec.ts`
**When** executed
**Then** it verifies: auth → create flag → erasure → flag persists publicly but with no `display_name` + no `contributor_id`

---

### Story 4.5: `FlagForm` L3 component — unified flag + correction proposal

As a contributor who spotted an inaccurate fact or wants to propose a rewrite,
I want one unified form that lets me pick a flag kind, supply a counter-source URL + citation, and optionally draft a proposed rewrite,
So that flags (FR12) and textual corrections (FR13) flow through the same moderation pipeline.

**Acceptance Criteria:**

**Given** `FlagForm` does not yet exist
**When** I create it at `src/components/flags/FlagForm.tsx`
**Then** it accepts props `{ target: { type, id, fieldPath?, snapshotQuote? }, onSubmit, onCancel }` and renders a `<form>` with Tailwind tokens from `--afh-*`

**Given** the form's first section
**When** it renders
**Then** it shows the target context — entity label, field path, and a `<blockquote>` snapshot of the flagged text — so the contributor sees what they are flagging

**Given** the `flag_kind` selector
**When** it renders
**Then** it is a radio group with exactly the values from the enum: `inaccurate`, `missing-source`, `broken-url`, `offensive`, `correction-proposal`, `other`

**Given** the contributor picks `correction-proposal`
**When** conditional fields show
**Then** a `proposed_rewrite` textarea (5000 char max, counter shown) is revealed as required
**And** at least one of `counter_source_url` or `counter_source_citation` is required

**Given** the contributor picks `inaccurate` or `missing-source`
**When** conditional fields show
**Then** `counter_source_url` and `counter_source_citation` are both required (at least one)

**Given** the contributor picks `broken-url` or `offensive` or `other`
**When** conditional fields show
**Then** `counter_source_url` is optional, `counter_source_citation` is optional, and `reason_text` (required, 50–2000 chars) is the primary input

**Given** the `reason_text` field
**When** the contributor types
**Then** a character counter shows current / 2000 and submission is blocked below 50 characters

**Given** the Turnstile widget (Story 4.10) mounts in the form footer
**When** the contributor submits
**Then** the resolved Turnstile token is attached to the POST payload

**Given** a successful submission
**When** the server returns the new flag's `public_slug`
**Then** the form transitions to a success state with a permalink to `/fr/signalements/{public_slug}` and a "merci — vous recevrez un email quand la modération aura tranché" message

**Given** the form passes axe-core audit
**When** tested
**Then** every field has a visible `<label>`, error messages link via `aria-describedby`, and the form is fully keyboard-operable (FR44)

**Given** a Vitest suite under `src/components/flags/__tests__/FlagForm.test.tsx`
**When** executed
**Then** it covers: required-field matrix per `flag_kind`, character counter behavior, submission success, submission rejection on Turnstile failure, and axe-core zero violations

---

### Story 4.6: `FlagTarget` L3 component — full implementation + wiring

As a reader using `SourceChainSheet`,
I want the placeholder `FlagTarget` shell (from Story 1.7) upgraded to open the full `FlagForm` in a modal with the correct target context prefilled,
So that flagging any assertion, source, or section is one click away from the reading surface (FR12).

**Acceptance Criteria:**

**Given** the `FlagTarget` shell from Story 1.7 renders a button labeled "signaler"
**When** I upgrade it
**Then** clicking the button opens a shadcn/ui `Dialog` containing `FlagForm` (Story 4.5)

**Given** the reader is unauthenticated
**When** they click "signaler"
**Then** the dialog renders a sign-in prompt with links to `/fr/compte/connexion?redirect={current-url}` and `/fr/compte/inscription?redirect={current-url}`

**Given** the reader is authenticated but `age_confirmed_at IS NULL`
**When** they click "signaler"
**Then** the dialog shows "merci de confirmer votre âge pour contribuer" + CTA to `/fr/compte/profil`

**Given** `FlagTarget` is rendered inside `SourceChainSheet`
**When** the target is an `assertion`
**Then** the form's `target` prop is `{ type: 'assertion', id: <assertion.id>, fieldPath: <assertion.field_path>, snapshotQuote: <assertion.statement> }`

**Given** `FlagTarget` is rendered on a fiche section heading (e.g., "Histoire", "Culture")
**When** the target is a `fiche_section`
**Then** the form's `target` prop is `{ type: 'fiche_section', id: <entity.id>, fieldPath: <section.slug>, snapshotQuote: null }`

**Given** `FlagTarget` is rendered in the citation of a `SourceCard`
**When** the target is a `source`
**Then** the form's `target` prop is `{ type: 'source', id: <source.id>, fieldPath: null, snapshotQuote: <source.citation> }`

**Given** a successful submission
**When** the response returns
**Then** the dialog closes, a toast shows "signalement enregistré", and the new flag's `public_slug` is logged to console + analytics event `flag_submitted` fires

**Given** a Vitest suite under `src/components/flags/__tests__/FlagTarget.test.tsx`
**When** executed
**Then** it covers: unauthenticated branch, unconfirmed-age branch, authenticated submission success, each `target.type` branch, and keyboard-focus-trap in dialog

---

### Story 4.7: `FlagPublicStatus` + public flag permalink page

As any reader auditing platform transparency,
I want `/fr/signalements/{public_slug}` to render the full flag with status, target context, counter-sources, moderator decision, and resolution timestamp,
So that every community contribution has a permanent, citable, public URL (FR17, AR18).

**Acceptance Criteria:**

**Given** `/fr/signalements/[slug]/page.tsx` does not yet exist
**When** I create it
**Then** it resolves the row `WHERE public_slug = {slug}` or returns a calm 404 (per Story 2.11) if absent

**Given** the page renders
**When** the flag is `open` or `under_review`
**Then** the `FlagPublicStatus` L3 component shows a `Badge` in amber "en cours — examen par l'équipe éditoriale"

**Given** the flag is `accepted`
**When** rendered
**Then** the badge is green "acceptée · fiche mise à jour" with a link to the relevant pinned revision (Epic 3)

**Given** the flag is `rejected` or `duplicate`
**When** rendered
**Then** the badge is grey "rejetée" or "doublon" with moderator rationale displayed verbatim in a `<blockquote>` below

**Given** the page
**When** rendered
**Then** it displays: `target` (entity + field_path + snapshotQuote), `flag_kind`, `reason_text`, `counter_source_url` as clickable link + `counter_source_citation` if any, `proposed_rewrite` as `<blockquote>` if any, `created_at` + `resolved_at` in long French format, `contributor_display_name` or "contributeur anonyme" if `public = false` / erased

**Given** `contributor_profiles.public = false` or the contributor has been erased
**When** the page renders
**Then** the contributor field shows "contributeur anonyme" and no linkable profile

**Given** the page metadata
**When** rendered server-side
**Then** `<title>` reads "Signalement {slug} — Africa History", `<meta name="robots" content="index,follow">`, and OpenGraph tags are populated per FR24 equivalents

**Given** the page is cached with ISR
**When** the flag transitions state
**Then** `pg_notify` (Story 3.3) invalidates the route so the next request renders the new status

**Given** axe-core and Lighthouse run against `/fr/signalements/{slug}`
**When** tested
**Then** axe returns zero serious/critical and Lighthouse Perf ≥ 85 (FR44, NFR)

---

### Story 4.8: Public moderation queue index `/fr/signalements`

As any reader who wants to see what the community is flagging right now,
I want `/fr/signalements` to list every flag (open and resolved) with filters by status, kind, and target type,
So that platform transparency is one click away from any fiche (FR14).

**Acceptance Criteria:**

**Given** `/fr/signalements/page.tsx` does not yet exist
**When** I create it
**Then** it renders the latest 50 flags sorted by `created_at DESC` with infinite-scroll cursor pagination (AR15)

**Given** each list row
**When** it renders
**Then** it shows: status badge (reusing Story 4.7 colors), target entity label + field_path, `flag_kind`, truncated `reason_text` (120 chars), contributor display name or "anonyme", `created_at` as relative French time ("il y a 3 jours")

**Given** the row is clicked
**When** the user navigates
**Then** they land on `/fr/signalements/{public_slug}` (Story 4.7)

**Given** the filter bar
**When** it renders
**Then** it has three multi-select dropdowns: status (open / under_review / accepted / rejected / withdrawn / duplicate), `flag_kind` (6 values), target_type (4 values)

**Given** a filter is selected
**When** applied
**Then** the URL reflects the filter state via search params (e.g., `?status=open&kind=inaccurate`) and page is bookmarkable

**Given** a filter returns zero rows
**When** rendered
**Then** an empty state shows "aucun signalement ne correspond à ces filtres" with a "réinitialiser" button

**Given** the page is server-rendered
**When** requested
**Then** ISR with `revalidate: 60` keeps the queue near-real-time without hammering the DB

**Given** the page meta
**When** rendered
**Then** `<title>` is "Tous les signalements — Africa History" and `<meta name="description">` is "Transparence éditoriale — explorez les signalements de la communauté"

**Given** axe-core
**When** run
**Then** filter dropdowns are keyboard-operable, list items have semantic heading hierarchy, and zero serious/critical (FR44)

---

### Story 4.9: API endpoints `POST /v2/flags` · `GET /v2/flags` · `GET /v2/flags/{id}`

As a third-party developer,
I want public REST endpoints to read the flag queue and submit flags programmatically,
So that platform transparency data is machine-consumable and scriptable (FR12, FR14, FR40).

**Acceptance Criteria:**

**Given** `src/app/api/v2/flags/route.ts` does not yet exist
**When** I create it
**Then** `POST /v2/flags` accepts the schema `{ target_type, target_id, target_field_path?, flag_kind, reason_text, counter_source_url?, counter_source_citation?, proposed_rewrite?, turnstile_token }` via 3-layer pattern (route → handler → service)

**Given** `POST /v2/flags`
**When** the request is anonymous (no `Authorization: Bearer ...` or invalid Supabase JWT)
**Then** it responds `401 UNAUTHENTICATED` with the error taxonomy envelope `{ errors: [{ code: 'UNAUTHENTICATED', message }] }`

**Given** an authenticated request with a valid Turnstile token
**When** validation passes
**Then** the handler inserts into `flags` with `contributor_id = auth.uid()`, `turnstile_token_verified = true`, returns `201` with `{ data: { id, public_slug, status, created_at }, meta: { license: "CC-BY-SA-4.0", attribution: "..." } }`

**Given** a payload failing validation (e.g., reason too short, unknown `flag_kind`)
**When** the handler runs
**Then** it responds `400 VALIDATION_ERROR` with field-level errors

**Given** the contributor has hit their rate limit (Story 4.11)
**When** they POST
**Then** the handler responds `429 RATE_LIMITED` with `Retry-After` header

**Given** `GET /v2/flags`
**When** called with optional query params `?status=&kind=&target_type=&cursor=&limit=`
**Then** it returns paginated flags with the response envelope, cursor-based (AR15)

**Given** `GET /v2/flags/{public_slug_or_id}`
**When** called
**Then** it returns the full flag row with the response envelope or `404 NOT_FOUND`

**Given** all three endpoints
**When** OpenAPI spec is read
**Then** `src/lib/api/openapiV2.ts` includes the three endpoints with schemas, example payloads, and the full error taxonomy

**Given** the CORS middleware (`src/lib/api/cors.ts`)
**When** an `OPTIONS` preflight arrives
**Then** it responds with the public-API CORS headers matching the rest of `/v2`

**Given** a Vitest suite under `src/app/api/v2/flags/__tests__/`
**When** executed
**Then** it covers: unauth 401, bad Turnstile 400, valid submission 201, validation error matrix, rate-limit 429, list pagination, detail 404, OPTIONS preflight

---

### Story 4.10: Cloudflare Turnstile anti-spam wiring

As a platform maintainer,
I want Cloudflare Turnstile enforced on every flag submission to block bot contributions without user friction,
So that the moderation queue is not flooded with automated spam (NFR security).

**Acceptance Criteria:**

**Given** `CLOUDFLARE_TURNSTILE_SITE_KEY` and `CLOUDFLARE_TURNSTILE_SECRET_KEY` do not yet exist
**When** I add them to `.env.example`
**Then** they are documented in the development guide with links to the Cloudflare dashboard setup

**Given** the `FlagForm` component (Story 4.5)
**When** it mounts
**Then** it renders the Turnstile widget via `@marsidev/react-turnstile` in "managed" mode below the submit button

**Given** the contributor submits without a resolved token
**When** the client validates
**Then** submission is blocked with "vérification anti-bot requise"

**Given** the token is submitted
**When** the server receives it in `POST /v2/flags`
**Then** the handler verifies against `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret` + `response` + client IP

**Given** the Turnstile verify response returns `success: false`
**When** the handler checks
**Then** it responds `403 UNAUTHORIZED` with `{ errors: [{ code: 'UNAUTHORIZED', message: 'vérification anti-bot échouée' }] }` and the `flags` row is not inserted

**Given** a Turnstile network error (timeout or 5xx)
**When** the handler catches it
**Then** it responds `503 UNAVAILABLE` with a retry suggestion and the `flags` row is not inserted

**Given** the Turnstile widget cannot load (JS disabled, Cloudflare blocked)
**When** the form renders
**Then** a fallback notice reads "pour soumettre un signalement, activez JavaScript et débloquez challenges.cloudflare.com" with a link to the API endpoint for programmatic users

**Given** a Vitest suite mocking the siteverify call
**When** executed
**Then** it covers: success, `success: false`, network error, missing token, and the correct IP being forwarded

---

### Story 4.11: Contributor flag rate-limiting via Upstash

As a platform maintainer,
I want per-contributor rate limits on flag submission (10 flags per hour, 30 per day) enforced at the API edge via Upstash Redis,
So that individual abusers cannot overwhelm the moderation queue (NFR security, AR18).

**Acceptance Criteria:**

**Given** `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are already configured for other rate-limits in AR18
**When** I add a new sliding-window rate-limiter at `src/lib/ratelimit/flagRateLimit.ts`
**Then** it defines two windows: 10 / 1h and 30 / 24h, keyed by `flags:contributor:{auth.uid()}`

**Given** `POST /v2/flags` (Story 4.9)
**When** the handler runs
**Then** it calls the rate-limiter before DB insert and rejects with `429 RATE_LIMITED` + `Retry-After` + remaining-window message if either window is exceeded

**Given** a successful insert
**When** the limiter is consumed
**Then** both windows are incremented atomically

**Given** the UI (`FlagForm` success path)
**When** a `429` is returned
**Then** the form shows "vous avez atteint la limite horaire — réessayez dans {Retry-After}"

**Given** a contributor is on the (future) trusted-contributor allowlist with tier `staff` or `advanced`
**When** their submission is checked
**Then** the limiter applies relaxed windows (100 / 1h, 500 / 24h) — the tier column is introduced in `contributor_profiles` but defaults to `standard` (hook stays unused until moderator workflow in Epic 5 uses it)

**Given** the limiter fails open on Upstash outage
**When** Redis is unreachable
**Then** the handler logs a warning via `src/lib/api/logger.ts`, increments a Sentry breadcrumb, and allows the submission (availability > strict enforcement)

**Given** a Vitest suite under `src/lib/ratelimit/__tests__/flagRateLimit.test.ts`
**When** executed with a mocked Upstash
**Then** it covers: under limit accepted, at-limit 429, Upstash outage fail-open, and tier-based override

---

## Epic 5: Moderation & Editorial Workflow

**Epic goal:** Authenticated moderators review community flags, transition flag state, draft and publish immutable revisions with `snapshot_jsonb`, manage the living editorial doctrine via versioned MDX, and leave an append-only audit trail — without any password-in-env-var auth (legacy `ADMIN_USERNAME` / `ADMIN_PASSWORD` retired in favor of Supabase Auth + role column).

### Story 5.1: `moderator_role` column + `audit_log` table + RLS hardening

As a platform maintainer,
I want a `moderator_role` enum on `contributor_profiles`, a `revision_drafts` table for in-progress edits, and an append-only `audit_log` table,
So that moderator identity is database-driven and every editorial action is permanently recorded (FR41).

**Acceptance Criteria:**

**Given** migration 012 does not yet exist
**When** I create it
**Then** it adds `contributor_profiles.moderator_role ∈ {none|editor|senior_editor|admin}` defaulting to `none` with a CHECK constraint

**Given** migration 012
**When** it also creates `revision_drafts`
**Then** `revision_drafts(id, entity_type, entity_id, moderator_id references auth.users, draft_jsonb, linked_flag_ids uuid[], created_at, updated_at)` is defined with a unique constraint on `(entity_type, entity_id, moderator_id)` — one active draft per moderator per entity

**Given** migration 012
**When** it also creates `audit_log`
**Then** `audit_log(id, actor_id references auth.users, action ∈ {flag_reviewed|revision_published|doctrine_published|contributor_erased|role_changed}, target_type, target_id, details_jsonb, created_at)` is defined

**Given** the append-only invariant on `audit_log`
**When** triggers are added
**Then** `UPDATE` and `DELETE` on `audit_log` rows are rejected at the database level for all roles including service role (only direct DBA access)

**Given** RLS on `audit_log`
**When** an anonymous client runs `SELECT`
**Then** the query succeeds (public transparency per FR41)
**And** `INSERT` is allowed only for service-role client (moderator actions go through server)

**Given** RLS on `revision_drafts`
**When** a contributor with `moderator_role = 'none'` queries
**Then** `SELECT`, `INSERT`, `UPDATE`, `DELETE` are all denied

**Given** a Vitest suite under `supabase/__tests__/moderator-schema.test.ts`
**When** executed
**Then** it covers: role CHECK constraint, audit_log append-only (update rejected, delete rejected), revision_drafts RLS per role, and moderator_role default = 'none'

---

### Story 5.2: Admin authentication + route protection via Supabase Auth

As a platform maintainer,
I want admin routes protected by Supabase Auth session + `moderator_role ≠ 'none'` checks, replacing the legacy `ADMIN_USERNAME` / `ADMIN_PASSWORD` env-var gate,
So that moderator identity is verifiable and auditable (FR41).

**Acceptance Criteria:**

**Given** `src/middleware.ts` currently checks session cookie for admin routes
**When** I update it
**Then** it verifies a Supabase Auth session AND that the user's `contributor_profiles.moderator_role` is NOT `'none'` — if either fails, redirect to `/fr/compte/connexion?redirect={attempted-url}`

**Given** `/fr/admin/*` routes
**When** accessed by a logged-in contributor with `moderator_role = 'none'`
**Then** the middleware redirects to `/fr` with a flash message "accès réservé aux modérateurs"

**Given** the legacy `ADMIN_USERNAME` and `ADMIN_PASSWORD` env vars
**When** this story ships
**Then** they are removed from `.env.example`, `CLAUDE.md`, and the middleware — no more password-based admin auth

**Given** a `getModeratorSession` server utility at `src/lib/supabase/moderator.ts`
**When** called from any admin page's server component
**Then** it returns `{ user, role: moderator_role }` or throws `redirect('/fr/compte/connexion')`

**Given** the admin route `/fr/admin/connexion` does not yet exist
**When** I create it
**Then** it renders a Supabase Auth sign-in form (magic-link + OAuth) identical to contributor login but branded "Espace modération — Africa History"

**Given** a Vitest suite under `src/lib/supabase/__tests__/moderator.test.ts`
**When** executed
**Then** it covers: valid moderator session, contributor with `role = 'none'` rejected, expired session rejected, legacy env vars are not referenced anywhere in code

---

### Story 5.3: Moderator dashboard `/fr/admin`

As a moderator,
I want a dashboard showing open-flag count, average resolution time, pending revision drafts, and a recent activity feed,
So that I can triage editorial work at a glance (FR41).

**Acceptance Criteria:**

**Given** `/fr/admin/page.tsx` does not yet exist
**When** I create it (protected by Story 5.2 middleware)
**Then** it renders four KPI cards: open flags count, avg resolution time (last 30 days), pending `revision_drafts` count, total published revisions (all time)

**Given** each KPI card
**When** data loads
**Then** the number is fetched server-side from a single `supabase.rpc('moderator_dashboard_kpis')` call and displayed with a label + trend arrow (↑ / ↓ vs. previous 30 days)

**Given** the KPI RPC does not exist
**When** I create it as a Postgres function
**Then** it returns a JSON object with the four metrics + previous-period comparisons, restricted to callers with `moderator_role ≠ 'none'` via `SECURITY DEFINER` + role check

**Given** the "Activité récente" section
**When** rendered
**Then** it shows the 20 most recent `audit_log` entries with: actor display name, action label (French), target link, and timestamp as relative French time

**Given** a "Signalements à traiter" quick-link section
**When** rendered
**Then** it shows the 5 oldest open flags (FIFO) with one-click links to `/fr/admin/signalements/{slug}`

**Given** the dashboard is responsive
**When** viewed on mobile (< 768px)
**Then** KPI cards stack vertically, activity feed is full-width below

**Given** axe-core
**When** run against `/fr/admin`
**Then** zero serious/critical violations; all interactive elements keyboard-reachable

---

### Story 5.4: Flag review page `/fr/admin/signalements/{slug}` — state transitions

As a moderator,
I want to view a flag's full context, transition its state (`open → under_review → accepted/rejected/duplicate`), attach mandatory notes, and optionally link to a revision draft,
So that I can resolve community contributions with traceable rationale (FR15).

**Acceptance Criteria:**

**Given** `/fr/admin/signalements/[slug]/page.tsx` does not yet exist
**When** I create it
**Then** it renders: flag details (target context, `flag_kind`, `reason_text`, counter-sources, `proposed_rewrite`), contributor info (display name or "anonyme"), `created_at`, current status badge, and the flagged entity's live state side-by-side

**Given** the state-transition panel
**When** the flag is `open`
**Then** two buttons render: "Prendre en charge" (`open → under_review`) and "Marquer comme doublon" (`open → duplicate`)

**Given** "Prendre en charge" is clicked
**When** the moderator submits
**Then** the flag transitions to `under_review`, `moderator_id` is set, and an `audit_log` row is inserted

**Given** the flag is `under_review`
**When** the moderator is ready to resolve
**Then** three buttons render: "Accepter" (→ `accepted`), "Rejeter" (→ `rejected`), "Doublon" (→ `duplicate`)

**Given** any resolution transition
**When** the button is clicked
**Then** a modal requires `moderator_notes` (50–2000 chars, textarea) — submission is blocked without notes

**Given** "Accepter" is selected
**When** the moderator submits with notes
**Then** the flag transitions to `accepted`, `resolved_at = now()`, and a CTA "Créer une révision liée" links to `/fr/admin/{entity_type}/{entity_id}/editer?flag={slug}`

**Given** "Rejeter" is selected
**When** submitted with notes
**Then** the flag transitions to `rejected`, `resolved_at = now()`, and `moderator_notes` are stored verbatim (shown publicly on Story 4.7 page)

**Given** the state-machine constraint (Story 4.1)
**When** the moderator attempts an invalid transition (e.g., `rejected → open`)
**Then** the DB rejects it and the UI shows "transition invalide"

**Given** the moderator edits are tracked
**When** any transition completes
**Then** an `audit_log` entry is inserted with `{ action: 'flag_reviewed', target_id: flag.id, details_jsonb: { from_status, to_status, moderator_notes } }`

**Given** axe-core
**When** run
**Then** all buttons have visible labels, modal is focus-trapped, and zero serious/critical

---

### Story 5.5: Revision drafting editor `/fr/admin/{entity}/{id}/editer`

As a moderator,
I want to edit fiche fields in a structured form, attach or create `assertions` rows with sources, see a live diff preview, and autosave my work as a `revision_draft`,
So that editorial changes are prepared carefully before publication (FR15, FR16).

**Acceptance Criteria:**

**Given** `/fr/admin/[entity]/[id]/editer/page.tsx` does not yet exist
**When** I create it
**Then** it loads the current live entity state (from `afrik_peuples`, `afrik_familles_linguistiques`, or `afrik_pays`) and any existing `revision_drafts` row for this moderator + entity

**Given** a draft exists
**When** the page loads
**Then** it resumes from the saved `draft_jsonb` instead of the live state, with a banner "brouillon en cours depuis le {date}"

**Given** the editor
**When** rendered
**Then** each editable field (demographics, classification, description, sections, etc.) is presented in a structured form matching the entity schema — not free-text markdown

**Given** an edit to a demographic or classification field
**When** the moderator changes the value
**Then** the form requires adding or linking an `assertions` row: `field_path` auto-populated, `statement` prefilled with the new value, `source_ids[]` must reference at least one `sources` row

**Given** a source picker
**When** the moderator needs a source
**Then** they can search existing `sources` by title/author or create a new source inline (title, author, year, tier, url)

**Given** the diff preview panel
**When** rendered alongside the form
**Then** it shows `<ins>` / `<del>` semantic pairs (per UX-DR20) comparing `draft_jsonb` fields to the current live entity state

**Given** autosave
**When** the moderator types
**Then** `revision_drafts.draft_jsonb` is upserted via debounced server action (500ms) — no explicit save button required

**Given** the `?flag={slug}` query param from Story 5.4
**When** present
**Then** the editor displays the linked flag's context (target, reason, proposed rewrite) in a sidebar and auto-populates `linked_flag_ids[]`

**Given** a Vitest suite under `src/app/[lang]/admin/__tests__/revision-editor.test.tsx`
**When** executed
**Then** it covers: load live entity, resume from draft, assertion required on field edit, source picker, diff preview renders, and autosave debounce

---

### Story 5.6: Revision publication flow

As a senior editor,
I want to commit a revision draft into an immutable `revisions` row with `snapshot_jsonb` and the current `doctrine_version_id`, update the live entity, and trigger cache invalidation,
So that every published change is permanently auditable and readers see updated content immediately (FR16).

**Acceptance Criteria:**

**Given** the revision editor (Story 5.5) has a "Publier" button
**When** the moderator clicks it
**Then** a confirmation modal requires typing `PUBLIER` to confirm (per UX-DR21) and entering a `reason` (50–500 chars describing what changed and why)

**Given** confirmed publication
**When** the server action runs
**Then** it executes within a single Postgres transaction: (a) inserts a `revisions` row with `snapshot_jsonb` = full denormalized entity state including assertions + sources + `doctrine_version_id` = current live doctrine version, `version` = max existing version + 1, `moderator_id`, `reason`, `published_at = now()`; (b) updates the live entity table row with the new field values; (c) inserts `assertions` rows for any new or updated assertions; (d) deletes the `revision_drafts` row; (e) updates any `linked_flag_ids` flags to `status = 'accepted'` with moderator notes referencing the revision

**Given** the transaction commits
**When** the insert trigger on `revisions` fires
**Then** `pg_notify('cache_invalidate', ...)` invalidates the live fiche route (per Story 3.3)

**Given** the publication succeeds
**When** the UI updates
**Then** a success banner shows "Révision v{n} publiée — fiche mise à jour" with a link to the live fiche and to the pinned URL `/{lang}/{entity}/{slug}@v{n}`

**Given** `contributor_profiles.moderator_role = 'editor'`
**When** they attempt to publish
**Then** the action is blocked — only `senior_editor` and `admin` can publish (editors can draft but not commit)

**Given** the transaction fails
**When** any step errors
**Then** the entire transaction rolls back, the draft is preserved, and the moderator sees "publication échouée — brouillon conservé"

**Given** an `audit_log` entry
**When** publication succeeds
**Then** `{ action: 'revision_published', target_id: revision.id, details_jsonb: { entity_type, entity_id, version, linked_flags, reason } }` is inserted

**Given** a Vitest suite
**When** executed
**Then** it covers: transaction atomicity (mock rollback), version auto-increment, snapshot_jsonb structure, editor role blocked, senior_editor allowed, audit_log written, and pg_notify fired

---

### Story 5.7: Editorial doctrine editor + version bump

As a senior editor,
I want to edit the MDX source of an editorial doctrine entry, bump the version, record a changelog, and supersede the previous version,
So that the doctrine evolves transparently and past revisions link to the correct doctrine version (FR15 doctrine side).

**Acceptance Criteria:**

**Given** `/fr/admin/doctrine/[slug]/editer/page.tsx` does not yet exist
**When** I create it
**Then** it loads the current `editorial_doctrine` row (latest version) with its `mdx_source` in a syntax-highlighted textarea (CodeMirror or Monaco, lazy-loaded)

**Given** the doctrine editor
**When** the moderator edits the MDX
**Then** a live preview panel renders the MDX → React output side-by-side (using `@next/mdx` compile pipeline from Story 1.11)

**Given** the "Publier nouvelle version" button
**When** clicked
**Then** a confirmation modal requires typing `PUBLIER`, entering a changelog entry (50–500 chars), and selecting whether the change is "mineur" (typo/clarification) or "majeur" (policy change)

**Given** confirmed publication
**When** the server action runs
**Then** it: (a) sets `superseded_at = now()` on the current row, (b) inserts a new `editorial_doctrine` row with `version = previous + 1`, `mdx_source`, `published_at = now()`, `superseded_at = NULL`, (c) inserts an `audit_log` entry

**Given** the doctrine is published
**When** future revisions reference `doctrine_version_id`
**Then** they reference the new version — the live doctrine page (`/fr/doctrine/{slug}` from Story 1.11) serves the latest non-superseded row

**Given** `moderator_role = 'editor'`
**When** they attempt to publish doctrine
**Then** the action is blocked (doctrine publication requires `senior_editor` or `admin`)

**Given** a Vitest suite under `src/app/[lang]/admin/__tests__/doctrine-editor.test.ts`
**When** executed
**Then** it covers: load current doctrine, version bump, supersede previous, changelog recorded, editor role blocked, MDX preview renders

---

### Story 5.8: Moderator action API — `PATCH /v2/flags/{id}` + `POST /v2/revisions`

As a platform maintainer who automates workflows,
I want server-side API endpoints for flag resolution and revision publication, authenticated via service-role admin client,
So that moderator actions can be triggered programmatically and integrate with future automation (FR15, FR16).

**Acceptance Criteria:**

**Given** `PATCH /v2/flags/{id}` does not yet exist
**When** I create it at `src/app/api/v2/flags/[id]/route.ts` following the 3-layer pattern
**Then** it accepts `{ status, moderator_notes }` and applies the state-machine transition

**Given** `PATCH /v2/flags/{id}`
**When** the request does not carry a valid Supabase Auth session with `moderator_role ∈ {editor|senior_editor|admin}`
**Then** it responds `403 UNAUTHORIZED`

**Given** a valid moderator request
**When** the transition is valid
**Then** it updates the flag, inserts an `audit_log` entry, and returns `200` with the updated flag in the response envelope

**Given** `POST /v2/revisions` does not yet exist
**When** I create it at `src/app/api/v2/revisions/route.ts`
**Then** it accepts `{ entity_type, entity_id, draft_jsonb, reason, linked_flag_ids? }` and publishes a revision (same transaction as Story 5.6)

**Given** `POST /v2/revisions`
**When** the caller's `moderator_role` is not `senior_editor` or `admin`
**Then** it responds `403 UNAUTHORIZED`

**Given** both endpoints
**When** OpenAPI spec is read
**Then** `src/lib/api/openapiV2.ts` includes both endpoints with schemas, auth requirements, and error taxonomy

**Given** a Vitest suite under `src/app/api/v2/flags/__tests__/patch.test.ts` and `src/app/api/v2/revisions/__tests__/`
**When** executed
**Then** coverage includes: unauth rejected, editor-only rejection for revisions, valid transition, invalid transition, revision publication atomicity, OpenAPI schema match

---

### Story 5.9: Email notifications on flag state change

As a contributor who submitted a flag,
I want to receive an email when my flag is accepted, rejected, or marked as duplicate — with the moderator's rationale,
So that I know my contribution was reviewed and understand the outcome (FR15 contributor side).

**Acceptance Criteria:**

**Given** no email notification system exists
**When** I implement it
**Then** I create `src/lib/email/flagNotification.ts` with a `sendFlagResolutionEmail(flag, contributor)` function using Supabase Auth SMTP (or Resend SDK if configured via `RESEND_API_KEY`) — the implementation detects which is available at runtime

**Given** a flag transitions to `accepted`
**When** the trigger fires (in Story 5.4 server action or Story 5.8 API)
**Then** the contributor receives an email with subject "Votre signalement {public_slug} a été accepté", body including: moderator notes, link to `/fr/signalements/{public_slug}`, and link to the updated fiche

**Given** a flag transitions to `rejected`
**When** the email sends
**Then** the subject is "Votre signalement {public_slug} a été examiné", body includes moderator notes and a link to the flag page — tone is neutral, never confrontational

**Given** a flag transitions to `duplicate`
**When** the email sends
**Then** the subject is "Votre signalement {public_slug} — doublon détecté", body includes the original flag link that this duplicates

**Given** the contributor has erased their account (Story 4.4)
**When** the flag is resolved
**Then** no email is sent (no `contributor_id` → no email address)

**Given** the email fails to send (SMTP error, Resend 5xx)
**When** the failure occurs
**Then** it is logged via `src/lib/api/logger.ts` + Sentry, the flag state transition is NOT rolled back (email is best-effort, not transactional)

**Given** `.env.example`
**When** updated
**Then** documents `RESEND_API_KEY` (optional — falls back to Supabase SMTP)

**Given** a Vitest suite under `src/lib/email/__tests__/flagNotification.test.ts`
**When** executed with mocked email transport
**Then** it covers: accepted email, rejected email, duplicate email, erased contributor skipped, SMTP error handled gracefully

---

### Story 5.10: Moderator audit log view `/fr/admin/journal`

As a senior editor or admin,
I want a searchable, filterable view of every editorial action (flag reviews, revision publications, doctrine updates, contributor erasures, role changes),
So that editorial accountability is fully transparent and auditable (FR41).

**Acceptance Criteria:**

**Given** `/fr/admin/journal/page.tsx` does not yet exist
**When** I create it (protected by Story 5.2 middleware)
**Then** it renders `audit_log` entries sorted by `created_at DESC` with cursor-based pagination (50 per page)

**Given** each row
**When** rendered
**Then** it shows: actor display name (from `contributor_profiles`), action label (French: "a examiné un signalement", "a publié une révision", etc.), target link (to flag / revision / doctrine / contributor as applicable), `details_jsonb` summary, and timestamp as absolute French date + relative time ("16 avr. 2026 · il y a 2h")

**Given** the filter bar
**When** rendered
**Then** it has: action-type multi-select (5 action values), actor text-search, date-range picker, and target-type filter

**Given** filters are applied
**When** the URL updates
**Then** filter state is reflected in search params (bookmarkable)

**Given** the `details_jsonb` column
**When** a row is expanded (click or keyboard Enter)
**Then** a collapsible panel renders the full JSON payload formatted as key-value pairs (not raw JSON)

**Given** `moderator_role = 'editor'`
**When** they access `/fr/admin/journal`
**Then** they see the log (read-only access for all moderator roles)

**Given** axe-core
**When** run
**Then** zero serious/critical; table rows have proper `role="row"`, filter controls are labeled, and collapsible panels use `aria-expanded`

**Given** a Vitest suite
**When** executed
**Then** it covers: pagination, filter combinations, expanded detail render, and role access (editor can read, non-moderator rejected)

---

## Epic 6: Public API & Developer Portal (Module #3)

**Epic goal:** Third-party developers consume a fully documented, rate-limited, versioned REST API (`/v2/*`) with a self-service developer portal, interactive Swagger UI, API-key management, and machine-readable feeds — the public data layer that turns Africa History into a platform for researchers, apps, and civic-tech projects.

### Story 6.1: OpenAPI 3.1 spec completion + `openapi-diff` CI gate

As a platform maintainer,
I want the OpenAPI spec in `src/lib/api/openapiV2.ts` upgraded to OpenAPI 3.1, covering every `/v2` endpoint with request/response schemas, and a CI gate that fails PRs which change response shapes without updating the spec,
So that the API contract is always in sync with the implementation (FR33).

**Acceptance Criteria:**

**Given** `src/lib/api/openapiV2.ts` currently covers a subset of `/v2` endpoints
**When** I audit and complete it
**Then** every `/v2` route (language-families, peoples, countries, search, flags, flags/{id}, revisions, feed/revisions) has a full entry with: path, method, summary, parameters (query + path), request body schema (for POST/PATCH), response schemas (200/201/400/401/403/404/429/503), and the error taxonomy envelope `{ data, meta, errors }`

**Given** the spec version
**When** I upgrade from OpenAPI 3.0 to 3.1
**Then** JSON Schema compatibility is leveraged: `nullable` is replaced with `type: ["string", "null"]`, `examples` use the 3.1 array form, and `$ref` siblings are allowed

**Given** the CI pipeline
**When** I add an `openapi-diff` step to the GitHub Actions workflow
**Then** it runs `openapi-diff` (or `oasdiff`) comparing the PR's spec against `main` and fails with a blocking check if any breaking change is detected (removed endpoint, narrowed response field, changed required status)

**Given** a non-breaking change (e.g., new optional field added to response)
**When** `openapi-diff` runs
**Then** it passes with a warning annotation, not a failure

**Given** the spec is exported as a static JSON file
**When** I add `scripts/export-openapi.ts`
**Then** it writes `public/openapi.json` from `openapiV2.ts` at build time, accessible at `/{base}/openapi.json`

**Given** a Vitest suite under `src/lib/api/__tests__/openapiV2.test.ts`
**When** executed
**Then** it validates the spec against the OpenAPI 3.1 JSON Schema (using `@readme/openapi-parser` or `ajv`) and asserts every route file under `src/app/api/v2/` has a matching spec entry

---

### Story 6.2: Developer portal `/fr/api` — interactive Swagger UI

As a third-party developer,
I want an interactive API documentation page where I can browse endpoints, see schemas, and try requests directly from the browser,
So that I can understand and test the API without reading raw JSON (FR34).

**Acceptance Criteria:**

**Given** `/fr/api/page.tsx` does not yet exist
**When** I create it
**Then** it renders an interactive API explorer powered by Scalar (`@scalar/api-reference`) loading `public/openapi.json` (Story 6.1)

**Given** the Scalar component
**When** it mounts
**Then** it displays: grouped endpoints by tag (Peoples, Countries, Families, Search, Flags, Revisions, Feed), request/response schemas with expandable examples, and a "Try it" panel for each endpoint

**Given** the "Try it" panel
**When** the developer fills in parameters and clicks "Send"
**Then** the request is sent to the live `/v2` API from the browser, and the raw response is displayed with syntax highlighting and status code

**Given** the portal page layout
**When** rendered
**Then** a sidebar navigation lists all endpoint groups, a header shows "API Africa History — v2", and a footer links to the getting-started guide (Story 6.9) and the OpenAPI JSON URL

**Given** the page is responsive
**When** viewed on mobile (< 768px)
**Then** the sidebar collapses into a hamburger menu, the "Try it" panel stacks below the schema, and all content remains readable

**Given** authentication context
**When** the developer has an API key (Story 6.7)
**Then** they can enter it in the Scalar auth panel and all "Try it" requests include the `X-API-Key` header

**Given** SEO
**When** the page renders server-side
**Then** `<title>` is "API Documentation — Africa History", `<meta name="description">` is "REST API publique pour les données ethnographiques et linguistiques africaines", and `<meta name="robots" content="index,follow">`

**Given** axe-core
**When** run
**Then** zero serious/critical violations; Scalar component's interactive elements are keyboard-operable (FR44)

---

### Story 6.3: API versioning headers + strategy documentation

As a developer integrating the API,
I want every `/v2` response to carry version and deprecation headers so my integration can detect upcoming breaking changes,
So that I can plan migrations before endpoints are retired (FR35).

**Acceptance Criteria:**

**Given** no versioning headers exist on `/v2` responses
**When** I add middleware at `src/lib/api/versioning.ts`
**Then** every `/v2` response includes: `X-API-Version: 2`, `X-API-Stable: true`

**Given** a future deprecation scenario
**When** a `/v2` endpoint is marked for sunset
**Then** the middleware reads a `SUNSET_ENDPOINTS` config map and adds `Deprecation: true` + `Sunset: {ISO-8601 date}` + `Link: <{migration-guide-url}>; rel="sunset"` headers per RFC 8594

**Given** the `SUNSET_ENDPOINTS` config
**When** I define it at `src/lib/api/sunsetConfig.ts`
**Then** it exports a `Map<string, { sunset: string, migrationUrl: string }>` — currently empty (no deprecated endpoints yet)

**Given** the versioning strategy documentation
**When** I create `/fr/api/versioning/page.tsx`
**Then** it renders an MDX page documenting: semver-style major versions in path (`/v2`, `/v3`), minor additions are non-breaking (new fields, new endpoints), deprecation timeline (minimum 6 months from `Deprecation` header to `Sunset` date), and the header semantics

**Given** the middleware is applied
**When** I integrate it into the existing CORS + response utility pipeline
**Then** it runs after CORS but before response serialization, and the headers appear on all `/v2` responses including error responses

**Given** a Vitest suite under `src/lib/api/__tests__/versioning.test.ts`
**When** executed
**Then** it covers: `X-API-Version` present on success response, present on error response, `Deprecation` + `Sunset` headers when endpoint is in sunset config, and absent when not

---

### Story 6.4: Public API rate-limiting via Upstash — anonymous + keyed tiers

As a platform maintainer,
I want anonymous API requests limited to 60/min and API-key holders to 600/min or 3000/min depending on tier, enforced via Upstash sliding-window at the edge,
So that the API remains available under load without requiring authentication for basic usage (FR36).

**Acceptance Criteria:**

**Given** the existing Upstash rate-limiter setup (Story 4.11 for flags)
**When** I create `src/lib/ratelimit/apiRateLimit.ts`
**Then** it defines three tiers: `anonymous` (60 / 1 min, keyed by IP), `standard` (600 / 1 min, keyed by API key), `premium` (3000 / 1 min, keyed by API key)

**Given** a `/v2` request without an `X-API-Key` header
**When** the rate-limiter runs
**Then** the `anonymous` tier applies, keyed by `request.headers.get('x-forwarded-for') || request.ip`

**Given** a `/v2` request with a valid `X-API-Key` header
**When** the limiter looks up the key in `api_keys` (Story 6.7)
**Then** the key's tier (`standard` or `premium`) applies

**Given** an invalid or revoked API key
**When** the limiter checks
**Then** it falls back to `anonymous` tier (does not reject — the key is simply ignored) and the response includes `X-RateLimit-Key-Status: invalid`

**Given** any rate-limited response
**When** the limit is exceeded
**Then** the response is `429 RATE_LIMITED` with headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`

**Given** successful requests
**When** the response is sent
**Then** `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers are always present (even when under limit)

**Given** an Upstash outage
**When** Redis is unreachable
**Then** the handler logs via `src/lib/api/logger.ts`, increments a Sentry breadcrumb, and allows the request (fail-open, same as Story 4.11)

**Given** the rate-limiter middleware
**When** integrated into the `/v2` route pipeline
**Then** it runs before the handler (early rejection) and after CORS (so preflight OPTIONS are never rate-limited)

**Given** a Vitest suite under `src/lib/ratelimit/__tests__/apiRateLimit.test.ts`
**When** executed with mocked Upstash
**Then** it covers: anonymous under/over limit, standard key under/over, premium key, invalid key fallback, Upstash outage fail-open, rate-limit headers present on all responses

---

### Story 6.5: Response envelope + error taxonomy audit across all `/v2` endpoints

As a developer,
I want every `/v2` endpoint to return a consistent envelope `{ data, meta: { license, attribution, pinned_url?, total?, cursor? }, errors: [] }` with the 9-code error taxonomy,
So that my integration can use a single response parser for all endpoints (FR37).

**Acceptance Criteria:**

**Given** `src/api/v2/utils/response.ts` defines the response envelope
**When** I audit it
**Then** it exports `buildSuccessResponse(data, meta?)` and `buildErrorResponse(errors[])` where each error is `{ code, message, field? }` and `code` is one of: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHENTICATED`, `UNAUTHORIZED`, `RATE_LIMITED`, `CONFLICT`, `INTERNAL_ERROR`, `UNAVAILABLE`, `METHOD_NOT_ALLOWED`

**Given** the `meta` object
**When** present on success responses
**Then** it always includes `license: "CC-BY-SA-4.0"` and `attribution: "Africa History — africahistory.org"`, plus optional `total` (for list endpoints), `cursor` (for paginated), and `pinned_url` (for entity detail)

**Given** every existing `/v2` handler (language-families, peoples, countries, search)
**When** I audit response shapes
**Then** any that deviate from the envelope are updated: raw arrays → `{ data: [...], meta }`, missing `license` → added, inconsistent error shapes → aligned

**Given** the flags endpoints (Story 4.9) and revisions endpoint (Story 5.8)
**When** verified
**Then** they already follow the envelope (written after the standard was defined)

**Given** HTTP status codes
**When** I audit
**Then** every handler maps: 200 (success list/detail), 201 (created), 400 (validation), 401 (unauthenticated), 403 (unauthorized), 404 (not found), 429 (rate-limited), 500 (internal), 503 (unavailable)

**Given** an integration test at `src/app/api/v2/__tests__/envelope-conformance.test.ts`
**When** executed
**Then** it imports every route handler, calls each with valid + invalid payloads, and asserts: (a) success responses match `{ data, meta: { license, attribution } }` shape, (b) error responses match `{ errors: [{ code, message }] }` shape, (c) no route returns a raw array or untyped error string

---

### Story 6.6: Full-text search endpoint `GET /v2/search`

As a developer building an app on Africa History data,
I want `GET /v2/search?q={query}&type={peoples|families|countries}&limit=&cursor=` to return ranked, highlighted results via Postgres full-text search,
So that my app can offer search without scraping the frontend (FR38).

**Acceptance Criteria:**

**Given** `src/app/api/v2/search/route.ts` exists but serves the frontend search
**When** I audit it
**Then** it already uses `websearch_to_tsquery('french', q)` against `search_vector` — I ensure it follows the 3-layer pattern and returns the response envelope

**Given** the `q` parameter
**When** empty or missing
**Then** the response is `400 VALIDATION_ERROR` with `{ errors: [{ code: 'VALIDATION_ERROR', message: 'le paramètre q est requis', field: 'q' }] }`

**Given** a valid query
**When** executed
**Then** results are ranked by `ts_rank_cd(search_vector, query)` DESC with cursor-based pagination (default `limit = 20`, max `100`)

**Given** the `type` filter
**When** provided (e.g., `?type=peoples`)
**Then** results are filtered to `entity_type = 'peoples'` — when omitted, all entity types are searched

**Given** each result object
**When** serialized
**Then** it includes: `entity_type`, `entity_id`, `slug`, `title` (entity name), `headline` (Postgres `ts_headline` with `<mark>` tags for matched terms), `score` (float), `url` (canonical path e.g., `/fr/peuples/{slug}`)

**Given** the `meta` object
**When** returned
**Then** it includes `total` (total matching rows), `cursor` (for next page), `query_parsed` (the tsquery string for debugging), plus standard `license` and `attribution`

**Given** a query with special characters or SQL injection attempts
**When** processed
**Then** `websearch_to_tsquery` sanitizes the input (Postgres built-in), and no raw SQL interpolation occurs

**Given** a Vitest suite under `src/app/api/v2/search/__tests__/`
**When** executed
**Then** it covers: missing q, valid query with results, empty results, type filter, pagination cursor, headline highlighting, and special-character input

---

### Story 6.7: API key self-service — `api_keys` table + management UI + key-in-header auth

As a developer who wants higher rate limits,
I want to create and manage API keys from a self-service portal page, and use the key in an `X-API-Key` header to authenticate requests,
So that I can build production integrations without hitting anonymous rate limits (FR36, FR33).

**Acceptance Criteria:**

**Given** migration 013 does not yet exist
**When** I create it
**Then** `api_keys(id uuid pk, owner_id references auth.users, name text, key_hash text unique, key_prefix text, tier ∈ {standard|premium} default 'standard', created_at, last_used_at, revoked_at nullable, request_count bigint default 0)` is defined

**Given** API key generation
**When** a key is created
**Then** the raw key is returned once (format: `afh_live_{32-char-hex}`), only the SHA-256 hash is stored in `key_hash`, and `key_prefix` stores the first 8 characters for display purposes

**Given** RLS on `api_keys`
**When** authenticated
**Then** users can `SELECT` and `UPDATE` (revoke) only their own keys; `INSERT` is allowed for authenticated users; `DELETE` is denied (soft-revoke only)

**Given** `/fr/api/cles/page.tsx` does not yet exist
**When** I create it (requires Supabase Auth session)
**Then** it renders: list of the user's keys (name, prefix `afh_live_8a3f...`, tier badge, created date, last used, request count), a "Créer une clé" button, and a "Révoquer" action per key

**Given** "Créer une clé" is clicked
**When** the form submits
**Then** a modal shows the raw key exactly once with a "Copier" button and a warning "cette clé ne sera plus affichée — copiez-la maintenant"

**Given** "Révoquer" is clicked
**When** confirmed (type `RÉVOQUER`)
**Then** `revoked_at = now()` is set and the key stops working immediately (rate-limiter in Story 6.4 checks `revoked_at IS NULL`)

**Given** `premium` tier
**When** a developer wants it
**Then** tier upgrade requires manual approval by an admin (Story 5.1 `moderator_role = 'admin'`) — the UI shows "contactez-nous pour un accès premium" with a mailto link

**Given** a Vitest suite under `src/app/api/v2/__tests__/apiKeys.test.ts` and `src/app/[lang]/api/__tests__/cles.test.tsx`
**When** executed
**Then** it covers: key creation returns raw key once, hash verification matches, RLS owner-only, revoked key rejected by rate-limiter, and UI renders key list

---

### Story 6.8: Atom + JSON feed `GET /v2/feed/revisions`

As a researcher monitoring Africa History updates,
I want a machine-readable feed of published revisions available in Atom XML and JSON formats,
So that I can subscribe in my feed reader or poll for changes programmatically (FR33).

**Acceptance Criteria:**

**Given** `src/app/api/v2/feed/revisions/route.ts` does not yet exist
**When** I create it following the 3-layer pattern
**Then** it returns the latest published revisions from the `revisions` table sorted by `published_at DESC` with cursor-based pagination (default 20, max 100)

**Given** the `Accept` header
**When** it contains `application/atom+xml` or `application/xml`
**Then** the response is Atom 1.0 XML with `<feed>`, `<entry>` per revision (title = entity name + " v{n}", content = `reason`, link = pinned URL, updated = `published_at`, author = moderator display name or "équipe éditoriale")

**Given** the `Accept` header
**When** it contains `application/json` or `*/*`
**Then** the response is the standard JSON envelope `{ data: [{ entity_type, entity_id, slug, version, reason, published_at, pinned_url, moderator_display_name }], meta: { cursor, license, attribution } }`

**Given** the Atom feed
**When** validated against the Atom 1.0 schema
**Then** it passes with no errors (valid `<id>`, `<updated>`, `<link rel="self">`)

**Given** caching
**When** the feed is requested
**Then** ISR with `revalidate: 300` (5 min) applies; `pg_notify` from Story 3.3 is not wired here (feed latency of 5 min is acceptable)

**Given** OpenAPI spec
**When** updated
**Then** the feed endpoint is documented with both content types and example responses

**Given** a Vitest suite under `src/app/api/v2/feed/__tests__/revisions.test.ts`
**When** executed
**Then** it covers: JSON format, Atom XML format, pagination cursor, empty feed, Accept-header negotiation, and Atom schema validity

---

### Story 6.9: Getting-started guide + code examples on developer portal

As a developer new to the Africa History API,
I want a step-by-step guide with curl, JavaScript, and Python examples on the developer portal,
So that I can make my first API call in under 5 minutes (FR34).

**Acceptance Criteria:**

**Given** `/fr/api/guide/page.tsx` does not yet exist
**When** I create it as an MDX page via `@next/mdx`
**Then** it renders a structured guide with sections: "Introduction", "Authentification", "Première requête", "Pagination", "Recherche", "Signalements", "Flux de révisions", "Limites de débit", "Licence & Attribution"

**Given** the "Première requête" section
**When** rendered
**Then** it shows three tabbed code blocks (curl / JavaScript fetch / Python requests) calling `GET /v2/peoples?limit=5` with the expected JSON response

**Given** the "Authentification" section
**When** rendered
**Then** it explains: anonymous access (60 req/min), API-key access (header `X-API-Key: afh_live_...`), and links to `/fr/api/cles` for key creation

**Given** the "Pagination" section
**When** rendered
**Then** it shows a cursor-based pagination example: first request → `meta.cursor`, second request with `?cursor={value}`

**Given** the "Licence & Attribution" section
**When** rendered
**Then** it states CC-BY-SA-4.0, required attribution format, and links to the full license text

**Given** every code example
**When** rendered
**Then** it uses syntax-highlighted `<pre><code>` blocks with a "Copier" button (reuse Scalar's or shadcn `CodeBlock`)

**Given** the guide is linked
**When** from the developer portal (Story 6.2) sidebar and footer
**Then** a "Guide de démarrage" link is present

**Given** axe-core
**When** run
**Then** zero serious/critical; code blocks have `aria-label`, tab panels use `role="tabpanel"` (FR44)

---

### Story 6.10: API contract tests + integration test suite

As a platform maintainer,
I want a comprehensive integration test suite that verifies every `/v2` endpoint against the OpenAPI spec at CI time,
So that spec drift and regressions are caught before merge (FR33 cross-cutting).

**Acceptance Criteria:**

**Given** `src/app/api/v2/__tests__/contract.test.ts` does not yet exist
**When** I create it
**Then** it imports the OpenAPI spec from `src/lib/api/openapiV2.ts` and dynamically generates test cases for every `path + method` combination

**Given** each generated test
**When** it runs
**Then** it: (a) calls the route handler with valid parameters, (b) asserts the response status matches a documented success code, (c) validates the response body against the OpenAPI schema using `ajv` (JSON Schema validation)

**Given** error paths
**When** tested
**Then** each endpoint is called with invalid parameters (missing required, wrong type, unknown query param) and the response is validated against the documented error schema

**Given** the 429 rate-limit path
**When** tested
**Then** the test mocks Upstash to trigger rate-limit and asserts `429` + `Retry-After` header + error envelope

**Given** the contract test suite
**When** integrated into CI
**Then** it runs as part of `npm run api-tests` and the GitHub Actions workflow (alongside `openapi-diff` from Story 6.1)

**Given** a new endpoint is added
**When** a developer adds a route without updating the OpenAPI spec
**Then** the test in Story 6.1 (route-to-spec mapping) fails, and if they add the spec entry without matching the implementation, the contract test fails — both directions are covered

**Given** test isolation
**When** the suite runs
**Then** each test uses a fresh Supabase test schema (via `supabase db reset` or transaction rollback) so tests do not depend on prior state

**Given** the suite passes
**When** CI reports
**Then** coverage reports show every `/v2` endpoint exercised with at least success + validation-error + not-found paths

---
