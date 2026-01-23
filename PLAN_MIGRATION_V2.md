# Plan de Migration API v1 → v2 avec Ralph Loop

Ce document contient toutes les étapes et commandes pour migrer le frontend d'EthniAfrica vers l'API v2.

---

## Vue d'ensemble du processus

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSUS DE MIGRATION                        │
└─────────────────────────────────────────────────────────────────┘

Phase 1 : Infrastructure        → Claude Code (interactif)
Phase 2 : Composants liste      → Ralph Loop
Phase 3 : Composants détail     → Ralph Loop
Phase 4 : Pages & Navigation    → Ralph Loop
Phase 5 : Recherche & Accueil   → Ralph Loop
Phase 6 : Nettoyage v1          → Ralph Loop
Phase 7 : Tests                 → Ralph Loop
```

---

## Comment fonctionne Ralph Loop

### Le cycle Ralph

```
1. Tu lances /ralph-loop avec un prompt
2. Claude travaille sur la tâche
3. Claude essaie de terminer
4. Le hook stop intercepte et relance le même prompt
5. Claude voit son travail précédent dans les fichiers
6. Claude améliore/corrige jusqu'à completion
7. Claude écrit <promise>MOT_CLE</promise> pour signaler la fin
8. Ralph détecte le mot-clé et arrête la boucle
```

### Commandes disponibles

```bash
# Démarrer une boucle Ralph
/ralph-loop "PROMPT" --max-iterations N --completion-promise "MOT_CLE"

# Annuler une boucle en cours
/cancel-ralph
```

### Bonnes pratiques

1. **Un objectif clair par loop** - pas de tâches multiples
2. **Critère de succès mesurable** - tests, type-check, lint
3. **Max 10-15 iterations** - évite les boucles infinies
4. **Commit entre chaque loop** - sauvegarde le travail

---

## Phase 1 : Infrastructure (Claude Code interactif)

> **Mode** : Interactif avec Claude Code (pas de Ralph)
> **Raison** : Décisions d'architecture importantes

### Étape 1.1 : Créer les types frontend

```bash
# Demander à Claude Code :
"Crée src/types/afrik-frontend.ts avec les types TypeScript pour le frontend:
- LanguageFamilySummary et LanguageFamilyDetail
- PeopleSummary et PeopleDetail (avec les 8 sections AFRIK)
- CountrySummary et CountryDetail
- SearchResult et SearchFilters
- PaginationMeta
Base-toi sur les types existants dans src/types/afrik.ts"
```

### Étape 1.2 : Créer le data loader v2

```bash
# Demander à Claude Code :
"Crée src/lib/afrikLoader.ts avec les fonctions de fetch vers l'API v2:
- getLanguageFamilies(page?, perPage?)
- getLanguageFamily(id: string)
- getPeoples(page?, perPage?)
- getPeople(id: string)
- getCountries(page?, perPage?)
- getCountry(iso: string)
- search(query, filters)
- getStats() - agrège les totaux depuis les endpoints

Utilise le pattern de l'ancien datasetLoader.ts avec gestion d'erreur.
Ajoute le support du cache client (src/lib/cache/clientCache.ts)."
```

### Étape 1.3 : Mettre à jour les clés de cache

```bash
# Demander à Claude Code :
"Mets à jour src/lib/cache/clientCache.ts pour ajouter les clés v2:
- LANGUAGE_FAMILIES: 'app:v2:language-families'
- PEOPLES: 'app:v2:peoples'
- COUNTRIES_V2: 'app:v2:countries'
- STATS_V2: 'app:v2:stats'"
```

### Validation Phase 1

```bash
npm run type-check
npm run lint
```

**Commit après Phase 1 :**

```bash
git add -A && git commit -m "feat: add API v2 infrastructure (afrikLoader, types, cache)"
```

---

## Phase 2 : Composants liste (Ralph Loop)

> **Mode** : Ralph Loop
> **Objectif** : Créer les 3 composants de liste pour v2

### Loop 2.1 : LanguageFamilyView

```bash
/ralph-loop "Create src/components/LanguageFamilyView.tsx component for displaying language families from API v2.

