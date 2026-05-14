# Security exceptions

Documented CVEs that we cannot or have intentionally chosen not to fix. Re-evaluate at each Next.js minor bump.

## postcss < 8.5.10 (moderate) — bundled inside `next`

- **Advisory:** [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — XSS via unescaped `</style>` in CSS Stringify Output.
- **Path:** `node_modules/next/node_modules/postcss`. The vulnerable version is bundled inside Next.js itself, not selected by our `package.json`.
- **Why we don't fix:** `npm audit fix --force` would downgrade `next` from 16.x to 9.3.3 — a 7-major regression that breaks the entire application.
- **Mitigation:** the CSP set by `src/middleware.ts` blocks inline scripts and limits `style-src` to `'self'` + nonce, so the XSS sink described in the advisory is not reachable from user-controlled CSS in our deployment. Re-evaluate when Next ships a postcss bump (track Next.js release notes).
- **Owner:** `@security`. Re-check on the first Tuesday of each month or on the next Next.js release.

## Audit baseline

Last `npm audit --audit-level=moderate` (2026-05-14): 0 critical, 0 high, 2 moderate (both rows in this file). 0 high+critical CVEs is the production-readiness target and is met.
