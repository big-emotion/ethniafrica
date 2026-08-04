# ADR-0005: Scoped style CSP exceptions

- **Status**: Accepted
- **Date**: 2026-07-29
- **Issue**: ETNI-543 (`[14.6] Visual-parity pass against the reference`)

## Context

`HomeHero`, `DottedContinent`, and `HubCard` (Epic 14 home page,
`src/app/[lang]/page.tsx`) set static CSS via the `style={{...}}` React prop,
which renders as a literal `style="..."` HTML attribute. CSP's `style-src`
nonce covers `<style>` elements and `<link rel="stylesheet">`, but not the
`style` attribute — that is governed by the separate `style-src-attr`
directive, which has no browser-supported way to scope individual attributes
by nonce in practice. Serving these components therefore requires
`style-src-attr 'unsafe-inline'`.

A first pass added this directive unconditionally in
`src/middleware.ts`, applying it to every route in every environment,
including production admin and API routes that have no inline `style`
attributes at all.

## Decision

Scope `style-src-attr 'unsafe-inline'` to the exact route that needs it
(`pathname === "/fr"`, the only route that renders `HomeHero` /
`DottedContinent` / `HubCard`) via `STYLE_ATTR_UNSAFE_INLINE_ROUTES` in
`applySecurityHeaders`.

Next.js 16 also emits two stable runtime `<style>` payloads and one stable
`next/image` style attribute without propagating the request nonce. Permit only
their exact SHA-256 hashes. All routes receive the two runtime hashes through
`style-src`; routes other than `/fr` receive `style-src-attr 'unsafe-hashes'`
with the single image attribute hash. This keeps `/api/v2/*`, `/fr/admin/*`,
and other non-home routes free from a general inline-style allowance.

## Consequences

**Positive**

- The CSP relaxation's blast radius is limited to the one route that
  actually needs it, instead of the entire production site.
- Next.js runtime styles are allowed by exact content hash instead of a broad
  source expression.
- `src/__tests__/middleware.test.ts` asserts both that `/fr` receives the
  scoped directive and that other routes receive only the exact hash
  exception, guarding against silent re-widening.

**Negative**

- `/fr` still ships `'unsafe-inline'` for style attributes, which remains a
  real (if scoped) weakening versus a pure nonce-only policy.
- A Next.js runtime change that alters one of the hashed payloads requires an
  explicit hash update after the new payload has been reviewed.

**Aside**

- `script-src` also gains `'unsafe-eval'` outside production
  (`process.env.NODE_ENV !== "production"`) in the same `applySecurityHeaders`
  change. This is unrelated to the `style-src-attr` scoping above: Next.js dev
  mode's HMR/Fast Refresh runtime relies on `eval`-based module evaluation,
  which a strict `script-src` blocks. It never applies in production.

**Follow-up (not resolved here)**

- Refactor `HomeHero`, `DottedContinent`, and `HubCard` to move their static
  inline styles into Tailwind classes or a nonce'd `<style>` element, which
  would let `/fr` drop `style-src-attr` entirely. Out of scope for this PR
  (ETNI-543 is a visual-parity test PR; that refactor touches component
  files outside its reviewed diff).