Requirements:
1. Use afrikLoader.getLanguageFamilies() to fetch data
2. Copy the pattern from RegionView.tsx (search, alphabetical filter, pagination)
3. Display: family name (nameFr), number of associated peoples, total speakers
4. Use existing UI components (Card, Input, etc.) from src/components/ui
5. Support onClick callback for selection: onFamilySelect(family: LanguageFamilySummary)
6. Include loading state and error handling
7. Use client-side cache with key CACHE_KEYS.LANGUAGE_FAMILIES

When the component compiles without TypeScript errors and matches the RegionView pattern, output <promise>FAMILY_VIEW_COMPLETE</promise>" --max-iterations 12 --completion-promise "FAMILY_VIEW_COMPLETE"
```

**Commit après Loop 2.1 :**

```bash
git add -A && git commit -m "feat: add LanguageFamilyView component"
```

### Loop 2.2 : PeopleView

```bash
/ralph-loop "Create src/components/PeopleView.tsx component for displaying peoples from API v2.

Requirements:
1. Use afrikLoader.getPeoples() to fetch data
2. Copy the pattern from EthnicityView.tsx (search, alphabetical filter, pagination)
3. Display: people name (nameMain), language family, total population, country count
4. Support filtering by language family (optional prop: languageFamilyId)
5. Support onClick callback: onPeopleSelect(people: PeopleSummary)
6. Include loading state and error handling
7. Use client-side cache with key CACHE_KEYS.PEOPLES

When the component compiles without TypeScript errors, output <promise>PEOPLE_VIEW_COMPLETE</promise>" --max-iterations 12 --completion-promise "PEOPLE_VIEW_COMPLETE"
```

**Commit après Loop 2.2 :**

```bash
git add -A && git commit -m "feat: add PeopleView component"
```

### Loop 2.3 : Adapter CountryView pour v2

```bash
/ralph-loop "Refactor src/components/CountryView.tsx to use API v2.

Requirements:
1. Replace datasetLoader calls with afrikLoader.getCountries()
2. Update types to use CountrySummary from afrik-frontend.ts
3. Display: country name (nameFr), ISO code, major peoples count
4. Keep existing UI pattern (search, alphabetical filter, pagination)
5. Update cache key to CACHE_KEYS.COUNTRIES_V2
6. Ensure backward compatibility with onCountrySelect callback

Run 'npm run type-check' to validate. When it passes with no errors, output <promise>COUNTRY_VIEW_COMPLETE</promise>" --max-iterations 10 --completion-promise "COUNTRY_VIEW_COMPLETE"
```

**Commit après Loop 2.3 :**

```bash
git add -A && git commit -m "feat: refactor CountryView for API v2"
```

---

## Phase 3 : Composants détail (Ralph Loop)

> **Mode** : Ralph Loop
> **Objectif** : Créer les 3 composants de détail avec affichage riche

### Loop 3.1 : LanguageFamilyDetailView

```bash
/ralph-loop "Create src/components/LanguageFamilyDetailView.tsx for displaying language family details from API v2.

Requirements:
1. Use afrikLoader.getLanguageFamily(id) to fetch data
2. Display all sections from content JSONB:
   - General info (branches, geographic area, number of languages, total speakers)
   - Linguistic characteristics
   - History and origins
   - Distribution by country
   - Associated peoples (with links)
   - Sources
3. Use Card, Tabs, or Accordion components for section organization
4. Include loading skeleton while fetching
5. Handle 404 (family not found)
6. Prop interface: { familyId: string, onPeopleClick?: (id: string) => void }

When the component renders correctly with all sections, output <promise>FAMILY_DETAIL_COMPLETE</promise>" --max-iterations 15 --completion-promise "FAMILY_DETAIL_COMPLETE"
```

**Commit après Loop 3.1 :**

```bash
git add -A && git commit -m "feat: add LanguageFamilyDetailView component"
```

### Loop 3.2 : PeopleDetailView (composant principal)

```bash
/ralph-loop "Create src/components/PeopleDetailView.tsx for displaying people details from API v2.

