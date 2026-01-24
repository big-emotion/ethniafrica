# Migration V2 Progress Tracker

This file tracks the progress of the API v1 → v2 migration.
Update this file after completing each task.

## Phase 1: Infrastructure ✅ DONE

- [x] Types frontend (afrik-frontend.ts)
- [x] Data loader (afrikLoader.ts)
- [x] Cache keys (clientCache.ts)

## Phase 2: List Components

- [x] LanguageFamilyView.tsx ✅
- [x] PeopleView.tsx ✅
- [x] CountryView.tsx (refactor for v2) ✅

## Phase 3: Detail Components

- [x] LanguageFamilyDetailView.tsx ✅
- [ ] PeopleDetailView.tsx (8 AFRIK sections)
- [ ] CountryDetailView.tsx (refactor for v2)

## Phase 4: Pages & Navigation

- [ ] /[lang]/familles/page.tsx + FamiliesPageContent.tsx
- [ ] /[lang]/peuples/page.tsx + PeoplesPageContent.tsx
- [ ] /[lang]/pays/page.tsx (refactor)
- [ ] HierarchicalNav.tsx
- [ ] Navigation.tsx (update menu)
- [ ] middleware.ts + routing.ts (i18n routes)

## Phase 5: Search & Home

- [ ] SearchModal.tsx (refactor for v2)
- [ ] /[lang]/recherche/page.tsx
- [ ] /[lang]/page.tsx (home - refactor)
- [ ] DemographicsChart.tsx (optional)

## Phase 6: Cleanup (DO LAST)

- [ ] Remove API v1 routes
- [ ] Remove legacy components
- [ ] Clean translations/cache

## Phase 7: Tests

- [ ] afrikLoader.test.ts
- [ ] Component tests

---

## Current Status

**Current Phase**: 3
**Current Task**: LanguageFamilyDetailView.tsx
**Last Updated**: 2025-01-23
**Build Status**: type-check passing

## Notes

- Always run `npm run type-check` after each component
- Commit after each major component
- If stuck, move to next task and come back
