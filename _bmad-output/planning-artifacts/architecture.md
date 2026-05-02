---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
lastStep: 8
status: "complete"
completedAt: "2026-04-15"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-vision.md
  - _bmad-output/planning-artifacts/product-brief-vision.distillate.md
  - _bmad-output/project-context.md
  - docs/index.md
  - docs/project-overview.md
  - docs/architecture.md
  - docs/data-models.md
  - docs/api-contracts.md
  - docs/component-inventory.md
  - docs/development-guide.md
  - docs/source-tree-analysis.md
workflowType: "architecture"
project_name: "ethniafrica"
user_name: "Jnk"
date: "2026-04-15"
projectContext: "brownfield"
projectType: "web_app + api_backend"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements — 46 FRs in 9 categories** (what the system must do)

| Category                             | FRs     | Architectural implication                                                                                                                                                                               |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content Discovery & Exploration      | FR1–5   | Existing Next.js App Router + `src/app/[lang]/[section]/[item]` + AFRIK Supabase queries; no new surface needed at MVP                                                                                  |
| Source Transparency & Confidence     | FR6–11  | **New data model** — `sources`, `source_assertion_links`, `confidence_scores`, `verification_log` tables; confidence recomputation pipeline; UI surface exposing score above the fold                   |
| Public Contribution & Moderation     | FR12–17 | **New data model** — `flags` (per-assertion), `flag_statuses`, `moderation_actions`; public flag URL namespace (`/fr/flags/{id}`); SSO-gated moderator queue; notification pipeline                     |
| Content Versioning & Citation        | FR18–21 | **New data model** — `fiche_revisions` (immutable, append-only); pinned-version URL routing `@v{n}` (`noindex`); citation-block generator; diff view                                                    |
| Editorial Governance & Doctrine      | FR22–25 | **MDX-rendered, versioned doctrine** (`/fr/doctrine` + `doctrine_versions` table); `classificationStatus` enum wired at data model, schema validation, UI banner, and CI audit                          |
| Data Quality & Automation            | FR26–32 | **CI gate suite** — GitHub Actions running data-integrity checks against `dataset/source/afrik/**` + Supabase snapshot; weekly URL-health worker; OpenAPI contract-drift check                          |
| Public API & Open Data Reuse         | FR33–38 | API key issuance + hashing; rate-limit tiers (Upstash); attribution metadata envelope; `Sunset`/`Deprecation` headers; changelog/feed endpoint (`/v2/peoples?sinceVerifiedAfter=…`)                     |
| User Account & Contributor Lifecycle | FR39–42 | **Auth transition** — replace `ADMIN_USERNAME/PASSWORD` cookie model with Supabase Auth + OAuth providers (GitHub, Google, ORCID); `user_roles` table; GDPR-compliant deletion with pseudonym retention |
| Accessibility, Platform & Compliance | FR43–46 | Axe-core CI gate; cookie/consent surface; 16+ age gate on signup                                                                                                                                        |

**Non-Functional Requirements — 45 NFRs shape the runtime envelope**

| Axis            | Key constraints                                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance     | LCP ≤ 2.5 s p75 on 4G · API 300 ms p95 cached / 800 ms uncached · ≥ 95 % edge-cache-hit on reference data · Lighthouse mobile ≥ 85                                                                                           |
| Security        | TLS 1.2+, HSTS · **repo-wide static check blocking `src/lib/supabase/admin.ts` imports from client modules (NFR7)** · Supabase-Auth password hashing · salted API-key hashes · CSRF on state-changing admin/moderation calls |
| Scalability     | 100 k MAU on Supabase Pro + Vercel Pro · 1 000 concurrent API connections · 10× corpus (→ 10 k fiches) with no schema change · 20× traffic spike absorbed by edge cache                                                      |
| Accessibility   | WCAG 2.1 AA · VoiceOver + NVDA manual validation per release · 4.5:1 / 3:1 contrast · axe-core CI                                                                                                                            |
| Reliability     | 99.5 % site / 99.9 % API monthly · every mutation durably logged before response · daily backups, RTO ≤ 4 h, RPO ≤ 24 h · 10-min rollback                                                                                    |
| Integration     | OpenAPI 3.1 is contract of record; CI fails on drift · weekly external URL health · additive-only envelope changes within `/v2`                                                                                              |
| Observability   | All server code via `@/lib/api/logger` · Sentry with PII scrubbing · product-health metrics (confidence distribution, audit velocity, flag-resolution time, per-key API usage, CI outcomes)                                  |
| Maintainability | Storybook story + Zod schema + OpenAPI update per new surface (CI-enforced) · test suite ≤ 5 min · content CC-BY-SA-4.0 · code license MIT vs Apache-2.0 — **open decision**                                                 |
| Compliance      | GDPR + GDPR-K (16+) · EAA 2025 · programmatic retention windows                                                                                                                                                              |

**Scale & Complexity**

- Primary domain: **web_app** (Next.js 16 App Router, SSR + edge cache) with a co-equal secondary **api_backend** (REST + OpenAPI 3.1, public developer surface).
- Complexity level: **high** — driven by (a) transversal Module #0 verification fabric bolted onto a brownfield stack, (b) contested-classification governance encoded in the data model, (c) dual identity model (anon readers + session contributors + role-based moderators/admins/advisors), (d) MVP acceptance requires _five_ end-to-end journeys working in production, (e) immutable versioning + pinned-URL semantics as a first-class pedagogical surface.
- Estimated architectural components (new vs. reused):
  - **New tables (~12):** `sources`, `source_assertion_links`, `fiche_revisions`, `confidence_scores`, `verification_log`, `flags`, `moderation_actions`, `doctrine_versions`, `user_roles`, `api_keys`, `api_key_usage`, (optionally) `user_accounts` if not fully served by Supabase Auth.
  - **New API endpoints (~8):** `/v2/flags` (GET/POST/{id}), `/v2/peoples/{id}/revisions`, `/v2/peoples/{id}@v{n}`, `/v2/doctrine`, `/v2/health/verification`, `/v2/internal/moderation/**`, plus extensions to `/v2/peoples` (`minConfidence`, `classificationStatus`, `sinceVerifiedAfter`).
  - **New UI surfaces:** Module #1 People-page fiche (confidence chip + source-chain sheet + flag UI + revision-history sheet + pinned-version banner) · `/fr/doctrine` (MDX) · `/fr/flags` + `/fr/flags/{id}` · `/admin/moderation/**` dashboard · `/docs/api` polish + attribution/keys pages.
  - **New pipelines / workers:** confidence-score recomputation (event-driven on source/flag/revision change), weekly URL health check, CI data-integrity suite, CI OpenAPI drift check, CI Lighthouse / axe-core gates.
  - **Reused wholesale:** 3-layer API (route → handler → service), Supabase client isolation (browser / server / admin), AFRIK parsers & loaders, Carte vivante country page, shadcn/ui primitives, TanStack Query, French-only `Language` type + multi-lang shape.

### Technical Constraints & Dependencies

**Load-bearing invariants (from `_bmad-output/project-context.md`, non-negotiable):**

- **Supabase client isolation** — browser (`client.ts`) / server (`server.ts`) / admin (`admin.ts`, service-role, server-only). New moderation/confidence/flag server code uses `admin.ts`; client reads go through `server.ts`, `afrikLoader`, or `queries/afrik/*`.
- **3-layer API** — route (parsing + CORS + cache) → handler (business logic) → service (Supabase). Module #0 endpoints follow the same pattern; no collapsing.
- **Zod schemas co-located** under `src/api/v2/schemas/` or beside their handler — never inline in route files. OpenAPI spec at `src/lib/api/openapiV2.ts` is the authoritative contract, updated in the same PR.
- **French-only UI, multi-lang shape preserved** — `Language = "fr"`; do not reintroduce `en/es/pt` branches. Reopening is a coordinated change (out of MVP scope).
- **Code-English / UI-French** — all code strings (comments, JSDoc, commits, logger output, Zod messages, errors) in English; only `src/lib/translations.ts` in French.
- **V1 → V2 migration is complete** — do not reintroduce V1 artifacts (`entityKeys.ts`, `datasetLoader.server.ts`, `regions.ts`, `ethnicities.ts`, `types/ethnicity.ts`).
- **Mobile-first (430 / 720 / 800 px)** — every new surface designed at 320–430 px first, then tablet, then desktop.
- **Storybook = `@storybook/react-vite` only** (incompatible with `@storybook/nextjs` under Next 16). Install with `--legacy-peer-deps`. Every new UI primitive ships a story (NFR37, CI-enforced).
- **TDD is mandatory** — failing test precedes the change. `make check` (lint + type-check + tests) before declaring work done.