This is the MAIN component with rich AFRIK data. Requirements:

1. Use afrikLoader.getPeople(id) to fetch data
2. Display ALL 8 AFRIK sections from content JSONB:

   Section 1 - Appellations:
   - Main name, self-appellation (endonym)
   - Exonyms with historical context
   - Problematic/colonial terms explained

   Section 2 - Ethnicities:
   - List of associated ethnic groups

   Section 3 - Origins:
   - Ancient origins, formation period
   - Migration routes
   - Historical territories

   Section 4 - Organization:
   - Political system, clan organization
   - Social structure

   Section 5 - Languages:
   - Main language with ISO code
   - Dialects, related languages

   Section 6 - Culture (A-F subsections):
   - A: Divinities
   - B: Cosmology
   - C: Rites of passage
   - D: Symbols
   - E: Spirituality
   - F: Arts and traditions

   Section 7 - Historical Role:
   - Kingdoms, chiefdoms
   - Relations with neighbors
   - Colonial period impact

   Section 8 - Demography:
   - Total population
   - Distribution by country (with percentages)
   - Reference year

3. Use Tabs or Accordion for sections
4. Use shadcn/ui components consistently
5. Include sources at the bottom
6. Props: { peopleId: string, onCountryClick?: (iso: string) => void, onFamilyClick?: (id: string) => void }

When all 8 sections render correctly, output <promise>PEOPLE_DETAIL_COMPLETE</promise>" --max-iterations 20 --completion-promise "PEOPLE_DETAIL_COMPLETE"
```

**Commit après Loop 3.2 :**

```bash
git add -A && git commit -m "feat: add PeopleDetailView component with all AFRIK sections"
```

### Loop 3.3 : Adapter CountryDetailView pour v2

```bash
/ralph-loop "Refactor src/components/CountryDetailView.tsx to use API v2 data.

Requirements:
1. Replace datasetLoader calls with afrikLoader.getCountry(iso)
2. Display AFRIK country data:
   - Etymology and name origin
   - Historical names (antiquity, middle ages, precolonial, colonial, contemporary)
   - Historical kingdoms
   - Major peoples with demographics (percentage distribution)
   - Culture section
   - Historical facts
   - Sources
3. Keep existing table for peoples distribution
4. Add links to people detail pages
5. Handle 404 gracefully

Run 'npm run type-check' to validate. When it passes and renders correctly, output <promise>COUNTRY_DETAIL_COMPLETE</promise>" --max-iterations 15 --completion-promise "COUNTRY_DETAIL_COMPLETE"
```

**Commit après Loop 3.3 :**

```bash
git add -A && git commit -m "feat: refactor CountryDetailView for API v2"
```

---

## Phase 4 : Pages et Navigation (Ralph Loop)

> **Mode** : Ralph Loop
> **Objectif** : Créer les nouvelles pages et adapter la navigation

### Loop 4.1 : Page Familles linguistiques

```bash
/ralph-loop "Create the language families page at src/app/[lang]/familles/page.tsx

Requirements:
1. Server component that renders FamiliesPageContent
2. Create src/components/pages/FamiliesPageContent.tsx with:
   - Left panel: LanguageFamilyView (list)
   - Right panel: LanguageFamilyDetailView (when selected)
   - Responsive layout (stack on mobile)
3. Use URL params for selected family (?family=FLG_BANTU)
4. Copy pattern from existing RegionsPageContent.tsx
5. Include proper metadata for SEO

When the page renders with list and detail views, output <promise>FAMILIES_PAGE_COMPLETE</promise>" --max-iterations 12 --completion-promise "FAMILIES_PAGE_COMPLETE"
```

**Commit après Loop 4.1 :**

```bash
git add -A && git commit -m "feat: add language families page"
```

### Loop 4.2 : Page Peuples

```bash
/ralph-loop "Create the peoples page at src/app/[lang]/peuples/page.tsx

