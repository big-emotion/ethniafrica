# ADR-0005: Scoped style CSP exceptions

- **Status**: Accepted
- **Date**: 2026-07-29
- **Issue**: ETNI-543 (`[14.6] Visual-parity pass against the reference`)

## Context

Public fiche components set data-driven CSS through both React `style={{...}}`
attributes and client-injected `<style>` elements. Their values vary with the
entity data, so a fixed hash allowlist is not viable. Attribute styles are
governed by `style-src-attr`, while injected elements are governed by
`style-src`.

A first pass added this directive unconditionally in
`src/middleware.ts`, applying it to every route in every environment,
including production admin and API routes that have no inline `style`
attributes at all.

## Decision

Scope `style-src 'self' 'unsafe-inline'` and
`style-src-attr 'unsafe-inline'` to public localized pages
(`pathname === "/fr" || pathname.startsWith("/fr/")`) in
`applySecurityHeaders`. API and admin routes remain outside that scope and
keep the strict nonce-only style policy.

Next.js 16 also emits two stable runtime `<style>` payloads without propagating
the request nonce. Strict API and admin routes permit only their exact SHA-256
hashes through `style-src`.

## Consequences

**Positive**

- The CSP relaxation is limited to public pages that render the data-driven
  styles, instead of the entire production site.
- Strict API and admin routes allow Next.js runtime styles by exact content
  hash instead of a broad source expression.
- `src/__tests__/middleware.test.ts` asserts that public pages receive the
  scoped directive while API and admin routes do not, guarding against silent
  re-widening.

**Negative**

- Public `/fr` pages ship `'unsafe-inline'` for style elements and attributes,
  which remains a real (if scoped) weakening versus a pure nonce-only policy.
- A Next.js runtime change that alters one of the hashed payloads requires an
  explicit hash update after the new payload has been reviewed.

**Aside**

- `script-src` also gains `'unsafe-eval'` outside production
  (`process.env.NODE_ENV !== "production"`) in the same `applySecurityHeaders`
  change. This is unrelated to the `style-src-attr` scoping above: Next.js dev
  mode's HMR/Fast Refresh runtime relies on `eval`-based module evaluation,
  which a strict `script-src` blocks. It never applies in production.

**Follow-up (not resolved here)**

- Refactor public fiche components to replace data-driven inline styles and
  injected style elements with nonce-aware alternatives. Once complete,
  public pages can drop both scoped exceptions.