**Known broken tooling (do not fix incidentally):**

- `npm run lint` (`next lint`) and `npx eslint src/` are broken at root (no working `eslint.config.js` at root despite ESLint 9 + typescript-eslint in `package.json`). Needs a scoped fix before Module #1 ships because Module #1 introduces new UI surfaces that must lint.
- 6 pre-existing failures in `scripts/__tests__/migrateAfrikToDatabase.test.ts` + 4 in handler tests (Supabase mock issues). Out of scope unless explicitly tasked.

**Open architectural decisions flagged by the PRD (to resolve in subsequent steps):**

1. **Code license** — MIT vs Apache-2.0 (NFR41 defers the choice).
2. **Rate-limiting substrate** — Upstash Redis (free tier) vs Vercel Edge Middleware built-in vs Supabase edge function. Decision must respect 300 ms p95 cached SLO (cold-start / geo-latency tradeoff).
3. **Analytics substrate** — Plausible vs self-hosted Umami (PRD prefers cookie-less / GDPR-friendly).
4. **Error tracking** — Sentry free tier (PRD named); self-hosted alternative lower priority.
5. **Content licensing** — CC-BY-SA-4.0 baseline with CC-BY-4.0 fallback pending short legal review. API envelope must make the choice swappable via `meta.license`.
6. **Naming** — "Africa History" vs alternative vs "EthniAfrica" retained. Architecture must assume rebrand is _possible but deferred_; all naming surfaces must be driven from a single config (domain, OG metadata, sitemap canonicals, `meta.attribution`) so the rebrand is a config change + 301 map, not a code sweep.
7. **Pinned-version URL scheme** — `@v{n}` suffix on path segment (`/fr/peuples/PPL_YORUBA@v34`) vs query param vs subpath. PRD uses `@v{n}` literal; Next.js dynamic-route tokenization + edge-cache key implications to validate.
8. **Moderator/contributor identity table** — pure Supabase `auth.users` with `user_metadata.role` vs separate `user_roles` table joined on `auth.uid()`. Latter is more queryable; former is simpler.
9. **Confidence-score recomputation** — synchronous on mutation vs event-driven worker. NFR26 mandates durable logging before response; the score does not need to be recomputed before the response — the mutation does.

### Cross-Cutting Concerns Identified

These span every module and will shape multiple architectural decisions downstream:

1. **Confidence + source-chain fabric on every public read.** Every `GET /v2/peoples/{id}`, `GET /v2/peoples` list item, and every people-page render must carry `confidence`, `verifiedAt`, `sourceCount`, `classificationStatus`, and the full source array on demand. N+1 risk is real (peoples → sources → revisions → flags); mitigated by extending the existing `getCountryRelationsMap()` batching pattern to `getSourcesMap(peopleIds)`, `getConfidenceMap(peopleIds)`, `getFlagsSummaryMap(peopleIds)`, `getLatestRevisionMap(peopleIds)`.

2. **Immutable versioning invariant.** Once a revision is published, its rendered content must be reproducible byte-for-byte at any future date. Consequences:
   - Append-only `fiche_revisions` with a `content_snapshot` JSONB (full denormalized state at revision time, not just a delta).
   - Pinned-version URLs render from the snapshot directly, never from the live entity table.
   - Source / doctrine references from a pinned version must also be resolvable at the pinned state (either denormalized in the snapshot or versioned independently).
   - Confidence score on a pinned version is the score _at publication_, not a live recomputation.

3. **Dual identity model — anonymous readers vs session contributors vs role-scoped moderators/advisors/admins.** Read paths stay anonymous and edge-cached. Write paths (`POST /v2/flags`, `POST /v2/corrections`, `/v2/internal/moderation/**`) require an authenticated session; some additionally require a `role`. The middleware layer (`src/middleware.ts`) must know about this split; the existing admin-cookie model is insufficient — migration to Supabase Auth + OAuth is a prerequisite, not an enhancement.

4. **Attribution + license propagation.** Every API response, every downloaded CSV/Excel row, every pinned-version URL, and every printable fiche view must carry attribution (license string, canonical URL, pinned version or last-verified date). Response-envelope concern — implement once in `src/api/v2/utils/response.ts` and in the download route.

5. **Editorial doctrine linkage on sensitive assertions.** Every fiche assertion tagged `contested` or `colonial-legacy` must render with a banner linking to the current doctrine version _and_ must reference the doctrine version in force when the revision was published (FR25). Requires `doctrine_versions` joined via FK on `fiche_revisions`.

6. **CI as a product surface.** PRD explicitly requires blocking CI gates (FR26–32, NFR29, NFR37–39). Gates are part of the architecture, not ops adjacency — the data-integrity scripts under `scripts/` must be invokable both locally (`tsx scripts/validateAfrikData.ts`) and from GitHub Actions with identical semantics. Drift between local and CI is a credibility incident.

7. **Mobile-first + perf budget — non-negotiable.** Every new UI surface (flag form, moderation queue, revision sheet, pinned-version banner, doctrine link) must respect the 430 px design width and the ≤ 500 KB / LCP ≤ 2.5 s budget. Non-critical client components lazy-load; no third-party scripts in the critical path.

8. **Rebrand-readiness.** Single source of truth for product name, canonical domain, attribution string, and OG metadata — probably `src/lib/brand.ts` or env-driven config — so the rebrand (if approved) is a config change plus a 301 map, not a codebase sweep.

9. **Edge caching semantics with mutation.** Stable reference data (families, countries) caches for a day (`s-maxage=86400, immutable`) — still valid. People fiches cache for an hour (`s-maxage=3600`) — needs revisit because confidence scores update on moderation actions. Either shorten the TTL for people fiches or emit per-fiche cache tags and invalidate on moderation commit via Vercel / ISR revalidation.

10. **Open-data feed for third-party discovery (FR38).** `?sinceVerifiedAfter=…` is a pagination-plus-filter pattern, but a true feed (RSS / JSON Feed / Atom over `verifiedAt` desc) may be a better fit for Journey 4 (Thomas pulls weekly). Decision deferred to step-04.

## Starter Template Evaluation

### Decision: No starter template — existing brownfield codebase is the foundation

**Rationale.** EthniAfrica is a brownfield project with a Next.js 16 + Supabase stack in production, public API v2 serving 924 PPL / 24 FLG / 55 country fiches, the "Carte vivante" country-page design system live, and tight rules in `project-context.md` about dependency isolation. The PRD commits to **locking dependency versions at MVP start, deferring major upgrades to Growth** (Technical risks §). Picking a new starter would discard the existing production codebase and its hardened invariants for no benefit.

The existing stack is the starter. Architectural decisions the stack has already committed us to are listed below for the record; the open decisions are what to _add_ to it.

### Primary Technology Domain

**web_app (primary) + api_backend (co-equal)** — Next.js 16 App Router does both in one runtime.

### Locked-in Stack (existing — versions from `package.json`)

| Concern            | Technology                                                      | Version                                                | Source of lock                                                               |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Framework          | Next.js App Router                                              | **16.0.8**                                             | `package.json` · PRD risk mitigation                                         |
| UI runtime         | React                                                           | **18.3.1**                                             | `package.json` · Server Components default, client islands opt-in            |
| Language           | TypeScript                                                      | **5.8.3** (`strict: false`, `strictNullChecks: false`) | `tsconfig.json` · pragmatic choice — do not add `!` assertions               |
| Styling            | Tailwind CSS                                                    | **3.4.17**                                             | `package.json`                                                               |
| UI primitives      | shadcn/ui (Radix)                                               | —                                                      | Generated; extend, never replace                                             |
| Client state       | TanStack Query                                                  | **5.83**                                               | `package.json`                                                               |
| Forms / validation | react-hook-form + Zod                                           | **7.61 / 3.25**                                        | `package.json`                                                               |
| Backend            | Supabase                                                        | `@supabase/supabase-js` **2.81**                       | `package.json` · three-client isolation enforced                             |
| API docs           | swagger-jsdoc + swagger-ui-react                                | **6.2 / 5.30**                                         | `package.json` · OpenAPI spec at `src/lib/api/openapiV2.ts` is authoritative |
| Testing            | Vitest + Testing Library + happy-dom                            | **4 / 16 / 20**                                        | `package.json` · TDD mandatory                                               |
| Storybook          | `@storybook/react-vite`                                         | **8.6**                                                | `.storybook/main.ts` · `@storybook/nextjs` is incompatible with Next 16      |
| Lint / format      | ESLint 9 + typescript-eslint + Prettier 3 + Husky + lint-staged | —                                                      | `package.json` · `next lint` at root is currently broken                     |
| Runtime helpers    | tsx 4.20, dotenv 17                                             | —                                                      | `package.json`                                                               |
| Deploy target      | Vercel (EU region)                                              | —                                                      | `docs/DEPLOYMENT.md`                                                         |