Requirements:
1. Server component that renders PeoplesPageContent
2. Create src/components/pages/PeoplesPageContent.tsx with:
   - Left panel: PeopleView (list with optional family filter)
   - Right panel: PeopleDetailView (when selected)
   - Filter dropdown to filter by language family
   - Responsive layout
3. Use URL params for selection (?people=PPL_SHONA&family=FLG_BANTU)
4. Support navigation from families page (pre-filtered by family)

When the page renders correctly with filtering, output <promise>PEOPLES_PAGE_COMPLETE</promise>" --max-iterations 12 --completion-promise "PEOPLES_PAGE_COMPLETE"
```

**Commit après Loop 4.2 :**

```bash
git add -A && git commit -m "feat: add peoples page"
```

### Loop 4.3 : Adapter la page Pays

```bash
/ralph-loop "Refactor the countries page at src/app/[lang]/pays/page.tsx to use API v2.

Requirements:
1. Update CountriesPageContent to use v2 components
2. Left panel: CountryView (v2)
3. Right panel: CountryDetailView (v2)
4. Add link to see peoples of the country
5. Keep existing URL structure for backward compatibility

When the page works with v2 data, output <promise>COUNTRIES_PAGE_COMPLETE</promise>" --max-iterations 10 --completion-promise "COUNTRIES_PAGE_COMPLETE"
```

**Commit après Loop 4.3 :**

```bash
git add -A && git commit -m "feat: refactor countries page for API v2"
```

### Loop 4.4 : Navigation hiérarchique

```bash
/ralph-loop "Create a hierarchical navigation component at src/components/HierarchicalNav.tsx

Requirements:
1. Display the AFRIK hierarchy: Family → Peoples → Countries
2. Expandable tree structure using shadcn Accordion or custom tree
3. Fetch data lazily (families first, then peoples on expand)
4. Props: { onSelect: (type: 'family' | 'people' | 'country', id: string) => void }
5. Highlight current selection
6. Use afrikLoader functions for data
7. Cache expanded nodes in state

When the tree navigation works with lazy loading, output <promise>HIERARCHICAL_NAV_COMPLETE</promise>" --max-iterations 15 --completion-promise "HIERARCHICAL_NAV_COMPLETE"
```

**Commit après Loop 4.4 :**

```bash
git add -A && git commit -m "feat: add hierarchical navigation component"
```

### Loop 4.5 : Mettre à jour le header/menu principal

```bash
/ralph-loop "Update src/components/Navigation.tsx (or equivalent header component) for v2.

Requirements:
1. Update menu items:
   - Familles linguistiques → /[lang]/familles
   - Peuples → /[lang]/peuples
   - Pays → /[lang]/pays
   - Recherche → /[lang]/recherche
2. Remove old menu items (Régions, Ethnies)
3. Ensure all 4 languages work (fr, en, es, pt)
4. Update mobile menu if exists

When navigation links work in all languages, output <promise>NAV_UPDATE_COMPLETE</promise>" --max-iterations 8 --completion-promise "NAV_UPDATE_COMPLETE"
```

**Commit après Loop 4.5 :**

```bash
git add -A && git commit -m "feat: update navigation for v2 routes"
```

### Loop 4.6 : Mettre à jour le middleware i18n

```bash
/ralph-loop "Update src/middleware.ts and src/lib/routing.ts for v2 routes.

Requirements:
1. Add localized routes:
   - /fr/familles → /en/families → /es/familias → /pt/familias
   - /fr/peuples → /en/peoples → /es/pueblos → /pt/povos
   - /fr/recherche → /en/search → /es/buscar → /pt/pesquisa
2. Remove old routes (regions, ethnies/ethnicities)
3. Update any route helpers in routing.ts
4. Ensure redirects work for old URLs (optional: redirect to new routes)

When routing works for all new pages in all 4 languages, output <promise>ROUTING_COMPLETE</promise>" --max-iterations 10 --completion-promise "ROUTING_COMPLETE"
```

**Commit après Loop 4.6 :**

```bash
git add -A && git commit -m "feat: update i18n routing for v2"
```

---

## Phase 5 : Recherche et Accueil (Ralph Loop)

> **Mode** : Ralph Loop
> **Objectif** : Recherche unifiée et page d'accueil v2

### Loop 5.1 : Refaire SearchModal pour v2

```bash
/ralph-loop "Refactor src/components/SearchModal.tsx to use API v2 search.

