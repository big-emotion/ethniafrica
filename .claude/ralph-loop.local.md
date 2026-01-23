---
active: true
iteration: 1
max_iterations: 50
completion_promise: "MIGRATION_V2_COMPLETE"
started_at: "2026-01-23T16:55:32Z"
---

Continue API v1→v2 migration. Do tasks IN ORDER, commit after each:

DONE (skip): Phase 1-2 complete, Phase 3 partial (LanguageFamilyDetailView, PeopleDetailView done)

TASKS:

1. CountryDetailView v2: Replace datasetLoader→afrikLoader.getCountry(iso), use CountryDetail type, show AFRIK data. Commit.
2. Families page: Create /[lang]/familles + FamillesPageContent (left:LanguageFamilyView, right:LanguageFamilyDetailView). Commit.
3. Peoples page: Create /[lang]/peuples + PeuplesPageContent (left:PeopleView+filter, right:PeopleDetailView). Commit.
4. Countries page v2: Update PaysPageContent/CountriesPageContent to use CountryDetailView v2. Commit.
5. Navigation: Update header menu (Familles→/familles, Peuples→/peuples, Pays→/pays), remove Régions/Ethnies. Commit.
6. Routing: Update middleware.ts+routing.ts for /familles→/families, /peuples→/peoples. Commit.
7. SearchModal v2: Use afrikLoader.search, add filter tabs, navigate to new routes. Commit.
8. Home page v2: Use afrikLoader.getStats, update CTAs to new routes. Commit.
9. Remove legacy: Delete RegionView, EthnicityView and variants. Commit.
10. Translations: Add familles/peuples, remove regions/ethnies. Commit.

Run 'npm run type-check' between tasks.
When ALL done: <promise>MIGRATION_V2_COMPLETE</promise>
