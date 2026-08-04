---
title: "Fix direct site navigation loading"
type: "bugfix"
created: "2026-08-04"
status: "done"
baseline_commit: "4f939cafdfbf5e1ab2728dcc79dfd5eba497d675"
context:
  - "{project-root}/_bmad-output/project-context.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Opening or refreshing site pages in a fresh browser can leave the application on `Chargement...` indefinitely. Production sampling confirms the global boundary: dynamically rendered pages receive valid script nonces, while pre-rendered/ISR pages ship nonce-less Next.js bootstrap scripts that the per-request Content Security Policy blocks, preventing hydration.

**Approach:** Preserve the strict nonce-based CSP and make page rendering dynamically request-bound from the root layout with Next.js `connection()`, as required for per-request nonces. Remove conflicting static page opt-ins while retaining data-level caching where already available, then cover representative direct-entry routes in production-mode regression tests.

## Boundaries & Constraints

**Always:** Work test-first; preserve the nonce-based CSP; make the rendering rule global so future pages cannot silently reintroduce incompatible static HTML; retain safe data caching independently of HTML rendering; validate mobile first at 430 px, then tablet at 720 px and desktop at 800 px.

**Ask First:** Any CSP relaxation, migration to experimental hash/SRI CSP, deployment, or unrelated caching redesign requires explicit approval.

**Never:** Add `'unsafe-inline'`; hide loading fallbacks with timeouts; special-case only country pages; change API/data behavior; weaken authentication; refactor unrelated UI.

## I/O & Edge-Case Matrix

| Scenario             | Input / State                                        | Expected Output / Behavior                            | Error Handling                                              |
| -------------------- | ---------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Query-string detail  | Fresh browser opens `/fr/pays?country=COM`           | Country content hydrates and replaces `Chargement...` | Fail on CSP console violation, page error, or timeout       |
| Generic hubs         | Fresh browser opens country, people, and family hubs | Each browsing surface hydrates and is interactive     | No indefinite Suspense fallback                             |
| Search               | Fresh browser opens `/fr/recherche?q=...`            | Search UI hydrates with the URL state                 | Existing empty/error states remain visible when appropriate |
| Static-content page  | Fresh browser opens a legal/about page               | Content renders and client navigation works           | No CSP script rejection                                     |
| Pre-rendered feature | Fresh browser opens names or public reports          | Feature content hydrates under the request nonce      | Existing data error states remain authoritative             |
| Canonical detail     | Fresh browser opens `/fr/pays/COM`                   | Existing detail behavior remains functional           | Existing data error state remains authoritative             |
| Protected page       | Anonymous browser opens a protected route            | Existing authentication redirect occurs               | No security bypass                                          |

</frozen-after-approval>

## Code Map

- `src/app/layout.tsx` -- root rendering boundary; call `connection()` so every page below it renders against the current request nonce.
- `src/middleware.ts` -- creates the per-request nonce and CSP; preserve the strict policy and use as response-test oracle.
- `src/app/[lang]/[section]/page.tsx` -- currently forces ISR for generic hubs and produces the observed cached shell.
- `src/app/[lang]/signalements/page.tsx` -- explicitly force-static route that must not override the global nonce invariant.
- `src/app/[lang]/noms/page.tsx` -- automatically pre-rendered feature and required global regression case.
- `e2e/cross-cutting/direct-navigation-csp.spec.ts` -- new site-wide, mobile-first regression suite.

## Tasks & Acceptance

**Execution:**

- [x] `e2e/cross-cutting/direct-navigation-csp.spec.ts` -- add fresh direct-navigation tests for representative hub, query, content, detail, and protected routes; capture CSP console errors; run against current production to establish red.
- [x] `src/app/layout.tsx` -- await `connection()` at the root so Next.js renders every page against the incoming request and applies its nonce to all executable scripts.
- [x] `src/app/[lang]/[section]/page.tsx` and `src/app/[lang]/signalements/page.tsx` -- remove explicit full-page static/ISR opt-ins that contradict the global nonce invariant; preserve existing data caches such as `unstable_cache`.
- [x] `src/__tests__/middleware.test.ts` -- preserve tests proving that CSP remains nonce-based and excludes `'unsafe-inline'`; add only assertions needed by the global invariant.
- [x] `src/app/[lang]/{pays,peuples,familles}/[slug]/page.tsx` and `src/app/[lang]/doctrine/[slug]/page.tsx` -- remove no-op function props exposed by request-time server rendering while preserving client-side defaults.
- [x] `src/components/pages/RecherchePageContent.tsx` -- replace empty Radix Select item values exposed by successful hydration while preserving empty filter semantics.