Requirements:
1. Use afrikLoader.search(query, filters) instead of loading all data
2. Add filter tabs or chips: All | Families | Peoples | Countries
3. Display results with type indicator (icon or badge)
4. Show relevant snippet from content
5. Navigate to appropriate detail page on click:
   - Family → /[lang]/familles?family=FLG_XXX
   - People → /[lang]/peuples?people=PPL_XXX
   - Country → /[lang]/pays?country=XXX
6. Debounce search input (300ms)
7. Show 'No results' state

When search works with all entity types, output <promise>SEARCH_COMPLETE</promise>" --max-iterations 12 --completion-promise "SEARCH_COMPLETE"
```

**Commit après Loop 5.1 :**

```bash
git add -A && git commit -m "feat: refactor SearchModal for API v2"
```

### Loop 5.2 : Page de recherche dédiée

```bash
/ralph-loop "Create a dedicated search page at src/app/[lang]/recherche/page.tsx

Requirements:
1. Full-page search experience (not just modal)
2. Search input with filters (type, language family, country)
3. Results list with pagination
4. Use afrikLoader.search with all filter options
5. URL params for search state: ?q=bantu&type=people&family=FLG_BANTU
6. Shareable search URLs
7. SEO metadata

When the search page works with filters and pagination, output <promise>SEARCH_PAGE_COMPLETE</promise>" --max-iterations 12 --completion-promise "SEARCH_PAGE_COMPLETE"
```

**Commit après Loop 5.2 :**

```bash
git add -A && git commit -m "feat: add dedicated search page"
```

### Loop 5.3 : Refaire la page d'accueil

```bash
/ralph-loop "Refactor src/app/[lang]/page.tsx (home page) for API v2.

Requirements:
1. Update statistics section with v2 data:
   - Total language families (24)
   - Total peoples (592+)
   - Total countries (55)
   - Total African population (from aggregation)
2. Use afrikLoader.getStats() for data
3. Update CTA buttons to link to new routes:
   - 'Explorer les familles' → /[lang]/familles
   - 'Découvrir les peuples' → /[lang]/peuples
   - 'Voir les pays' → /[lang]/pays
4. Add featured/highlighted content section (optional):
   - Random featured people
   - Random featured family
5. Keep existing hero section and styling
6. Update any text that references 'ethnies' or 'régions'

When home page displays v2 stats and links, output <promise>HOME_COMPLETE</promise>" --max-iterations 10 --completion-promise "HOME_COMPLETE"
```

**Commit après Loop 5.3 :**

```bash
git add -A && git commit -m "feat: refactor home page for API v2"
```

### Loop 5.4 : Statistiques démographiques avancées

```bash
/ralph-loop "Create a demographics visualization component at src/components/DemographicsChart.tsx

Requirements:
1. Display population distribution charts:
   - By language family (pie or bar chart)
   - By country (bar chart)
   - For a specific people across countries
2. Use a charting library (recharts recommended, already may be installed)
3. Props: { type: 'byFamily' | 'byCountry' | 'peopleDistribution', data: any }
4. Responsive design
5. Accessible (ARIA labels)
6. Add this component to relevant detail views

When charts render correctly with real data, output <promise>DEMOGRAPHICS_COMPLETE</promise>" --max-iterations 15 --completion-promise "DEMOGRAPHICS_COMPLETE"
```

**Commit après Loop 5.4 :**

```bash
git add -A && git commit -m "feat: add demographics visualization component"
```

---

## Phase 6 : Nettoyage v1 (Ralph Loop)

> **Mode** : Ralph Loop
> **Objectif** : Supprimer tout le code legacy v1

### Loop 6.1 : Supprimer les routes API v1

```bash
/ralph-loop "Remove all API v1 routes and related code.