### Architectural Decisions Already Made by the Existing Codebase

These come for free (and are load-bearing) — they're not up for redesign:

- **3-layer API** — `src/app/api/v2/{resource}/route.ts` → `src/api/v2/handlers/` → `src/api/v2/services/`. Route = parsing + CORS + cache; handler = business logic; service = Supabase. No collapsing. New Module #0 endpoints follow the same shape.
- **Three Supabase clients, strictly isolated** — `client.ts` (browser, anon), `server.ts` (SSR/RSC), `admin.ts` (service-role, server-only). Never mixed.
- **Response envelope** formatted via `src/api/v2/utils/response.ts` · Zod validation via `src/api/v2/utils/validation.ts` · CORS via `src/lib/api/cors.ts` · structured logging via `src/lib/api/logger.ts` (never `console.*`).
- **Data model** — `afrik_countries`, `afrik_language_families`, `afrik_languages`, `afrik_peoples`, `afrik_people_countries`, `contributions`. Evolutionary data in JSONB `content` with GIN index — new fields added without migrations.
- **Routing** — `src/app/[lang]/[section]/[item]/page.tsx` with French-only slugs from `src/lib/routing.ts`. UI strings in `src/lib/translations.ts` (multi-lang shape preserved, only `fr` populated).
- **Design system** — "Carte vivante" country page at `src/components/country/*` + `src/lib/countryDataTransformer.ts` + `src/styles/country-tokens.css`. Fraunces + Nunito Sans via `next/font/google`. Breakpoints 430 / 720 / 800 px.
- **Admin middleware** — `src/middleware.ts` gates `/admin/*` via session cookie. Login at `/api/admin/login`.

### New Dependencies to Add (for Module #0 + #1 + #3 scope)

These are not speculative — each maps to a PRD requirement. Specific versions are NOT pinned here; they will be resolved at install time against the locked Next.js 16 / React 18 / TypeScript 5.8 matrix, with compatibility re-verified before Module #0 starts.

| Dependency                                                                                         | Purpose                                                                             | Requirement                         | Install note                                                                                               |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `@supabase/ssr` (if not already installed) + Supabase Auth OAuth providers (GitHub, Google, ORCID) | Replace `ADMIN_USERNAME/PASSWORD` cookie model with SSO for moderators/contributors | FR39–41, Journey 2/3                | GitHub + Google already ship with Supabase; ORCID is a custom OIDC provider — verify Supabase-Auth support |
| `@sentry/nextjs`                                                                                   | Error tracking with PII scrubbing                                                   | NFR34                               | Free tier · Next.js 16 + App Router compatibility verified before MVP starts                               |
| `@upstash/ratelimit` + `@upstash/redis`                                                            | Rate-limit enforcement for anon, contributor, API-key tiers                         | NFR13, Journey 4, PRD Rate limits § | Free tier · edge-middleware-compatible                                                                     |
| `@next/mdx` + `@mdx-js/react` + `remark-gfm`                                                       | Versioned editorial doctrine at `/fr/doctrine` (MVP simplification)                 | FR22–25                             | Rendered server-side, cached `s-maxage=86400`                                                              |
| `@axe-core/react` (dev) + `jest-axe` or `@axe-core/playwright` for CI                              | Accessibility CI gate                                                               | NFR21, FR44                         | CI-only; not shipped to prod                                                                               |
| `@lhci/cli` (Lighthouse CI)                                                                        | Perf budget enforcement (≥ 85 mobile)                                               | NFR1–5                              | CI-only                                                                                                    |
| `pino` or keep existing `@/lib/api/logger` + transport                                             | Structured logs with Sentry transport                                               | NFR33                               | Prefer keeping existing logger and adding a Sentry transport, not swapping loggers                         |
| `react-email` or plain templated strings via Supabase Auth / Resend                                | Transactional emails for flag-resolution notifications (Journey 2)                  | Journey 2                           | MVP: Supabase Auth magic-link + Resend for custom template is enough                                       |
| `@openapi-typescript/cli` (dev)                                                                    | Optional: codegen typed clients from OpenAPI spec; also usable as drift-check       | NFR29                               | Drift check implemented as CI comparing runtime response shapes to spec                                    |

**Explicitly NOT adding at MVP:**

- No SDK (OpenAPI spec suffices — NFR / PRD §API backend).
- No WebSockets / SSE / Ably / Pusher (no real-time at MVP — PRD §Web App).
- No CDN layer in front of Vercel (edge cache + revalidation is enough).
- No CMS (doctrine is MDX in git; fiches are in Supabase).
- No dedicated search engine (Supabase FTS fits ~1 000 fiches at MVP; revisit at 10× — NFR4, NFR16).
- No `@storybook/nextjs` (incompatible with Next 16).

### Bootstrap / One-Time Setup (to run once, tracked as an early implementation story)

These are **not** project init — the project is already initialized. They're the one-time installs introducing Module #0 substrate:

```bash
# New deps (exact versions resolved at install time against locked Next 16 / React 18 / TS 5.8)
npm install @sentry/nextjs @upstash/ratelimit @upstash/redis \
            @next/mdx @mdx-js/react remark-gfm \
            --legacy-peer-deps

npm install -D @lhci/cli @axe-core/playwright \
            --legacy-peer-deps

# Sentry wizard (one-time, interactive) — run after the Sentry account + org are created
npx @sentry/wizard@latest -i nextjs

# Supabase Auth OAuth providers — configured in Supabase Studio, not via CLI.
# Add redirect URLs for localhost:3000 + production domain.

# Upstash — create a Redis DB in the Upstash console, copy URL + token into .env.local
# and Vercel env settings; keys: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

# MDX — add `mdxRs: true` to next.config.ts, register .mdx extension, gate behind /fr/doctrine route
```

**Note:** The `--legacy-peer-deps` flag is required throughout because of the Storybook peer-dep conflict with Next 16 (already documented in `project-context.md`).

**Implementation-story note:** Project initialization is NOT the first implementation story (project is already initialized). The first implementation story is **"Add Module #0 substrate dependencies + Sentry + Upstash + Supabase Auth OAuth providers, verify compatibility with locked Next 16 matrix, establish CI gates"**.

## Core Architectural Decisions

### Decision Priority Analysis

| #   | Decision                                     | Why it's load-bearing                                                             | Reversibility |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| D1  | Confidence/source/flag/revision schema shape | Every downstream module consumes it; wrong shape = full rewrite                   | 🔴 Hard       |
| D2  | Pinned-version URL scheme (`@v{n}`)          | Citations bake URLs into PDFs/papers — format must outlive the site               | 🔴 Hard       |
| D3  | Supabase Auth + role table                   | All moderation, contribution, audit flows depend on this                          | 🟠 Medium     |
| D4  | API envelope + `meta.license`                | Once external consumers start parsing, breaking changes need 12-month deprecation | 🟠 Medium     |
| D5  | Upstash rate-limit substrate                 | Swappable, but touches every v2 route                                             | 🟡 Easy       |
| D6  | CC-BY-SA 4.0 data / MIT code                 | Irrevocable for data once published                                               | 🔴 Hard       |
| D7  | Sentry error tracking                        | Swappable later                                                                   | 🟡 Easy       |
| D8  | Plausible analytics (no cookies)             | Swappable                                                                         | 🟡 Easy       |
| D9  | Vercel EU + Supabase EU regions              | Data-residency promise to African/diaspora users                                  | 🟠 Medium     |

### Data Architecture

**Keep:** existing `afrik_*` tables (familles, langues, peuples, pays) — Module #1 extends, doesn't replace.

