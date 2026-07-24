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

| Entity            | Contract                | Example      |
| ----------------- | ----------------------- | ------------ |
| Linguistic family | AFRIK family identifier | `FLG_BANTU`  |
| Language          | ISO 639-3 identifier    | `swa`        |
| People            | AFRIK people identifier | `PPL_YORUBA` |
| Country           | ISO 3166-1 alpha-3 code | `COM`        |

`afrik_id` is a join key, not an editable label. It must preserve case and value
exactly, must not be generated from a name or URL slug, and must not be replaced
by a Prismic document ID or UID. Renaming editorial content therefore does not
change the link to Supabase. An editorial document whose `afrik_id` does not
resolve to an existing entity is invalid and must not create an entity,
relationship, or public API record.

### Read boundaries

- Domain reads, AFRIK validation, search, exports, moderation, and audit flows
  read Supabase only.
- Website entity pages read their canonical entity from Supabase first, then may
  look up one optional Prismic overlay by the exact `afrik_id`.
- Missing, unpublished, invalid, or unavailable Prismic content must degrade to
  the Supabase-backed presentation. It must not make an AFRIK entity unavailable.
- Prismic reads may use the Next.js `prismic` cache tag with `force-cache`.
  Published and unpublished changes may trigger a revalidation webhook for that
  tag.
- Full-site previews are an editorial-only view. They use Prismic's temporary
  preview ref and cookie and do not change canonical Supabase reads.

### Public API independence

The `/api/v2` service, handler, and route layers remain backed by Supabase. They
must not query Prismic, expose Prismic document identifiers, merge editorial
fields into responses, or fail because Prismic is unavailable. Adding or
removing a Prismic overlay is therefore not a public API contract change.

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
