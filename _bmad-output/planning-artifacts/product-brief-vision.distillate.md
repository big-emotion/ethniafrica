# Africa History — Product Brief Distillate (LLM-optimized)

> Token-efficient distillate of `product-brief-vision.md`. Use as PRD/spec input.

## Identity

- **Working name**: Africa History (pending naming decision; current "EthniAfrica" deprecated due to colonial connotation of "ethnie")
- **Project type**: Free, open-data, decolonial digital encyclopedia of African peoples
- **Owner**: jnk (solo, 1-2 collaborators possible, no fixed team)
- **Status**: Long-term vision, no deadline
- **Date**: 2026-04-13

## Mission (one sentence)

A public common, in French first and mobile-first, that retells the history of African peoples from their own point of view — for the African public and its diaspora — by inverting the colonial grammar still embedded in mainstream encyclopedias.

## Editorial framework

- **Triptych** (content + navigation): Names · Links · Gazes
  - Names: who named, what it means, how it mutated, what it erased
  - Links: between peoples, languages, kingdoms, migrations, contacts, classifications
  - Gazes: constructed, contestable, counterfactual nature of any classification; colonial imprint on categories
- **Three access modes**: Explore (atlas, maps, fiches) · Understand (timelines, analyses, narrative modules) · Play (quizzes, comparators)

## Audience

1. African public (continental) — secondary/high school students, university students, teachers, curious general public
2. African diaspora — identity quest, family transmission, "personal heritage"

- NOT primarily targeted: academia, Western curious

## Existing foundations (April 2026)

- 924 PPL JSON fiches, 24 FLG (linguistic families), 55 countries — AFRIK hierarchy: FLG → Language → People → Country
- API v2 in production (Next.js 16 + Supabase + OpenAPI/Swagger)
- Country page redesigned (design system "Carte vivante", 8 sections, 3 breakpoints: 430/720/800px, mobile-first)
- French-only (V1→V2 migration completed; multilingual deferred)
- Stack: Next.js 16 App Router, React 18, TypeScript, Tailwind, shadcn/ui, TanStack Query, Vitest, Storybook (react-vite)

## Critical gap (drives priority #1)

The 924 fiches are **structurally complete** but **factually unaudited**. AI-assisted enrichment may have introduced: hallucinated facts (populations, dates, places), fabricated sources, classifications presented as certainties. Concrete known issues:

- `PPL_TOKELAU_FAUXEX` (Polynesian people misclassified as African — to delete)
- 8 unresolved duplicates (NZEMA/NZIMA, GOURO/GURO, BANDI/GBANDI, LOMA/TOMA_LOMA, GANGUELA/NGANGUELA, NYANEKA/NYANEKA_NKHUMBI, TUTRUGBU/NYANGBO, AMERICANO_LIBERIENS/AMERICO_LIBERIANS, MANDINKA × 2)
- 6 fiches with `languageFamilyId` ≠ parent folder
- Non-existent FLG codes: `FLG_KWA`, `FLG_NILO_SAHARIEN`, `FLG_OMOTIC` (should be `FLG_OMOTIQUE`)
- 5 fiches with population = 0
- 2 filenames using comma instead of underscore

## Module #0 — Sources & Verification (transversal foundation, NON-NEGOTIABLE)

Drives credibility of the entire decolonial posture. Required capabilities:

1. **Per-fiche confidence score** displayed publicly: source count, source quality (academic/encyclopedic/AI), last human verification date, open flags
2. **Verifiable sources** per assertion: URL, page, year; visible distinction primary/secondary/tertiary
3. **Public error reporting**: any user can contest, propose correction, cite counter-source; transparent moderation
4. **Human review workflow**: public queue of fiches to audit; "verified by scientific contributor" status
5. **Automated audit (CI)**: detect FLG ≠ folder, duplicates, aberrant populations, invalid ISO codes, non-resolvable sources
6. **Written, public editorial doctrine**: endonyms vs exonyms, contested classifications, sensitive topics (colonization, race, religion)

Why mandatory: distinguishes the project from yet-another-AI-generated-site; transforms weakness (solo + AI dataset) into strength (radical transparency); main lever for institutional partnerships.

## Module roadmap (10 modules + #0)

