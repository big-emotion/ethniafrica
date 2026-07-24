# ADR-0003: Supabase and Prismic content ownership

- **Status**: Accepted
- **Date**: 2026-07-24
- **Issue**: [ETNI-399](https://big-emotion.atlassian.net/browse/ETNI-399)

## Context

EthniAfrica needs editorial flexibility without creating two competing sources
of truth. AFRIK data has strict identifiers, relationships, source requirements,
confidence metadata, and revision history. Prismic is suited to optional
editorial presentation, but duplicating AFRIK facts there would allow the
website, database, and public API to disagree.

The integration therefore needs an explicit ownership boundary and a stable key
for attaching editorial content to a canonical AFRIK entity.

## Decision

Supabase remains the canonical store for AFRIK domain data. Prismic is an
optional French editorial overlay used only when presenting that canonical data
on the website.

### Ownership matrix

| Content or responsibility                                          | Owner    | Rule                                                                 |
| ------------------------------------------------------------------ | -------- | -------------------------------------------------------------------- |
| AFRIK identifiers                                                  | Supabase | Canonical and immutable                                              |
| Structured names and endonyms                                      | Supabase | Never replaced by editorial fields                                   |
| Family → language → people → country relationships                 | Supabase | Never modeled or inferred in Prismic                                 |
| Demographic values and reference years                             | Supabase | Subject to AFRIK validation rules                                    |
| Factual assertions, sources, source tiers, and confidence metadata | Supabase | Prismic must not restate or override them                            |
| Revisions, contribution history, and audit records                 | Supabase | Prismic publication history is not an AFRIK audit trail              |
| `/api/v2` response data                                            | Supabase | The public API does not read from or depend on Prismic               |
| French headings and introductions                                  | Prismic  | Optional presentation only                                           |
| French narrative rich text                                         | Prismic  | Optional and must not introduce canonical factual assertions         |
| Media presentation                                                 | Prismic  | Optional assets, captions, and layout; not evidence for AFRIK claims |
| French SEO title, description, and social image copy               | Prismic  | Optional presentation only                                           |

If editorial content conflicts with Supabase, Supabase wins and the conflicting
Prismic content must not be rendered.

### Stable `afrik_id` contract

Each Prismic editorial document that decorates an AFRIK entity stores one
required `afrik_id`. Its value is the exact canonical identifier from Supabase:

| Entity            | Contract                | Example     |
| ----------------- | ----------------------- | ----------- |
| Linguistic family | AFRIK family identifier | `FLG_BANTU` |
| Language          | ISO 639-3 identifier    | `swa`       |
| People            | AFRIK people identifier | `PPL_BETE`  |
| Country           | ISO 3166-1 alpha-3 code | `COM`       |

`afrik_id` is a join key, not an editable label. It must preserve case and value
exactly, must not be generated from a name or URL slug, and must not be replaced
by a Prismic document ID or UID. Renaming editorial content therefore does not
change the link to Supabase. An editorial document whose `afrik_id` does not
resolve to an existing entity is invalid and must not create an entity,
relationship, or public API record.

### Publication validation

Before an editorial document can be published:

1. Its `afrik_id` must be unique among overlays for that entity type.
2. The identifier must resolve to exactly one canonical Supabase entity of the
   expected type.
3. The document model and content must contain no duplicate canonical fields,
   including structured names, endonyms, relationships, demographics, factual
   assertions, sources, confidence, or revision data.

Several new or updated editorial pages may be bundled in a Prismic Release for
coordinated publication. Releases cannot unpublish pages, so removals and
emergency fallback use the individual unpublish flow.

### Read boundaries

- Domain reads, AFRIK validation, search, exports, moderation, and audit flows
  read Supabase only.
- Website entity pages read their canonical entity from Supabase first, then may
  look up one optional Prismic overlay by the exact `afrik_id`.

Supabase-only rendering is the safe baseline for every state:

| Prismic overlay state               | Website entity page behavior                                       |
| ----------------------------------- | ------------------------------------------------------------------ |
| Present, published, and valid       | Render canonical Supabase data with the optional editorial overlay |
| Missing                             | Render canonical Supabase data only                                |
| Unpublished or archived             | Render canonical Supabase data only                                |
| Invalid or non-resolving `afrik_id` | Ignore the overlay and render canonical Supabase data only         |
| Prismic unavailable                 | Render canonical Supabase data only                                |

An editorial failure must never make an AFRIK entity unavailable.

### Cache boundaries and invalidation

Supabase and Prismic use separate Next.js cache tags:

| Source   | Tags                                                                 | Dependents                                                                   |
| -------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Supabase | `afrik-peoples`, `afrik-language-families`, `afrik-countries`        | AFRIK reads, matching entity pages, and `/api/v2`                            |
| Prismic  | `prismic` with `force-cache` for published editorial content         | Optional editorial overlays on combined entity pages                         |
| Combined | The relevant `afrik-*` tag and the distinct `prismic` tag together   | Website entity pages that render canonical data plus an editorial overlay    |
| API      | The relevant `afrik-*` tags only; never the `prismic` tag or content | `/api/v2` routes, handlers, services, and their public cache representations |

Prismic publish and unpublish webhooks must call a server-only revalidation
endpoint. The endpoint must validate the configured webhook secret before
revalidating the `prismic` tag; invalid requests must have no cache effect.
Only published Prismic content enters the shared `force-cache`. Draft content
must never populate or replace a public shared cache entry.

### Preview isolation

A full-website preview uses Prismic's temporary preview ref and cookie to
combine a draft editorial overlay with published canonical Supabase data.
Preview responses must be private and `no-store`, bypassing public shared
caches. A preview must not alter the canonical Supabase read, populate the
published `prismic` cache, affect `/api/v2`, or become visible outside its
preview session.

### Public API independence

The `/api/v2` service, handler, and route layers remain backed by Supabase. They
must not query Prismic, expose Prismic document identifiers, merge editorial
fields into responses, or fail because Prismic is unavailable. Adding or
removing a Prismic overlay is therefore not a public API contract change.

### Delivery and recovery lifecycle

The delivery flow is:

1. Validate uniqueness and resolution of `afrik_id` and reject canonical
   duplicate fields.
2. Preview the draft against published canonical Supabase data using the
   isolated preview session.
3. Publish the document, or optionally publish a Release containing coordinated
   new and updated pages.
4. Accept the publish webhook only after secret validation and revalidate the
   `prismic` tag.
5. Let the next public entity-page request compose fresh published Prismic
   editorial content with its independently cached canonical Supabase data.

Recovery never changes Supabase:

- For immediate Supabase-only fallback, unpublish the affected Prismic document.
  The secret-validated unpublish webhook revalidates the `prismic` tag so the
  next public entity-page request omits the overlay.
- To restore editorial content, restore the prior Prismic version as a draft,
  validate and preview it, then republish it. The publish webhook revalidates the
  `prismic` tag again.
- A Prismic editorial action never rolls back identifiers, relationships,
  demographics, assertions, revisions, audit records, or any other canonical
  Supabase data.
- `/api/v2` remains Supabase-only and unchanged during publication, unpublish,
  restoration, Prismic downtime, and webhook processing.

### Credentials

All privileged credentials are server-only. In particular,
`SUPABASE_SERVICE_ROLE_KEY`, any private Prismic access token, and webhook
secrets must never enter a client component, browser bundle, public environment
variable, log, or API response. Browser access may use only the existing
Supabase anonymous client under its row-level security policy. Prismic preview
refs and cookies are temporary preview-session data, not persistent AFRIK
credentials or identifiers.

### Language invariant

EthniAfrica is French-only (`Language = "fr"`). Prismic editorial models and
queries support only the French presentation. This decision must not introduce
English, Spanish, or Portuguese branches, locale switching, or translations of
canonical AFRIK data.

## Consequences

- Editors can improve French presentation without becoming custodians of AFRIK
  facts.
- AFRIK validation, auditability, exports, and `/api/v2` remain deterministic
  and independent of Prismic availability.
- Every editorial integration must validate and resolve `afrik_id` against
  Supabase before rendering.
- Editorial content cannot define relationships or factual claims, even when
  doing so would simplify a Prismic model.