Delete the following directories and files:
- src/app/api/stats/ (entire directory)
- src/app/api/regions/ (entire directory)
- src/app/api/ethnicities/ (entire directory)
- src/app/api/countries/ (entire directory) - BUT KEEP if contributions uses it
- src/lib/datasetLoader.ts
- src/lib/api/datasetLoader.server.ts
- src/lib/api/openapiV1.ts

Update src/lib/api/openapi.ts to only reference v2.
Update src/app/docs/api/ to only show v2 documentation.

Run 'npm run type-check' after deletion. Fix any import errors.
When type-check passes with no v1 references, output <promise>API_V1_REMOVED</promise>" --max-iterations 10 --completion-promise "API_V1_REMOVED"
```

**Commit après Loop 6.1 :**

```bash
git add -A && git commit -m "chore: remove API v1 routes and loaders"
```

### Loop 6.2 : Supprimer les composants legacy

```bash
/ralph-loop "Remove all legacy v1 components that are no longer used.

Delete the following files:
- src/components/RegionView.tsx
- src/components/RegionDetailView.tsx
- src/components/EthnicityView.tsx
- src/components/EthnicityDetailView.tsx
- src/components/pages/RegionsPageContent.tsx (all language variants)
- src/components/pages/EthnicitiesPageContent.tsx (all language variants)

Also delete any old page routes:
- src/app/[lang]/regions/ (if exists)
- src/app/[lang]/ethnies/ (if exists)
- src/app/[lang]/ethnicities/ (if exists)

Run 'npm run type-check' and 'npm run build' to verify no broken imports.
When build passes, output <promise>LEGACY_COMPONENTS_REMOVED</promise>" --max-iterations 8 --completion-promise "LEGACY_COMPONENTS_REMOVED"
```

**Commit après Loop 6.2 :**

```bash
git add -A && git commit -m "chore: remove legacy v1 components and pages"
```

### Loop 6.3 : Nettoyer les traductions et le cache

```bash
/ralph-loop "Clean up translations and cache for v1 removal.

Requirements:
1. Update src/lib/translations.ts:
   - Remove translations for 'regions', 'ethnies', 'ethnicities'
   - Add translations for 'familles', 'families', 'familias'
   - Add translations for 'peuples', 'peoples', 'pueblos', 'povos'
   - Update any UI strings referencing old concepts

2. Update src/lib/cache/clientCache.ts:
   - Remove old cache keys (REGIONS, ETHNICITIES, etc.)
   - Keep only v2 keys

3. Update src/lib/entityTranslations.ts if it exists:
   - Remove region/ethnicity translations
   - Add language family and people translations if needed

Run 'npm run type-check'. When clean, output <promise>TRANSLATIONS_CLEANED</promise>" --max-iterations 8 --completion-promise "TRANSLATIONS_CLEANED"
```

**Commit après Loop 6.3 :**

```bash
git add -A && git commit -m "chore: clean up translations and cache for v2"
```

---

## Phase 7 : Tests (Ralph Loop)

> **Mode** : Ralph Loop
> **Objectif** : Ajouter des tests pour les nouveaux composants

### Loop 7.1 : Tests du loader

```bash
/ralph-loop "Add tests for src/lib/afrikLoader.ts

Create src/lib/__tests__/afrikLoader.test.ts with tests for:
1. getLanguageFamilies() - returns paginated results
2. getLanguageFamily(id) - returns single family
3. getPeoples() - returns paginated results
4. getPeople(id) - returns single people with all sections
5. getCountries() - returns paginated results
6. getCountry(iso) - returns single country
7. search() - returns filtered results
8. Error handling - 404, network errors

Use Vitest and mock fetch calls.
Run 'npm run test src/lib/__tests__/afrikLoader.test.ts'.
When all tests pass, output <promise>LOADER_TESTS_COMPLETE</promise>" --max-iterations 12 --completion-promise "LOADER_TESTS_COMPLETE"
```

**Commit après Loop 7.1 :**

```bash
git add -A && git commit -m "test: add afrikLoader tests"
```

### Loop 7.2 : Tests des composants

```bash
/ralph-loop "Add component tests for the main v2 components.

