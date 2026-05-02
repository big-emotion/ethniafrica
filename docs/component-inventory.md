# Component Inventory — EthniAfrica

Components organized by purpose. All UI builds on shadcn/ui (Radix) primitives — never introduce a competing component library.

## UI Primitives (`src/components/ui/`)

shadcn/ui-generated Radix wrappers. Examples:

- **Layout/Containers:** `card`, `sheet`, `drawer`, `dialog`, `alert-dialog`, `sidebar`, `resizable`, `scroll-area`, `separator`, `aspect-ratio`, `tabs`, `collapsible`, `accordion`
- **Form:** `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `slider`, `label`, `form`, `input-otp`
- **Display:** `badge`, `avatar`, `alert`, `skeleton`, `progress`, `toast`, `sonner`, `toaster`, `tooltip`, `hover-card`, `popover`, `table`, `chart`, `calendar`
- **Navigation:** `breadcrumb`, `navigation-menu`, `menubar`, `dropdown-menu`, `context-menu`, `pagination`, `command`, `carousel`
- **Misc:** `button`, `toggle`, `toggle-group`
- **Storybook stories** colocated for: `badge`, `button`, `card`, `dialog`, `input`, `progress`, `select`, `separator`, `skeleton`, `table`, `tabs`

## Layout (`src/components/layout/`)

- `DesktopNavBar.tsx` — fixed top navigation (desktop)
- `MobileMenu.tsx` — burger menu (mobile)
- `PageLayout.tsx` — shared page chrome

Also top-level: `MobileNavBar.tsx`, `LanguageSelector.tsx` (not currently wired into nav), `TypeformPreload.tsx`.

## Pages (`src/components/pages/`)

Page-level content wrappers composed into `src/app/[lang]/`:

- `FamillesPageContent.tsx` — language families list
- `PaysPageContentV2.tsx` — countries list (V2)
- `PeuplesPageContent.tsx` — peoples list
- `SearchPageContent.tsx` — search page

## Views (`src/components/views/`)

List view implementations:

- `CountryView.tsx`
- `LanguageFamilyView.tsx`
- `PeopleView.tsx`

## Detail Orchestrators (`src/components/detail/`)

- `CountryDetailViewV2.tsx` — orchestrates 8 scrollable sections ("Carte vivante" variant)
- `LanguageFamilyDetailView.tsx`
- `PeopleDetailView.tsx`

## Country Page Sections (`src/components/country/`)

The "Carte vivante" country page is composed of dedicated section components:

- `CountryHero.tsx`
- `EtymologyBlock.tsx`
- `OriginBanner.tsx`
- `HistoryTimeline.tsx`
- `HistoricalFactsSection.tsx`
- `PeoplesSection.tsx`
- `KingdomsSection.tsx`
- `LanguagesSection.tsx`
- `CultureGrid.tsx`
- `SourcesFooter.tsx`
- `index.ts` — barrel export

Data flows through `src/lib/countryDataTransformer.ts` (9 transform functions). Design tokens: `src/styles/country-tokens.css`.

## Search (`src/components/search/`)

- `SearchModalV2.tsx`

## Charts (`src/components/charts/`)

- `DemographicsChart.tsx` (+ Storybook story) — recharts-based

## Contribution (`src/components/`)

- `ContributionForm.tsx`
- `ContributionFormFields.tsx`

## Shared Hooks (`src/hooks/`)

- `use-list-view.ts` — shared list-view logic (prefer extending over reimplementing)

## Component Guidelines

- Server Components by default; add `"use client"` only when needed (state, effects, browser APIs, event handlers).
- Mobile-first: design at 320–430px first, then tablet `md` 720px, then desktop `xl` 800px.
- shadcn/ui is canonical — extend, do not replace.
- Tests are colocated as `*.test.tsx` in the component's folder or a nearby `__tests__/`.
