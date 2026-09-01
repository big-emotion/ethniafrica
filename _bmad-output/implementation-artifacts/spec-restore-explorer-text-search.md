---
title: "Restore text search in Explorer facets"
type: "bugfix"
created: "2026-09-01"
status: "done"
baseline_commit: "0c07a576c0a190b454a23eeda6d27ccf81b9b9b5"
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Countries, Peoples, and Language Families Explorer facets lost their text-search control when their former client directories were replaced by server-rendered facet pages. Readers can still narrow with selects, but can no longer find an entity by typing its name.

**Approach:** Restore one optional native search field in the shared GET filter bar and carry a conventional `q` parameter through each facet's server-side selection, map index, pagination, and filter links. Reuse the existing database text-search path for peoples; filter the already-loaded 54-country and 24-family rosters with the existing accent normalizer.

## Boundaries & Constraints

**Always:** Work test-first; keep the three views server-rendered and addressable by URL; keep list, count, pagination, empty state, and globe index under the exact same search selection; make matching case- and accent-insensitive where filtering is local; render the search control full-width first on mobile 320–430px, then allow the existing filter row to compact at tablet and desktop widths; preserve existing filters when searching and reset pagination to page 1.

**Ask First:** Any database/schema migration, search-ranking redesign, change to existing facet parameter meanings, or layout redesign beyond restoring the missing control.

**Never:** Reintroduce the retired client directories, fetch the whole peoples corpus into the browser, filter only the currently loaded page, replace the dedicated cross-entity search page, or modify unrelated corpus/data work.

## I/O & Edge-Case Matrix

| Scenario                     | Input / State                                                                                      | Expected Output / Behavior                                                                                | Error Handling                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Text search                  | Submit a non-empty `q` on any facet                                                                | URL, list, count, empty state, and globe index describe only matches; other active filters remain applied | No match renders the facet's existing empty state    |
| Normalized local match       | `q=benin` for “Bénin” or `q=mande` for “Mandé”                                                     | Country/family match despite case or accents; IDs also remain searchable                                  | N/A                                                  |
| Blank search                 | Missing, empty, or whitespace-only `q`                                                             | Behaves as the unsearched facet and does not create an active narrowing                                   | N/A                                                  |
| Pagination/filter navigation | Search is active and reader pages, changes page size, selects a facet, uses A–Z, or uses the globe | `q` is preserved; applying a new narrowing starts at page 1                                               | Invalid/stale page keeps the existing clamp behavior |

</frozen-after-approval>

## Code Map

- `src/components/hubs/facets/FacetFilterBar.tsx` -- shared server GET form used by all three facets; currently supports selects only.
- `src/components/hubs/facets/__tests__/FacetFilterBar.test.tsx` -- shared accessibility, layout, submission, and preservation contract.
- `src/app/[lang]/explorer/{pays,peuples,familles}/page.tsx` -- parse `q`, build each selection, and compose all facet URLs.
- `src/app/[lang]/explorer/{pays,peuples,familles}/__tests__/facet-page.test.tsx` -- route-level contracts for list/map/pagination/filter consistency.
- `src/api/v2/services/countryFacet.ts` -- whole-roster country selection and local normalized matching.
- `src/api/v2/services/peoplesFacet.ts` -- maps facet state to the existing `PeopleQueryFilters.search` database capability.
- `src/api/v2/services/__tests__/{countryFacet,peoplesFacetService}.test.ts` -- normalized country matching and peoples list/map query propagation.

## Tasks & Acceptance

**Execution:**

- [x] `src/components/hubs/facets/__tests__/FacetFilterBar.test.tsx` -- first add failing contracts for an accessible, URL-valued search input outside the folded filters, with a mobile-first full row and 44px minimum target.
- [x] `src/components/hubs/facets/FacetFilterBar.tsx` -- add the smallest optional `searchField` contract and native `input type="search"` rendering.
- [x] `src/api/v2/services/__tests__/{countryFacet,peoplesFacetService}.test.ts` -- first add failing cases for accent/case/ID matching and identical peoples filters for list and globe index.
- [x] `src/api/v2/services/{countryFacet,peoplesFacet}.ts` -- implement local country filtering and forward peoples search to the existing query layer.
- [x] `src/app/[lang]/explorer/{pays,peuples,familles}/__tests__/facet-page.test.tsx` -- first lock parsing, combined filters, empty state, page reset, and `q` preservation in all generated addresses.
- [x] `src/app/[lang]/explorer/{pays,peuples,familles}/page.tsx` -- add the per-facet label/placeholder and keep search selection consistent across list, map, filters, and pagination.
- [x] `e2e/explorer-facet-search.spec.ts` -- add a stable cross-viewport smoke path for the three visible controls and GET navigation if the local test data supports deterministic assertions.