**Acceptance Criteria:**

- Given any representative public route in a fresh browser, when it is opened directly, then hydration completes without CSP script violations.
- Given query-string state on a hub or search route, when the page is opened directly, then the URL state is reflected after hydration.
- Given mobile, tablet, and desktop reference viewports, when the direct-navigation suite runs, then all representative public routes pass.
- Given an anonymous request to a protected route, when direct navigation occurs, then the existing login redirect remains enforced.
- Given a production response, when its CSP and executable inline scripts are inspected, then the scripts use the nonce authorized by that same response.

## Spec Change Log

- 2026-08-04: Expanded the human-owned intent from a country-link symptom to all site pages; moved the fix boundary from one ISR route to the global nonce/rendering invariant.
- 2026-08-04: Review validation exposed and fixed invalid empty Radix Select item values on the directly opened search route.

## Design Notes

Next.js requires all pages to be dynamically rendered when CSP uses unique per-request nonces; static optimization, ISR, and partial pre-rendering cannot inject that nonce. `connection()` expresses that invariant once above all page content. Dynamic HTML does not forbid caching Supabase/reference data separately, so existing data-level caches should remain rather than weakening CSP for HTML caching. See the [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy).

## Verification

**Commands:**

- `BASE_URL=https://ethniafrica.com SKIP_WEB_SERVER=1 npx playwright test e2e/cross-cutting/direct-navigation-csp.spec.ts --project=mobile-430 --reporter=line` -- expected before implementation: affected direct routes reproduce the failure.
- `npm run build` -- expected: production build succeeds without static/dynamic configuration conflicts.
- `BASE_URL=http://localhost:3000 SKIP_WEB_SERVER=1 npx playwright test e2e/cross-cutting/direct-navigation-csp.spec.ts --reporter=line` -- expected after implementation: mobile, tablet, and desktop coverage passes against `npm start`.
- `npx vitest run src/__tests__/middleware.test.ts` -- expected: strict nonce CSP tests pass.
- `make check` -- expected: no new failures beyond documented pre-existing failures.

## Suggested Review Order

**Request-bound rendering**

- Bind the entire application tree to each request's CSP nonce.
  [`layout.tsx:72`](../../src/app/layout.tsx#L72)

- Remove the generic hub's conflicting ISR and static parameter exports.
  [`page.tsx:4`](../../src/app/[lang]/[section]/page.tsx#L4)

- Preserve data caching while removing full-page static rendering.
  [`signalements/page.tsx:17`](../../src/app/[lang]/signalements/page.tsx#L17)

- Keep server-rendered details free of non-serializable callback props.
  [`doctrine/[slug]/page.tsx:64`](../../src/app/[lang]/doctrine/[slug]/page.tsx#L64)

**Search hydration stability**

- Normalize the internal all-filter marker when it appears in external URLs.
  [`RecherchePageContent.tsx:148`](../../src/components/pages/RecherchePageContent.tsx#L148)

- Map neutral Radix options without forbidden empty item values.
  [`RecherchePageContent.tsx:413`](../../src/components/pages/RecherchePageContent.tsx#L413)

**Regression coverage**

- Verify nonce parity, script loading, hydration, and direct-entry behavior globally.
  [`direct-navigation-csp.spec.ts:91`](../../e2e/cross-cutting/direct-navigation-csp.spec.ts#L91)

- Prove legal-page navigation remains client-side after direct entry.
  [`direct-navigation-csp.spec.ts:203`](../../e2e/cross-cutting/direct-navigation-csp.spec.ts#L203)

- Lock Radix item and URL-sentinel edge cases with focused unit tests.
  [`RecherchePageContent.test.tsx:190`](../../src/components/pages/__tests__/RecherchePageContent.test.tsx#L190)

- Confirm report data retains one-minute caching without static HTML.
  [`signalements/page.test.tsx:121`](../../src/app/[lang]/signalements/__tests__/page.test.tsx#L121)
