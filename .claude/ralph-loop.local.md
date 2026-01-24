---
active: true
iteration: 1
max_iterations: 30
completion_promise: "MIGRATION_V2_FINAL_COMPLETE"
started_at: "2026-01-23T17:21:44Z"
---

Complete the API v1 to v2 migration for EthniAfrica. Execute the following tasks IN ORDER, committing after each task:

## TASK 1: HierarchicalNav Component

Create src/components/HierarchicalNav.tsx:

- Display AFRIK hierarchy: Family → Peoples → Countries
- Use shadcn Accordion for expandable tree structure
- Lazy load data (families first, then peoples on expand, then countries)
- Props: { onSelect: (type: 'family' | 'people' | 'country', id: string) => void }
- Highlight current selection
- Use afrikLoader functions (getLanguageFamilies, getPeoples, getCountries)
- Cache expanded nodes in component state
  COMMIT: git add -A && git commit -m 'feat: add HierarchicalNav component'

## TASK 2: Dedicated Search Page

Create src/app/[lang]/recherche/page.tsx (and localized variants):

- Full-page search experience (not modal)
- Search input with filters: type (family/people/country), language family
- Results list with pagination using afrikLoader.search()
- URL params for shareable search: ?q=bantu&type=people&family=FLG_BANTU
- Support all 4 languages: /fr/recherche, /en/search, /es/buscar, /pt/pesquisa
- Update src/lib/routing.ts to add 'search' page type with localized slugs
- Create src/components/pages/SearchPageContent.tsx for the content
  COMMIT: git add -A && git commit -m 'feat: add dedicated search page'

## TASK 3: Demographics Visualization

Create src/components/DemographicsChart.tsx:

- Use recharts library (install if needed: npm install recharts)
- Support 3 chart types via props:
  - 'byFamily': Pie chart of population by language family
  - 'byCountry': Bar chart of population by country
  - 'peopleDistribution': Bar chart showing a people's distribution across countries
- Props: { type: 'byFamily' | 'byCountry' | 'peopleDistribution', data: any, title?: string }
- Responsive design with proper sizing
- Add ARIA labels for accessibility
- Integrate into PeopleDetailView (section 8 - Demographics)
  COMMIT: git add -A && git commit -m 'feat: add DemographicsChart component'

## TASK 4: Remove API v1 Routes

Delete the following directories and files:

- src/app/api/stats/ (entire directory)
- src/app/api/regions/ (entire directory)
- src/app/api/ethnicities/ (entire directory)
- src/app/api/countries/ (entire directory) - KEEP /api/v2/countries
- src/lib/datasetLoader.ts (if still exists)
- src/lib/api/datasetLoader.server.ts (if still exists)
- src/lib/api/openapiV1.ts (if still exists)

Update src/lib/api/openapi.ts to only reference v2.
Update src/app/docs/api/ pages to redirect to v2 documentation only.
Remove old cache keys from src/lib/cache/clientCache.ts (REGIONS, ETHNICITIES, COUNTRIES if v1).
Run 'npm run type-check' and fix any import errors.
COMMIT: git add -A && git commit -m 'chore: remove API v1 routes and legacy code'

## TASK 5: afrikLoader Tests

Create src/lib/**tests**/afrikLoader.test.ts:

- Test getLanguageFamilies() returns paginated results
- Test getLanguageFamily(id) returns single family with content
- Test getPeoples() returns paginated results
- Test getPeople(id) returns people with all 8 AFRIK sections
- Test getCountries() returns paginated results
- Test getCountry(iso) returns country with AFRIK data
- Test search() returns filtered results by type
- Test error handling (404, network errors)
- Use Vitest and mock fetch calls with vi.fn()
  Run: npm run test src/lib/**tests**/afrikLoader.test.ts
  COMMIT: git add -A && git commit -m 'test: add afrikLoader unit tests'

## TASK 6: Component Tests

Create tests in src/components/**tests**/:

6a. LanguageFamilyView.test.tsx:

- Renders list of families
- Search filtering works
- Selection callback fires on click

6b. PeopleView.test.tsx:

- Renders list of peoples
- Filter by language family works
- Selection callback fires

6c. PeopleDetailView.test.tsx:

- Renders all 8 AFRIK sections correctly
- Handles missing sections gracefully

6d. SearchModalV2.test.tsx:

- Search input triggers API call (debounced)
- Tab filters work
- Result click triggers navigation callback

Use Vitest and @testing-library/react.
Mock afrikLoader functions with vi.mock().
Run: npm run test src/components/**tests**/
COMMIT: git add -A && git commit -m 'test: add v2 component tests'

## VALIDATION

After all tasks, run:

- npm run type-check (must pass)
- npm run lint (must pass)
- npm run test (all tests must pass)
- npm run build (must succeed)

When ALL tasks are complete and validation passes, output: <promise>MIGRATION_V2_FINAL_COMPLETE</promise>