| #   | Module                       | Group        | Notes                                                               |
| --- | ---------------------------- | ------------ | ------------------------------------------------------------------- |
| 0   | Sources & Verification       | Transversal  | Conditions all others                                               |
| 1   | People page                  | V2 extension | Reuses Carte vivante design system                                  |
| 2   | Language family page         | V2 extension | Interactive tree, leverages 24 FLG                                  |
| 3   | Public API formalized        | V2 extension | Public Swagger, rate-limit, free keys                               |
| 4   | Names Atlas                  | Names        | Etymology, exonyms, endonyms, evolution                             |
| 5   | Hidden links between peoples | Links        | Relational graph (linguistic, migratory, commercial, religious)     |
| 6   | African migrations timeline  | Links        | Bantu, Nilo-Saharan, Cushitic, slave routes, caravans               |
| 7   | Interactive comparator       | Links        | Side-by-side: peoples, countries, languages                         |
| 8   | Colonization & resistances   | Gazes        | Mapping fragmentations, imposed names, displaced peoples            |
| 9   | Smart quiz                   | Learning     | Frictionless step-by-step learning                                  |
| 10  | Africa History Assistant     | Learning     | Conversational AI on full dataset; flags inconsistencies → feeds #0 |

## Non-negotiable principles

- Free + open data (CC-BY-SA or equivalent — to validate)
- No monetization — patronage, institutional partnerships, volunteers
- Decolonial in form and substance — endonyms first, exonyms contextualized, sources critiqued
- Mobile-first (target audience accesses web primarily via mobile)
- Traceable sources for every assertion
- French first (multilingual: future option, not blocker)

## Risks

| Risk                                             | Impact        | Mitigation                                                  |
| ------------------------------------------------ | ------------- | ----------------------------------------------------------- |
| Factual credibility (AI-enriched data unaudited) | 🔴 Critical   | Module #0 (above)                                           |
| Solo dev, bus factor 1                           | 🟠 Medium     | Open source, recruit 1-2 contributors                       |
| No revenue model                                 | 🟠 Medium     | Minimal hosting, patronage, partnerships                    |
| Polemics on contested classifications            | 🟠 Medium     | Written editorial doctrine, light scientific advisory board |
| Renaming mismanaged (SEO loss)                   | 🟡 Low-medium | Clean rebrand plan, 301 redirects                           |

## Success metrics (mission-oriented, not commercial)

- Factual confidence: % of people fiches with ≥ 2 verified + human-audited sources (target: 80% at 2 years)
- Target audience: % traffic from Africa + identified diaspora (target: > 60%)
- Educational adoption: number of teachers/institutions citing/using
- Open-data reuse: number of third-party projects consuming the public API
- Institutional partnerships: ≥ 1 major partner signed at 18 months (UNESCO, IWGIA, African university)
- Verification community: number of active contributors on Module #0

## Next decisions (ordered)

1. Launch Module #0 design (Sources & Verification) — pre-condition for everything else
2. Audit/cleanup existing data quality (duplicates, erroneous fiches, FLG inconsistencies) — pre-condition for cross-fiche modules
3. Decide name (Africa History or alternative) — short naming sprint
4. Write editorial doctrine — endonyms, sources, sensitive topics
5. Sequence the 10 modules by dependency and value
6. Identify 1-2 target collaborators (mobile design system; African social sciences contributor)

## Key files & references (project repo)

- AFRIK directives: `public/DIRECTIVES-AFRIK.md`
- Project AI rules: `_bmad-output/project-context.md`
- Country page V2 design: `src/components/country/`, `src/lib/countryDataTransformer.ts`, `src/styles/country-tokens.css`
- API v2: `src/app/api/v2/`, `src/api/v2/`, `src/lib/api/openapiV2.ts`
- Data: `dataset/source/afrik/peuples/FLG_*/PPL_*.json`, `dataset/source/afrik/famille_linguistique/FLG_*.txt`, `dataset/source/afrik/pays/*.json`
- Historical roadmap (deleted from repo, recoverable): `git show f0bac5e^:docs/archive/ROADMAP_FONCTIONNALITES.md`
- Historical V2 spec (deleted from repo, recoverable): `git show f0bac5e^:docs/spec-v2/COMPTE-RENDU-PROJET.md`