Create tests in src/components/__tests__/:
1. LanguageFamilyView.test.tsx - renders list, search works, selection works
2. PeopleView.test.tsx - renders list, filter by family works
3. PeopleDetailView.test.tsx - renders all 8 sections correctly
4. SearchModal.test.tsx - search and navigation work

Use Vitest and @testing-library/react.
Mock afrikLoader functions.
Run 'npm run test src/components/__tests__/'.
When all tests pass, output <promise>COMPONENT_TESTS_COMPLETE</promise>" --max-iterations 15 --completion-promise "COMPONENT_TESTS_COMPLETE"
```

**Commit après Loop 7.2 :**

```bash
git add -A && git commit -m "test: add v2 component tests"
```

---

## Récapitulatif des commandes

### Phase 1 : Infrastructure (interactif - pas de Ralph)

```
→ Travailler avec Claude Code directement
→ Commit: git add -A && git commit -m "feat: add API v2 infrastructure"
```

### Phase 2 : Composants liste

```bash
# Loop 2.1
/ralph-loop "Create src/components/LanguageFamilyView.tsx..." --max-iterations 12 --completion-promise "FAMILY_VIEW_COMPLETE"
git add -A && git commit -m "feat: add LanguageFamilyView component"

# Loop 2.2
/ralph-loop "Create src/components/PeopleView.tsx..." --max-iterations 12 --completion-promise "PEOPLE_VIEW_COMPLETE"
git add -A && git commit -m "feat: add PeopleView component"

# Loop 2.3
/ralph-loop "Refactor src/components/CountryView.tsx..." --max-iterations 10 --completion-promise "COUNTRY_VIEW_COMPLETE"
git add -A && git commit -m "feat: refactor CountryView for API v2"
```

### Phase 3 : Composants détail

```bash
# Loop 3.1
/ralph-loop "Create src/components/LanguageFamilyDetailView.tsx..." --max-iterations 15 --completion-promise "FAMILY_DETAIL_COMPLETE"
git add -A && git commit -m "feat: add LanguageFamilyDetailView component"

# Loop 3.2
/ralph-loop "Create src/components/PeopleDetailView.tsx..." --max-iterations 20 --completion-promise "PEOPLE_DETAIL_COMPLETE"
git add -A && git commit -m "feat: add PeopleDetailView component"

# Loop 3.3
/ralph-loop "Refactor src/components/CountryDetailView.tsx..." --max-iterations 15 --completion-promise "COUNTRY_DETAIL_COMPLETE"
git add -A && git commit -m "feat: refactor CountryDetailView for API v2"
```

### Phase 4 : Pages et Navigation

```bash
# Loop 4.1
/ralph-loop "Create the language families page..." --max-iterations 12 --completion-promise "FAMILIES_PAGE_COMPLETE"
git add -A && git commit -m "feat: add language families page"

# Loop 4.2
/ralph-loop "Create the peoples page..." --max-iterations 12 --completion-promise "PEOPLES_PAGE_COMPLETE"
git add -A && git commit -m "feat: add peoples page"

# Loop 4.3
/ralph-loop "Refactor the countries page..." --max-iterations 10 --completion-promise "COUNTRIES_PAGE_COMPLETE"
git add -A && git commit -m "feat: refactor countries page for API v2"

# Loop 4.4
/ralph-loop "Create a hierarchical navigation component..." --max-iterations 15 --completion-promise "HIERARCHICAL_NAV_COMPLETE"
git add -A && git commit -m "feat: add hierarchical navigation component"

# Loop 4.5
/ralph-loop "Update src/components/Navigation.tsx..." --max-iterations 8 --completion-promise "NAV_UPDATE_COMPLETE"
git add -A && git commit -m "feat: update navigation for v2 routes"