**New tables (Module #0 fabric):**

| Table                | Purpose                                  | Key columns                                                                                                                                                                       |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sources`            | Canonical bibliographic entries          | `id`, `type` (primary/secondary/tertiary/ai), `title`, `url`, `pinned_url`, `year`, `author`, `publisher`, `resolvable` (bool, CI-checked), `last_verified_at`                    |
| `assertions`         | Per-claim source chain                   | `id`, `entity_type` (people/country/family/language), `entity_id`, `field_path` (e.g. `demographics.population`), `value_hash`, `source_ids[]`, `notes`                           |
| `confidence_scores`  | Pre-computed per-fiche score             | `entity_type`, `entity_id`, `score` (0–100), `source_count`, `avg_source_quality`, `last_human_audit_at`, `open_flag_count`, `recomputed_at`                                      |
| `flags`              | Public error reports                     | `id`, `entity_type`, `entity_id`, `field_path`, `reporter_contact` (optional), `counter_source_url`, `status` (open/triaged/resolved/rejected), `moderator_id`, `resolution_note` |
| `revisions`          | Immutable pinned-version snapshots       | `id`, `entity_type`, `entity_id`, `version` (int, monotonic per entity), `snapshot_jsonb`, `created_at`, `change_summary`                                                         |
| `editorial_doctrine` | MDX docs stored as DB rows               | `slug`, `title`, `mdx_source`, `version`, `published_at`                                                                                                                          |
| `user_roles`         | Reader / contributor / moderator / admin | `user_id` (→ auth.users), `role` enum                                                                                                                                             |
| `audit_log`          | Moderation actions (append-only)         | `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before_jsonb`, `after_jsonb`, `created_at`                                                                               |

**Revision strategy:** snapshot-on-publish (not on every edit). A new `revisions` row is written when a moderator approves a change → triggers `confidence_scores` recompute via Postgres trigger + enqueues edge-cache invalidation.

**`classificationStatus` enum:** added as column on `afrik_peuples`, `afrik_familles_linguistiques` — values `consensual | contested | colonial-legacy | reconstructive`. Surfaced in UI + API.

**Confidence recomputation:** materialized, not live. Postgres function `recompute_confidence(entity_type, entity_id)` called on (a) new revision publish, (b) flag status change, (c) nightly CI sweep.

**Migration:** one new SQL migration `008_module_zero_fabric.sql` — no backfill needed (empty fabric day one; `confidence_scores` seeded with 0/null for 924 existing fiches, audit queue populates from there).

### Authentication & Security

**Provider:** Supabase Auth (already bundled, no new infra).

**OAuth:** GitHub + Google + ORCID. ORCID is the credibility lever for academic contributors (FR#0-4, editorial doctrine).

**Role model:**

- `reader` (anonymous OK) — read API, submit flags without auth
- `contributor` — propose edits (goes to moderation queue)
- `moderator` — approve/reject flags + contributions, publish revisions
- `admin` — manage roles, doctrine, global settings

**Enforcement layers:**

1. Supabase RLS on `afrik_*`, `flags`, `revisions`, `audit_log` (read = public; write = role-gated)
2. Middleware (`src/middleware.ts`) — already handles admin routes; extend to `/moderate` and contributor gates
3. Admin client (`supabase/admin.ts`) — server-only, service-role — only for jobs & confidence recompute

**Secrets:** no change — `SUPABASE_SERVICE_ROLE_KEY` already exists; add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` + `SENTRY_DSN` + OAuth client IDs.

**CSP + headers:** Next.js middleware sets `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`. No inline scripts outside Next's hashed ones.

### API & Communication Patterns

**Envelope (all v2 responses):**

```json
{
  "data": { ... },
  "meta": {
    "license": "CC-BY-SA-4.0",
    "attribution": "Africa History — africahistory.org",
    "confidence": { "score": 73, "audited_at": "2026-03-12" },
    "version": 4,
    "pinned_url": "https://africahistory.org/peuples/yoruba@v4",
    "deprecation": null
  },
  "errors": []
}
```

**Pinned-version URLs (D2):** `/{lang}/{entity}/{slug}@v{n}` — `@v{n}` routes serve the `revisions.snapshot_jsonb` verbatim, never re-rendered from current data. Sitemap only exposes `@latest`; versioned URLs are indexable on request.

**Rate-limits (Upstash sliding window):**

| Tier              | Limit        | Auth                        |
| ----------------- | ------------ | --------------------------- |
| Anonymous         | 60 req/min   | none                        |
| API key (free)    | 600 req/min  | header `X-API-Key`          |
| API key (partner) | 6000 req/min | header + allowlisted origin |

**Deprecation contract:** `Sunset: <RFC-1123>` + `Deprecation: true` + `Link: <v3-url>; rel="successor-version"`. 12-month minimum per PRD NFR.

**Feed endpoint (FR38):** `GET /api/v2/feed/revisions?since={iso}` — returns paginated revision diffs, Atom + JSON variants. Cursor-based (no offset).

**OpenAPI:** continue authoring in `src/lib/api/openapiV2.ts`; Swagger UI stays at `/docs/api`. Add `security` schemes for API key tier.

### Frontend Architecture

**Module #1 — People page:** new `src/components/people/` mirroring `src/components/country/` (8-section Carte vivante pattern). Reuse `country-tokens.css`; namespace with `--people-*` only for divergent tokens.

**Module #0 UI surface (cross-cutting):**

- `ConfidenceBadge` component (score + audit date + flag count) — placed in every detail hero
- `SourceChip` + `SourceDrawer` — inline citations with primary/secondary/tertiary visual distinction
- `FlagButton` → modal form → POST `/api/v2/flags` (no auth required)
- `VersionPicker` — dropdown switches between `@latest` and prior `@v{n}`
- `ClassificationBanner` — renders when `classificationStatus !== "consensual"`

**Doctrine pages:** `/{lang}/doctrine/{slug}` — MDX from `editorial_doctrine` table, rendered via `@next/mdx` + `remark-gfm`.

**State:** TanStack Query for server state (already in place); no new global store. `useConfidence()` and `useVersion()` hooks live in `src/hooks/`.

**Mobile-first:** 430/720/800 breakpoints unchanged. Module #1 mobile-reviewed at 320–430 px before merge.

**Storybook:** every new Module #0 UI component ships with a `.stories.tsx`. `@storybook/react-vite` (not `@storybook/nextjs`).

**Error/monitoring:** `@sentry/nextjs` — source maps via `SENTRY_AUTH_TOKEN` build step; PII scrubbed (no emails, no IPs beyond country-code).

### Infrastructure & Deployment

| Concern          | Choice                                  | Why                                                                   |
| ---------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Hosting          | **Vercel EU (fra1)**                    | Next.js native, EU data residency, free hobby tier fits solo-dev      |
| Database         | **Supabase EU (eu-central-1)**          | Same region, already set up, RLS native                               |
| Rate-limit store | **Upstash Redis (EU)**                  | Edge-compatible, pay-per-request, no cold infra                       |
| Error tracking   | **Sentry (EU data region)**             | Mature Next.js integration, free tier 5k events/mo                    |
| Analytics        | **Plausible (Cloud EU or self-hosted)** | No cookies = no banner, GDPR-clean, decolonial-aligned                |
| CDN / images     | Vercel built-in + `next/image`          | Already configured                                                    |
| Search           | Postgres full-text (Supabase) for v1    | Avoid Algolia/Meili until needed; tsvector on `peuples.name_variants` |

**CI gates (GitHub Actions):**

1. `make check` (lint + tsc + vitest)
2. Lighthouse CI — mobile score ≥ 90 on `/`, `/pays/{sample}`, `/peuples/{sample}`
3. `@axe-core/playwright` — 0 serious/critical violations on same URLs
4. Data-integrity sweep — scripts flag FLG mismatches, duplicate slugs, pop ≠ 100%, dead source URLs
5. OpenAPI diff — fails build on breaking changes unless commit contains `api-breaking: true` trailer

**Licenses:**

- Code: **MIT** (maximum reuse, zero friction)
- Data: **CC-BY-SA 4.0** (copyleft forces derivative encyclopedias to stay open — aligned with "public commons" mission)
- Editorial doctrine text: **CC-BY 4.0** (attribution-only; allows quoting in academic contexts without share-alike viral scope)

**Naming/rebrand:** deferred — does not block architecture. Tracked in project-brief backlog.

### Decision Impact Analysis

**Unblocked by these decisions:**

- Epics 1 (Module #0), 2 (Module #1), 3 (Module #3) can now be written — schema + routes are concrete.
- Implementation-readiness re-check can proceed once epics exist.

**Reversibility table:**

| Decision                     | 6-month reversal cost                           | 18-month reversal cost                     |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Schema (D1)                  | Medium — migrations + API recompute             | High — external consumers pinned to shapes |
| `@v{n}` URL scheme (D2)      | Medium — redirects possible                     | Very high — printed citations              |
| CC-BY-SA data (D6)           | Medium — relicense requires contributor consent | Impossible after first external fork       |
| Vercel/Supabase hosting      | Low — Next.js is portable                       | Low                                        |
| Upstash / Sentry / Plausible | Low                                             | Low                                        |

**Risks introduced:**

- ORCID OAuth adoption may be slow — fallback: GitHub-only in v1, ORCID added when first academic partner signs.
- Upstash free tier (10k commands/day) insufficient beyond ~50 req/s sustained — upgrade trigger documented.
- Revision-snapshot storage grows unbounded; compression + archival policy deferred to post-MVP (acceptable — 1000 fiches × 10 revisions × 5 KB ≈ 50 MB/yr).

## Implementation Patterns & Consistency Rules

Brownfield reality: most conflict points already have an established answer in this codebase. This section codifies existing conventions + adds patterns Module #0 introduces.

### Patterns Already Established (Kept)

| Area            | Current convention                                                                                                                         | Source of truth        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Code language   | English for code/comments, French for UI                                                                                                   | global CLAUDE.md       |
| DB table naming | `afrik_*` prefix, snake_case, plural (`afrik_peuples`)                                                                                     | `006_afrik_schema.sql` |
| Column naming   | `snake_case` in DB, `camelCase` in TypeScript (explicit mapping in services)                                                               | existing v2 services   |
| File naming     | PascalCase for React components (`CountryHero.tsx`), camelCase for lib (`countryDataTransformer.ts`), kebab for hooks (`use-list-view.ts`) | codebase               |
| API routes      | `/api/v2/{resource}` plural, kebab-case multi-word (`/language-families`)                                                                  | existing routes        |
| Test placement  | Co-located under `__tests__/` beside the code                                                                                              | CLAUDE.md              |
| Path alias      | `@/` → `src/`                                                                                                                              | tsconfig               |
| UI composition  | shadcn/ui primitives, Tailwind utility-first                                                                                               | existing               |
| State           | TanStack Query for server, React state for local; no Redux/Zustand                                                                         | existing               |
| Logging         | `logger` from `@/lib/api/logger`, never `console.*` in API code                                                                            | existing               |

### New Patterns Introduced by Module #0

#### N1. Schema & data naming (new tables)

- Tables prefixed by **domain, not module**: `sources`, `assertions`, `flags`, `revisions`, `confidence_scores`, `audit_log`, `editorial_doctrine`, `user_roles` — no `m0_` or `verification_` prefix.
- Enum columns use Postgres native enums: `classification_status`, `flag_status`, `source_type`, `user_role`.
- Polymorphic FKs via `(entity_type, entity_id)` pair (not table-per-type). `entity_type` is an enum: `'people' | 'country' | 'family' | 'language'`.
- Timestamps: `created_at`, `updated_at`, `*_at` for domain events (`last_verified_at`, `resolved_at`). Always `timestamptz`.
- IDs: `uuid` default `gen_random_uuid()` for new tables. Existing `afrik_*` tables keep their text IDs (`PPL_YORUBA`, etc.).

#### N2. API envelope

Every v2 response must use:

```ts
{ data: T | null, meta: ResponseMeta, errors: ApiError[] }
```

`meta` is required on 2xx responses. `errors` is an array (not a single object), always present, empty on success. One shared helper `createApiResponse(data, meta)` / `createApiError(status, code, message)` in `src/api/v2/utils/response.ts`.

No naked data returns. No `{success: true, ...}`. No mixing conventions across endpoints.

#### N3. JSON field casing

- **DB:** snake_case (Postgres convention)
- **API payload:** camelCase (consumed by TS clients, matches OpenAPI idiom)
- **Mapping layer:** services own the translation — no snake_case leaks past `src/api/v2/services/`.

#### N4. Error structure

```ts
{ code: "FLAG_NOT_FOUND" | "RATE_LIMITED" | "FORBIDDEN" | ..., message: string, field?: string, hint?: string }
```

- `code` is UPPER_SNAKE, stable, documented in OpenAPI.
- User-facing `message` is English in API (client translates to FR); UI-level errors are French.
- Validation errors ship with `field` pointing to the offending path.
- Never leak Postgres error messages or stack traces.

#### N5. Dates

- API: **ISO-8601 UTC strings** (`"2026-04-15T12:34:56Z"`). Never unix timestamps.
- UI: `Intl.DateTimeFormat('fr-FR', ...)` at render time, never store formatted strings.
- DB: `timestamptz`, never `timestamp`.

#### N6. Source citation convention

Every factual claim in `afrik_peuples`, `afrik_pays`, `afrik_familles_linguistiques`, `afrik_langues` must have a corresponding `assertions` row. Enforced by:

1. Postgres trigger on insert/update of demographic/classification fields → rejects if no `assertions` entry exists.
2. CI data-integrity sweep catches legacy rows and populates `confidence_scores.open_flag_count` with unsourced-field count.

Client-side rule: the `SourceChip` component is not optional next to any sourced value in detail pages.

#### N7. Pinned-version URL format

- Canonical shape: `/{lang}/{entity-segment}/{slug}@v{n}` — example `/fr/peuples/yoruba@v4`.
- Lowercase `v`, integer `n`, `@` literal.
- `@latest` and no suffix both resolve to current version (302 → `@v{current}` for `@latest` to make citations stable).
- Version routes are ISR with `revalidate: false` — immutable.
- Current routes are ISR `revalidate: 3600` + on-demand invalidation via Postgres trigger.

#### N8. Confidence score display

- Shown everywhere entity data is shown: API `meta.confidence`, detail page hero, list items, search results.
- Score buckets: `0–39 = low (red)`, `40–69 = medium (amber)`, `70–100 = high (green)`. Shared token `--confidence-{low|medium|high}` in `src/styles/country-tokens.css`.
- Never hidden behind a toggle.

#### N9. Flags & moderation

- Flag submission: no auth required (lowers friction per PRD). Rate-limit: 3/hour/IP for anonymous, 20/hour for authed.
- Moderator actions always write to `audit_log` in the same transaction as the mutation — enforced by service layer, not route.
- Flag status transitions: `open → triaged → (resolved | rejected)`. Backward transitions forbidden (enum-checked).

#### N10. Loading & error UX

- Loading: Suspense boundary per section (8-section Carte vivante layout), never a full-page spinner. Skeletons use the same token `--skeleton-shimmer`.
- Error: `src/app/[lang]/error.tsx` handles route-level; section-level errors render `<SectionError onRetry={reset} />` — never kill the whole page.
- TanStack Query defaults: `retry: 1, retryDelay: 500ms, staleTime: 60_000`. Module #0 flag submissions use `retry: 0` (user-triggered, idempotency via `Idempotency-Key` header).

#### N11. Feature flags

- Env-based flags only for now: `NEXT_PUBLIC_FEATURE_MODULE_ZERO_PUBLIC=true|false`. No runtime toggle service.
- Server-side flags read via `src/lib/featureFlags.ts` (new); client-side via `process.env.NEXT_PUBLIC_*`.

#### N12. Logging

- API routes: `logger.info/warn/error` with `{ route, method, userId?, entityId?, durationMs }` shape.
- Client errors: Sentry only (no `console.error` in production builds — lint rule to add).
- No PII: emails scrubbed, IPs truncated to /24 before logging.

### Enforcement Guidelines

**All AI agents MUST:**

1. Use `createApiResponse` / `createApiError` helpers — never hand-build envelopes.
2. Add an `assertions` row for any factual-field INSERT/UPDATE — or the trigger will reject it.
3. Emit `ConfidenceBadge` on every detail page — checked in component tests.
4. Follow kebab-case for plural API routes, snake_case for DB columns, camelCase for TS — no exceptions.
5. Write tests before code (TDD) — `npm run test` green before commit.

**Automated checks:**

- ESLint custom rule: `no-console` in `src/app/api/**` and `src/api/**`.
- OpenAPI diff in CI — breaking envelope changes fail the build.
- Data-integrity script (`scripts/validateAfrikData.ts` — extend) runs nightly + pre-merge.
- Storybook `.stories.tsx` required for Module #0 UI components — CI check.

### Anti-Patterns (Forbidden)

- Returning `{ success: true, data }` or raw arrays from `/api/v2/*`.
- Using `console.log/error` in `src/api/**` or `src/app/api/**`.
- Fetching Supabase directly from client components (go via TanStack Query → route → service).
- Mixing snake_case into API payloads.
- Hiding the confidence score or source chips behind a setting.
- Adding new top-level route segments without updating `src/lib/routing.ts` + OpenAPI spec.
- Re-introducing V1 entities (`regions`, `ethnicities`, `presences`) — removed, stay removed.

## Project Structure & Boundaries

Brownfield approach: the tree exists. This section documents the additions Module #0 / #1 / #3 introduce and where they slot in, then maps PRD FR categories to locations.

### Complete Project Directory Structure

Post-MVP additions are marked `[+]`.

```
ethniafrica/
├── CLAUDE.md
├── README.md
├── Makefile
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json                          (strict: false — kept)
├── vitest.config.ts
├── .storybook/
│   ├── main.ts                            (framework: @storybook/react-vite)
│   └── preview.ts
├── .github/
│   └── workflows/
│       ├── ci.yml                         (make check + lint)
│       ├── lighthouse.yml                 [+] mobile perf gate
│       ├── a11y.yml                       [+] axe-core via Playwright
│       ├── data-integrity.yml             [+] nightly + pre-merge sweep
│       └── openapi-diff.yml               [+] breaking-change gate
├── env.dist
├── public/
│   ├── DIRECTIVES-AFRIK.md
│   ├── modele-*.txt                       (strict AFRIK models)
│   └── ...
├── dataset/source/afrik/                  (canonical flat-file inputs)
│   ├── famille_linguistique/FLG_*.json
│   ├── peuples/FLG_*/PPL_*.json
│   └── pays/*.json
├── supabase/
│   └── migrations/
│       ├── 006_afrik_schema.sql
│       ├── 007_remove_v1_add_v2_contribution_types.sql
│       ├── 008_module_zero_fabric.sql         [+] sources, assertions, flags, revisions, confidence_scores, audit_log, user_roles, editorial_doctrine
│       ├── 009_classification_status_enum.sql [+] column on afrik_peuples/familles
│       └── 010_assertions_triggers.sql        [+] enforce source-per-claim + recompute fn
├── scripts/
│   ├── migrateAfrikToDatabase.ts
│   ├── validateAfrikData.ts               (extend for Module #0 checks)
│   ├── recomputeConfidence.ts             [+] CLI wrapper for the SQL fn
│   └── seedSources.ts                     [+] initial bibliographic import
├── src/
│   ├── app/
│   │   ├── layout.tsx                     (fr, fonts)
│   │   ├── page.tsx                       (redirect → /fr)
│   │   ├── middleware.ts                  (admin + moderator gates)
│   │   ├── [lang]/
│   │   │   ├── page.tsx
│   │   │   ├── error.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── pays/[slug]/page.tsx
│   │   │   ├── pays/[slug]@v[n]/page.tsx          [+] pinned-version route
│   │   │   ├── peuples/[slug]/page.tsx            [+] Module #1
│   │   │   ├── peuples/[slug]@v[n]/page.tsx       [+]
│   │   │   ├── familles/[slug]/page.tsx
│   │   │   ├── familles/[slug]@v[n]/page.tsx      [+]
│   │   │   ├── recherche/page.tsx
│   │   │   ├── doctrine/[slug]/page.tsx           [+] MDX editorial pages
│   │   │   ├── moderation/page.tsx                [+] queue UI
│   │   │   └── about|contribute|report-error/...
│   │   └── api/
│   │       ├── v2/
│   │       │   ├── peoples/route.ts
│   │       │   ├── peoples/[id]/route.ts
│   │       │   ├── peoples/[id]/revisions/route.ts        [+]
│   │       │   ├── countries/route.ts
│   │       │   ├── countries/[id]/route.ts
│   │       │   ├── language-families/route.ts
│   │       │   ├── language-families/[id]/route.ts
│   │       │   ├── search/route.ts
│   │       │   ├── flags/route.ts                          [+] POST anonymous, GET moderators
│   │       │   ├── flags/[id]/route.ts                     [+] PATCH moderator
│   │       │   ├── sources/route.ts                        [+]
│   │       │   ├── sources/[id]/route.ts                   [+]
│   │       │   ├── confidence/[entityType]/[entityId]/route.ts [+]
│   │       │   ├── feed/revisions/route.ts                 [+] FR38 Atom + JSON
│   │       │   └── __tests__/
│   │       └── admin/... (existing)
│   ├── api/v2/                            (business layer — NOT routes)
│   │   ├── handlers/
│   │   │   ├── peoples.ts
│   │   │   ├── countries.ts
│   │   │   ├── languageFamilies.ts
│   │   │   ├── search.ts
│   │   │   ├── flags.ts                   [+]
│   │   │   ├── sources.ts                 [+]
│   │   │   ├── confidence.ts              [+]
│   │   │   └── revisions.ts               [+]
│   │   ├── services/
│   │   │   ├── peoples.ts
│   │   │   ├── countries.ts
│   │   │   ├── languageFamilies.ts
│   │   │   ├── flags.ts                   [+]
│   │   │   ├── sources.ts                 [+]
│   │   │   ├── confidence.ts              [+]
│   │   │   ├── revisions.ts               [+]
│   │   │   └── auditLog.ts                [+]
│   │   ├── utils/
│   │   │   ├── validation.ts
│   │   │   ├── response.ts                (createApiResponse / createApiError)
│   │   │   ├── rateLimit.ts               [+] Upstash wrapper
│   │   │   └── idempotency.ts             [+] Idempotency-Key handler
│   │   └── README.md | API_REFERENCE.md | ARCHITECTURE.md
│   ├── components/
│   │   ├── ui/                            (shadcn primitives)
│   │   ├── layout/                        (DesktopNavBar, MobileMenu, …)
│   │   ├── views/                         (list views)
│   │   ├── country/                       (Carte vivante — existing)
│   │   ├── people/                        [+] Module #1, mirrors country/
│   │   │   ├── PeopleHero.tsx
│   │   │   ├── PeopleOriginBlock.tsx
│   │   │   ├── PeopleLanguageSection.tsx
│   │   │   ├── PeopleHistoryTimeline.tsx
│   │   │   ├── PeopleCultureGrid.tsx
│   │   │   ├── PeopleRelatedPeoplesSection.tsx
│   │   │   ├── PeopleCountriesSection.tsx
│   │   │   ├── PeopleSourcesFooter.tsx
│   │   │   ├── index.ts
│   │   │   └── __tests__/
│   │   ├── verification/                  [+] Module #0 cross-cutting UI
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   ├── SourceChip.tsx
│   │   │   ├── SourceDrawer.tsx
│   │   │   ├── FlagButton.tsx
│   │   │   ├── FlagDialog.tsx
│   │   │   ├── VersionPicker.tsx
│   │   │   ├── ClassificationBanner.tsx
│   │   │   ├── index.ts
│   │   │   └── __tests__/
│   │   ├── moderation/                    [+] queue, decision forms
│   │   │   ├── FlagQueue.tsx
│   │   │   ├── FlagCard.tsx
│   │   │   ├── DecisionForm.tsx
│   │   │   └── __tests__/
│   │   ├── doctrine/                      [+] MDX wrappers
│   │   │   ├── DoctrineLayout.tsx
│   │   │   ├── mdx-components.tsx
│   │   │   └── __tests__/
│   │   ├── search/
│   │   └── charts/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts | server.ts | admin.ts
│   │   │   └── queries/afrik/...
│   │   ├── api/
│   │   │   ├── openapiV2.ts               (extend with Module #0 schemas)
│   │   │   ├── cors.ts
│   │   │   └── logger.ts
│   │   ├── afrik/
│   │   │   ├── parsers/
│   │   │   └── loaders/
│   │   ├── verification/                  [+]
│   │   │   ├── confidence.ts              (bucket + format helpers)
│   │   │   ├── sourceTypes.ts
│   │   │   └── assertionsSchema.ts        (Zod)
│   │   ├── countryDataTransformer.ts
│   │   ├── peopleDataTransformer.ts       [+]
│   │   ├── featureFlags.ts                [+]
│   │   ├── rateLimit.ts                   [+]
│   │   ├── translations.ts
│   │   └── routing.ts                     (add `peuples`, `doctrine`, pinned-URL helpers)
│   ├── hooks/
│   │   ├── use-list-view.ts
│   │   ├── use-language.tsx
│   │   ├── use-confidence.ts              [+]
│   │   ├── use-version.ts                 [+]
│   │   └── use-flag-submission.ts         [+]
│   ├── styles/
│   │   ├── country-tokens.css             (extend with --confidence-* tokens)
│   │   └── verification-tokens.css        [+] optional split
│   ├── types/
│   │   ├── shared.ts                      (Language = "fr")
│   │   ├── verification.ts                [+] Source, Assertion, Flag, Revision, Confidence
│   │   └── api.ts                         [+] ApiResponse<T>, ApiError, Meta
│   ├── stories/
│   │   └── verification/*.stories.tsx     [+]
│   └── test/                              (test utils, happy-dom setup)
├── docs/
│   ├── architecture.md                    (brownfield snapshot — kept)
│   ├── data-models.md
│   ├── api-contracts.md
│   ├── source-tree-analysis.md
│   ├── component-inventory.md
│   ├── development-guide.md
│   └── DEPLOYMENT.md
└── _bmad-output/
    ├── project-context.md
    └── planning-artifacts/
        ├── prd.md
        ├── architecture.md                ← this document
        ├── epics/                         (upcoming)
        └── ux-design.md                   (upcoming)
```

### Architectural Boundaries

**API boundary (public surface):** only `/api/v2/**`. All handlers gated by `createApiResponse` envelope + CORS middleware. No direct DB exposure. Versioning via path (`v2`), never query string.

**Service boundary:** `src/api/v2/services/*` is the only layer that touches Supabase. Routes never import `@supabase/*` directly. Components never import services — they call routes via TanStack Query.

**Client boundary:** `src/lib/supabase/client.ts` in Client Components only. `server.ts` in Server Components / Route Handlers. `admin.ts` only in scripts and server-side jobs — never in any `'use client'` file. Violations caught by lint rule on `SUPABASE_SERVICE_ROLE_KEY` import.

**Data boundary:** `afrik_*` tables are read-mostly for public API. All mutations go through moderator flow → `revisions` table → cache invalidation hook. Direct `UPDATE afrik_peuples` only in migrations or admin scripts.

**Verification boundary:** `src/lib/verification/` + `src/components/verification/` are cross-cutting, usable by any module. They do not import from `country/`, `people/`, `search/`, etc. — dependencies flow inward.

**Moderation boundary:** `/moderation/**` routes and `src/components/moderation/` require `role IN (moderator, admin)` via `middleware.ts`. Anonymous users can submit flags (`POST /api/v2/flags`) but cannot read the queue.

### Requirements to Structure Mapping

| PRD Area                            | Lives in                                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR#0-1..#0-6 Sources & Verification | `src/app/api/v2/{flags,sources,confidence,feed}/`, `src/api/v2/{handlers,services}/{flags,sources,confidence,revisions,auditLog}.ts`, `src/components/verification/`, `src/lib/verification/`, migrations `008–010` |
| FR#1-\* People page                 | `src/app/[lang]/peuples/[slug]/`, `src/components/people/`, `src/lib/peopleDataTransformer.ts`, `src/api/v2/services/peoples.ts` (extend)                                                                           |
| FR#3-\* Public API formalized       | `src/lib/api/openapiV2.ts`, `/docs/api`, `src/api/v2/utils/rateLimit.ts`, API key management in `supabase/migrations/011_api_keys.sql` [+]                                                                          |
| FR#2-\* Language family page        | `src/app/[lang]/familles/[slug]/`, future `src/components/family/`                                                                                                                                                  |
| FR Moderation workflow              | `src/app/[lang]/moderation/`, `src/components/moderation/`, `middleware.ts`                                                                                                                                         |
| FR Editorial doctrine               | `src/app/[lang]/doctrine/[slug]/`, `src/components/doctrine/`, `editorial_doctrine` table                                                                                                                           |
| Classification enum                 | `src/components/verification/ClassificationBanner.tsx`, column on `afrik_peuples` + `afrik_familles_linguistiques`                                                                                                  |
| Pinned-version URLs                 | `src/app/[lang]/{pays,peuples,familles}/[slug]@v[n]/page.tsx`, `src/lib/routing.ts` helpers                                                                                                                         |
| Feed / RSS                          | `src/app/api/v2/feed/revisions/route.ts`                                                                                                                                                                            |
| Cross-cutting: i18n                 | `src/lib/translations.ts` (French-only), `src/types/shared.ts`                                                                                                                                                      |
| Cross-cutting: mobile-first         | CSS tokens in `src/styles/*-tokens.css`; Storybook viewport presets                                                                                                                                                 |
| Cross-cutting: monitoring           | `sentry.client.config.ts`, `sentry.server.config.ts` [+] at repo root                                                                                                                                               |

### Integration Points

**Internal communication:**

- Client → Server: TanStack Query hooks → `/api/v2/**` fetch → route → handler → service → Supabase.
- Server → Server: Postgres triggers on `revisions` insert → fire `pg_notify('cache_invalidate', payload)` → Next.js revalidation endpoint (`/api/internal/revalidate`) with shared secret.
- Moderation → Audit: same transaction in `services/*.ts`; never split.

**External integrations:**

- Supabase Auth (OAuth: GitHub, Google, ORCID) via `@supabase/supabase-js`.
- Upstash Redis via `@upstash/ratelimit` in `src/lib/rateLimit.ts`.
- Sentry via `@sentry/nextjs` — separate DSNs for client/server.
- Plausible script tag in `src/app/layout.tsx`, env-gated.
- Source URL resolver (nightly CI job) — HEAD-checks every `sources.url`, flips `resolvable` bool.

**Data flow (write path — moderator publishes a fix):**

1. Moderator submits decision via `/moderation` form.
2. `POST /api/v2/flags/[id]` → handler → `flagsService.resolve()`.
3. Service opens transaction: `UPDATE afrik_peuples` → `INSERT INTO revisions` → `INSERT INTO audit_log` → `SELECT recompute_confidence(...)`.
4. Postgres trigger `pg_notify` → Next.js revalidates `/fr/peuples/[slug]` + new `@v{n}` route pre-rendered.
5. Feed endpoint picks up new revision on next poll.

**Data flow (read path — anonymous visitor):**

1. `GET /fr/peuples/yoruba` → Server Component → service → Supabase (RLS: anon read OK).
2. Attach `confidence_scores` row → embed in `meta`.
3. ISR cache 3600s, invalidated on revision publish.

### File Organization Patterns

**Configuration:** all at repo root (`next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, `tsconfig.json`, `.storybook/`). No nested configs.

**Source:** feature-first for UI (`components/{country,people,verification,moderation,...}/`), layer-first for API (`app/api/v2/*` / `api/v2/handlers/` / `api/v2/services/`). Shared primitives in `components/ui/`, shared logic in `lib/`, shared types in `types/`.

**Tests:** co-located in `__tests__/` beside the code. Integration tests for route handlers live at `src/app/api/v2/__tests__/`. No top-level `tests/` directory.

**Static assets:** `public/` only for runtime-served assets; `dataset/source/afrik/` for source-of-truth flat files imported at build/migration time.

### Development Workflow Integration

- Dev server: `npm run dev` → Next.js 16 on :3000; Storybook on `npm run storybook` → :6006.
- Build: `npm run build` → Next.js static/SSR mix; Storybook static build via `build-storybook`.
- Deployment: Vercel auto-deploys `recette` → preview; `main` → prod. Supabase migrations run manually via `supabase db push` (no auto-migrate — too risky for a public-data project).
- Quality gate: `make check` (lint + tsc + vitest) must pass locally before PR. CI runs `make check` + Lighthouse + axe-core + data-integrity + OpenAPI diff.

## Architecture Validation Results

### Coherence Validation

**Decision compatibility:**

- Next.js 16 + `@storybook/react-vite` — confirmed, documented in project-context.
- Supabase Auth + RLS + middleware gates + service-layer enforcement — three-layer defense, no conflict.
- CC-BY-SA data + MIT code + MIT-compatible OSS deps — license-compatible.
- Upstash rate-limit + Vercel edge + Supabase EU — all EU-region, same latency envelope.
- Pinned-version URLs + ISR + `revalidate: false` for `@v{n}` — Next.js 16 supports this.

**One coherence tension resolved:** TanStack Query `retry: 1` default vs Upstash rate-limit strict caps. On 429, retry burns the bucket. Resolution: `retry: (failureCount, error) => failureCount < 1 && error.status !== 429`. Pattern N10 updated.

**Pattern consistency:** naming (snake_case DB ↔ camelCase API), test placement, logging — consistent with brownfield. No contradictions.

**Structure alignment:** 3-layer API already in place, Module #0 additions slot into existing folders. No restructuring required.

### Requirements Coverage Validation

**Module #0 — Sources & Verification (6 capabilities):**

| #   | Capability                                              | Covered by                                                                |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | Per-fiche confidence score displayed                    | `confidence_scores` table, `ConfidenceBadge`, API `meta.confidence`       |
| 2   | Verifiable sources per assertion (URL/page/year, P/S/T) | `sources`, `assertions`, `SourceChip`/`SourceDrawer`, `source_type` enum  |
| 3   | Public error reporting                                  | `flags` table, `POST /api/v2/flags` (no auth), `FlagButton`/`FlagDialog`  |
| 4   | Human review workflow                                   | `/moderation`, `flags.status` state machine, `audit_log`, moderator role  |
| 5   | Automated audit (CI)                                    | `data-integrity.yml`, `validateAfrikData.ts`, nightly source URL resolver |
| 6   | Editorial doctrine, public                              | `editorial_doctrine` table, `/doctrine/[slug]`, MDX rendering             |

**Module #1 — People page:** `src/components/people/` mirrors Carte vivante, transformer + routes + tests defined. ✅

**Module #3 — Public API formalized:** OpenAPI, Swagger UI, rate-limit tiers, API key table (migration 011), deprecation contract, `meta.license`. ✅

**FR38 Feed:** `feed/revisions` endpoint with Atom + JSON. ✅

**PRD user journeys (5):**

- Amina (lycéenne, flags an error) — anonymous flag flow ✅
- Kofi (universitaire, cites with pinned URL) — `@v{n}` immutable routes ✅
- Fatou (diaspora, browses family tree) — Module #2 deferred, but read-path works ⚠️
- Thomas (chercheur, API consumer) — public API + license in meta ✅
- Ngozi (moderator, triages) — `/moderation`, audit log ✅

**NFRs:**

- Mobile-first (430/720/800) ✅ — CI Lighthouse mobile gate
- Performance: Lighthouse ≥ 90 gate ✅
- Security: RLS + CSP + HSTS + Sentry PII scrub ✅
- GDPR: EU regions, no cookies (Plausible), scrubbed logs ✅
- Deprecation: 12-month sunset ✅
- Licensing: CC-BY-SA data, MIT code, CC-BY doctrine ✅

### Implementation Readiness Validation

- **Decision completeness:** versions locked in step 3. ✅
- **Structure completeness:** every new Module #0/#1/#3 file has a path. SQL migrations numbered. CI workflows named. ✅
- **Pattern completeness:** 12 patterns (N1–N12) + 12 kept conventions + anti-patterns + enforcement. ✅

### Gap Analysis Results

**🔴 Critical gaps — resolved inline:**

| #   | Gap                                                            | Resolution                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Anonymous flag spam protection (rate-limit alone insufficient) | Add Cloudflare Turnstile (privacy-friendly, no-tracking CAPTCHA) on `FlagDialog`. New env `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET`.                                                                                                              |
| G2  | API key table schema not defined                               | Migration `011_api_keys.sql`: `api_keys(id, owner_id, key_hash, tier ∈ {free,partner}, origin_allowlist TEXT[], created_at, revoked_at, last_used_at)`. Bcrypt-hashed, never stored plaintext.                                                    |
| G3  | Search architecture unspecified                                | Add `afrik_peuples.search_vector` + `afrik_pays.search_vector` (generated tsvector from `name \|\| endonyms \|\| alt_names`). GIN indexes. `/api/v2/search` uses `websearch_to_tsquery('french', q)`. Ranking by `ts_rank_cd` + confidence boost. |

**🟠 Important gaps — resolve during Epic 1:**

| #   | Gap                            | Resolution                                                                                                             |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| G4  | WCAG target level              | Target **WCAG 2.1 AA**. `@axe-core/playwright` CI blocks on serious/critical.                                          |
| G5  | GDPR data-subject request flow | `flags.reporter_contact` optional; retained 24 months then auto-purged. Email-based DSR handled manually (low volume). |
| G6  | Backup & DR                    | Supabase PITR (Pro plan required). Weekly `pg_dump` to S3 EU. RPO 24h / RTO 4h.                                        |
| G7  | Audit log retention            | Append-only, retained indefinitely on MVP. Revisit at 2 years.                                                         |

**🟡 Nice-to-have gaps (post-MVP):**

- G8 PWA / offline for low-connectivity African readers
- G9 PDF export with embedded pinned-URL citation block
- G10 Internationalization re-enablement (EN/PT diaspora)
- G11 Moderator notifications (email/Matrix when queue > N)

### Architecture Completeness Checklist

**Requirements analysis**

- [x] Project context analyzed (brownfield, 924 PPL, 24 FLG, 55 countries)
- [x] Scale & complexity assessed (~12 new tables, ~10 new endpoints)
- [x] Technical constraints identified (locked stack, French-only, mobile-first)
- [x] Cross-cutting concerns mapped (10 concerns)

**Architectural decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined (Upstash, Sentry, Plausible, Turnstile)
- [x] Performance considerations addressed (ISR, edge cache, rate-limit)

**Implementation patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented (error, loading, feature flags, logging)

**Project structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements → structure mapping complete

### Architecture Readiness Assessment

**Overall status:** READY FOR EPIC DECOMPOSITION

**Confidence level:** HIGH — all Module #0/#1/#3 capabilities have concrete architectural support. 3 critical gaps identified and resolved inline. Remaining gaps sequenceable during early epics.

**Key strengths:**

- Brownfield leverage: ~70% of infrastructure already exists and works.
- Module #0 fabric is the architectural spine — every other module plugs into it.
- Pinned-version URLs + immutable revisions give rare credibility-grade citations.
- Public `meta.license` + feed + OpenAPI make the dataset genuinely reusable.
- Transparent confidence score is non-optional — structurally prevents reverting to "yet-another-AI-site" posture.

**Areas for future enhancement:**

- Internationalization (deferred; diaspora audience will eventually need EN/PT).
- PWA/offline for low-connectivity African readers.
- PDF export for academic citation workflows.
- Language-family tree visualization (Module #2).
- Moderator automation (queue alerts, SLA tracking).

### Implementation Handoff

**AI agent guidelines:**

1. Read this document + `_bmad-output/project-context.md` + PRD before touching code.
2. Follow patterns N1–N12 exactly; deviations need an ADR.
3. Respect boundaries — services are the only Supabase consumers, `@v{n}` routes are immutable, anonymous flags allowed but rate-limited + captcha-gated.
4. TDD: failing test first, then code.
5. Mobile-first: review at 430 px before tablet/desktop.

**First implementation priority — Epic 1, Module #0 Sources & Verification fabric:**

1. Migration `008_module_zero_fabric.sql` (all new tables)
2. Migration `009_classification_status_enum.sql` (column)
3. Migration `010_assertions_triggers.sql` (enforcement + recompute fn)
4. Migration `011_api_keys.sql`
5. Services + handlers + routes for `sources`, `assertions`, `flags`, `confidence`
6. Cross-cutting UI: `ConfidenceBadge`, `SourceChip`, `FlagButton`/`FlagDialog`, `VersionPicker`
7. Seed bibliographic sources (SIL, Glottolog, UNESCO, IWGIA, UN)
8. CI gates: `data-integrity.yml`, `openapi-diff.yml`, `lighthouse.yml`, `a11y.yml`

Only after Module #0 is live do Module #1 (People page) and Module #3 (Public API formalized) unlock their full value.