**Acceptance Criteria:**

- Given any Explorer facet at 320–430px, when it renders, then its labelled text-search field is visible before the select controls without horizontal overflow.
- Given a country, people, or family query, when the filter form is submitted, then the first result page and URL reflect `q` while retaining the other selected facets.
- Given an active search, when the reader pages, changes page size, removes a folded filter, selects a letter, or narrows from the globe, then the address retains `q` and the list and globe remain consistent.
- Given `benin` or `mande`, when local country/family matching runs, then accented names match; given an entity ID, the corresponding local entity also matches.

## Spec Change Log

## Design Notes

Use one native GET control in the existing server component. On mobile it takes a full first row; from `md` onward it can share the wrapping row with the primary select and actions. This keeps the no-JavaScript/addressable behavior and avoids introducing client state for a server-filtered list.

## Verification

**Commands:**

- `npx vitest run src/components/hubs/facets/__tests__/FacetFilterBar.test.tsx src/api/v2/services/__tests__/countryFacet.test.ts src/api/v2/services/__tests__/peoplesFacetService.test.ts src/app/'[lang]'/explorer/pays/__tests__/facet-page.test.tsx src/app/'[lang]'/explorer/peuples/__tests__/facet-page.test.tsx src/app/'[lang]'/explorer/familles/__tests__/facet-page.test.tsx` -- all targeted regression tests pass.
- `npm run typecheck` -- TypeScript passes.
- `npm run lint -- --no-cache` -- affected source remains lint-clean.
- `npx playwright test e2e/explorer-facet-search.spec.ts` -- cross-viewport smoke passes when deterministic local data is available.

**Manual checks (if no CLI):**

- Inspect `/fr/explorer/pays`, `/fr/explorer/peuples`, and `/fr/explorer/familles` at 320, 430, 768, and 1200px: search is visible, controls do not overflow, submission updates the URL and narrows both cards and globe content.

## Suggested Review Order

**Shared GET control**

- Start with the optional native search contract and mobile-first layout.
  [`FacetFilterBar.tsx:106`](../../src/components/hubs/facets/FacetFilterBar.tsx#L106)

**Selection semantics**

- Countries combine normalized name/ID search with the existing family filter.
  [`countryFacet.ts:122`](../../src/api/v2/services/countryFacet.ts#L122)

- Peoples forward one trimmed search to both list and globe queries.
  [`peoplesFacet.ts:72`](../../src/api/v2/services/peoplesFacet.ts#L72)

- Families normalize their small local roster before paging and map publication.
  [`familles/page.tsx:96`](../../src/app/[lang]/explorer/familles/page.tsx#L96)

**Route and address propagation**

- Peoples compose `q` through paging, A–Z, chips, sizes, and globe narrowing.
  [`peuples/page.tsx:76`](../../src/app/[lang]/explorer/peuples/page.tsx#L76)

- Countries parse `q`, preserve it when removing sort, and bind the control.
  [`pays/page.tsx:99`](../../src/app/[lang]/explorer/pays/page.tsx#L99)

- Each route exposes a facet-specific accessible search label and placeholder.
  [`peuples/page.tsx:238`](../../src/app/[lang]/explorer/peuples/page.tsx#L238)

**Regression coverage**

- Shared tests lock URL synchronization, native semantics, 44px target, and responsive row.
  [`FacetFilterBar.test.tsx:63`](../../src/components/hubs/facets/__tests__/FacetFilterBar.test.tsx#L63)

- Service tests lock accent/ID matching, intersections, and list/map parity.
  [`countryFacet.test.ts:155`](../../src/api/v2/services/__tests__/countryFacet.test.ts#L155)

- Route tests lock combined filters and every generated `q` address.
  [`facet-page.test.tsx:398`](../../src/app/[lang]/explorer/peuples/__tests__/facet-page.test.tsx#L398)

- Browser smoke verifies native GET navigation and 320–1200px responsive behavior.
  [`explorer-facet-search.spec.ts:20`](../../e2e/explorer-facet-search.spec.ts#L20)