# Loop 4.6
/ralph-loop "Update src/middleware.ts and src/lib/routing.ts..." --max-iterations 10 --completion-promise "ROUTING_COMPLETE"
git add -A && git commit -m "feat: update i18n routing for v2"
```

### Phase 5 : Recherche et Accueil

```bash
# Loop 5.1
/ralph-loop "Refactor src/components/SearchModal.tsx..." --max-iterations 12 --completion-promise "SEARCH_COMPLETE"
git add -A && git commit -m "feat: refactor SearchModal for API v2"

# Loop 5.2
/ralph-loop "Create a dedicated search page..." --max-iterations 12 --completion-promise "SEARCH_PAGE_COMPLETE"
git add -A && git commit -m "feat: add dedicated search page"

# Loop 5.3
/ralph-loop "Refactor src/app/[lang]/page.tsx..." --max-iterations 10 --completion-promise "HOME_COMPLETE"
git add -A && git commit -m "feat: refactor home page for API v2"

# Loop 5.4
/ralph-loop "Create a demographics visualization component..." --max-iterations 15 --completion-promise "DEMOGRAPHICS_COMPLETE"
git add -A && git commit -m "feat: add demographics visualization component"
```

### Phase 6 : Nettoyage

```bash
# Loop 6.1
/ralph-loop "Remove all API v1 routes..." --max-iterations 10 --completion-promise "API_V1_REMOVED"
git add -A && git commit -m "chore: remove API v1 routes and loaders"

# Loop 6.2
/ralph-loop "Remove all legacy v1 components..." --max-iterations 8 --completion-promise "LEGACY_COMPONENTS_REMOVED"
git add -A && git commit -m "chore: remove legacy v1 components and pages"

# Loop 6.3
/ralph-loop "Clean up translations and cache..." --max-iterations 8 --completion-promise "TRANSLATIONS_CLEANED"
git add -A && git commit -m "chore: clean up translations and cache for v2"
```

### Phase 7 : Tests

```bash
# Loop 7.1
/ralph-loop "Add tests for src/lib/afrikLoader.ts..." --max-iterations 12 --completion-promise "LOADER_TESTS_COMPLETE"
git add -A && git commit -m "test: add afrikLoader tests"

# Loop 7.2
/ralph-loop "Add component tests..." --max-iterations 15 --completion-promise "COMPONENT_TESTS_COMPLETE"
git add -A && git commit -m "test: add v2 component tests"
```

---

## Validation finale

Après toutes les phases :

```bash
# Vérifier que tout compile
npm run type-check

# Vérifier le lint
npm run lint

# Lancer tous les tests
npm run test

# Build de production
npm run build

# Tester localement
npm run start
```

---

## Troubleshooting

### Si un Ralph Loop ne termine pas

```bash
# Annuler le loop en cours
/cancel-ralph

# Vérifier le travail fait
git status
git diff

# Soit commiter le travail partiel, soit reset
git add -A && git commit -m "wip: partial work from ralph loop"
# ou
git checkout .
```

### Si des erreurs TypeScript persistent

```bash
# Lancer le type-check pour voir les erreurs
npm run type-check

# Demander à Claude de corriger
"Fix the TypeScript errors in [fichier]"
```

### Si le build échoue

```bash
# Voir les erreurs de build
npm run build

# Corriger manuellement ou relancer un loop ciblé
/ralph-loop "Fix build errors in the project. Run 'npm run build' and fix all errors. Output <promise>BUILD_FIXED</promise> when build succeeds." --max-iterations 10 --completion-promise "BUILD_FIXED"
```

---

## Checklist finale

- [ ] Phase 1 : Infrastructure (types, loader, cache)
- [ ] Phase 2 : Composants liste (3 composants)
- [ ] Phase 3 : Composants détail (3 composants)
- [ ] Phase 4 : Pages et navigation (6 loops)
- [ ] Phase 5 : Recherche et accueil (4 loops)
- [ ] Phase 6 : Nettoyage v1 (3 loops)
- [ ] Phase 7 : Tests (2 loops)
- [ ] Build de production OK
- [ ] Tests passent
- [ ] Déploiement

---

**Total estimé : 21 Ralph Loops + Phase 1 interactive**

**Document créé le** : 2026-01-23
**Version** : 1.0
