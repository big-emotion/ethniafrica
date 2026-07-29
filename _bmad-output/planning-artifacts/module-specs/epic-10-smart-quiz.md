# Epic 10 — Smart Quiz: Progressive Learning for Every Audience

**Pillar:** Play (« Jouer ») · **Module:** #9 — Quiz intelligent · **Audience:** all publics (children → professionals)
**Status:** Draft — PRD addendum (FR block FR65–FR71)

---

## Module Goal

The Smart Quiz is the all-public entry door of Africa History: a progressive-learning quiz engine segmented by audience (children, teens, adults, university students, professionals) that turns the verified AFRIK corpus into short, friction-free learning sessions. Every question is **generated exclusively from fiche data that has passed the Module 0 verification gate** — confidence-scored, human-audited, Tier 1/2-sourced, flag-free — because a single wrong answer key would be a credibility disaster for a project whose entire legitimacy rests on source quality. Every answered question immediately shows the correct answer **with its cited source**, so the quiz does not merely teach facts: it teaches sourcing, which is the product's defining posture delivered in game form. Play is anonymous (FR5 alignment), mobile-first, keyboard-complete, and without time pressure; a shareable score card (OG image, zero PII) is the module's only growth loop. Progress persistence via contributor account is explicitly a Growth item, not part of this epic.

## Fit & Dependencies

**Position in build order:** Epic 10 is fourth in the module wave `7 → 8 → 9 → 10 → 11 → 12 → 13`. Its _hard_ dependencies are only the platform socle (Epics 0–3); its ordinal position after 7–9 is sequencing, not a technical dependency — Epic 10 touches none of the sibling foundations.

**Builds on (consumes):**

- **Epic 0 — Data baseline & CI:** data-integrity workflow (extended with quiz-bank checks), env-based feature flags (AR39), Lighthouse/axe CI gates (AR20).
- **Epic 1 — Module 0 fabric:** `assertions`, `sources`, `confidence_scores`, `flags` tables are the _only_ admissible raw material for question generation (FR65 gate). UI reuse: `ConfidenceChip`, `SourceChainSheet` (answer explanations open the real source chain — same component, same a11y model), `ClassificationBadge` where a question touches a classified fiche.
- **Epic 2 — Reading surface:** `AutonymExonymHeading` (every people/language name rendered in a quiz prompt or option complies with the autonym-first rule, UX-DR49 #1), reading-surface conventions (`--afh-*` tokens, density `--afh-density-reading`, Fraunces/Nunito type roles), routing/translations extension for `/fr/quiz`.
- **Epic 3 — Versioning (soft):** answer-explanation source citations link to the live fiche; pinned-version citation inside the quiz is not required at MVP.
- **Epics 4–5 (indirect):** open flags produced by the contribution/moderation cycle feed the revocation logic — the quiz only reads `flags` state, it introduces no contribution surface.

**Shared-infra ownership (must not violate):** Epic 10 **owns nothing shared** and defines **no new foundation**. It does _not_ touch the tree dataviz (Epic 7), the naming/etymology model (Epic 8), the relations model (Epic 11), or the event model / Africa basemap / timeline (Epic 12) — which is exactly why **map-based questions are out of scope** until Epic 12's basemap exists (see Out of Scope).

**What Epic 10 provides to others:** nothing structural. `quiz_*` tables are module-private; no other epic may depend on them.

## User Journeys

**Journey 1 — Aïcha, 10, on her mother's phone (390 px, 4G).** From the home page she taps « Quiz », picks the « enfants » card, and gets 8 questions about names, languages and countries — large targets, one question at a time, no timer, nothing about slave trades or colonization (children exclusion matrix, FR69). She answers « Quel est le nom que se donne le peuple appelé "Zoulou" ? » _(illustrative)_, gets it wrong, and reads the calm explanation with its source line. **Success moment:** she finishes the run, sees « 6 réponses exactes sur 8 », and taps through to the people fiche of a question she liked — the quiz delivered her to the encyclopedia.

**Journey 2 — Mariam, university student (mobile, evening).** She picks « étudiants », where her device remembers she reached difficulty rung 4 (localStorage, no account). A question asks which ISO 639-3 code matches a language _(illustrative)_; after answering she taps « ouvrir la chaîne de sources » and the same `SourceChainSheet` she knows from fiches opens with the Ethnologue-class citation. **Success moment:** she realizes every quiz answer is backed by the same verifiable chain as the encyclopedia itself — and scores ≥ 75 %, unlocking rung 5.

**Journey 3 — Didier, history teacher (class prep, desktop).** He runs an « adultes » session to evaluate the tool for his students, finishes 8/8, and clicks « partager le score ». The share link renders an OG card — segment, score, and the line « chaque réponse est sourcée » — with zero personal data. **Success moment:** he posts the link in the staff group chat; colleagues who click land on the quiz landing page, not a signup wall.

## Functional Requirements

- **FR65:** The system generates quiz questions exclusively from fiche data that passes the verification gate — the fiche's confidence score is at or above the published quiz threshold, the fiche has at least one human audit on record, the underlying assertion is backed by at least one Tier 1 or Tier 2 source, and the assertion has zero open flags; questions whose underlying data ceases to satisfy the gate are automatically revoked from play

  **Given** a fiche with `confidence_scores.score` below the quiz threshold, or `last_human_audit_at IS NULL`
  **When** the question-generation sweep runs
  **Then** no question is generated from any field of that fiche, and any previously generated question from it is revoked (`revoked_at` set, reason recorded)

  **Given** an active question whose underlying assertion receives an open flag
  **When** a quiz session is composed
  **Then** the serve-time gate re-check excludes that question even if the nightly sweep has not yet revoked it

  **Given** a candidate question whose assertion cites only Tier 3 / AI-enriched sources
  **When** the generator evaluates it
  **Then** the question is not generated and the exclusion is counted in the generation-run audit record

- **FR66:** Users can play a short quiz session (5–10 questions, default 8) for their audience segment — children, teens, adults, university students, or professionals — anonymously, without account, registration, or payment

  **Given** an anonymous visitor on `/fr/quiz`
  **When** they select a segment
  **Then** a session of gate-passing questions for that segment starts with no authentication prompt, no cookie requirement, and no PII collection

  **Given** a segment whose active question bank is empty (verification backlog)
  **When** the visitor selects it
  **Then** a calm empty state explains that questions for this segment arrive as fiches are verified — never a broken or fabricated session

- **FR67:** Users see, immediately after answering each question, whether their answer was correct together with an explanation and the cited source backing the correct answer, with a one-tap path to the full source chain

  **Given** a validated answer (correct or not)
  **When** the reveal renders
  **Then** it shows the verdict, the correct answer, a short explanation, and the source citation (title, year, tier) — and an affordance opens the `SourceChainSheet` for the underlying assertion

  **Given** the reveal is displayed
  **When** a screen reader is active
  **Then** the verdict and explanation are announced via a polite live region, and the source link is reachable in tab order

- **FR68:** Users can progress through a difficulty ladder within their audience segment, with the reached rung remembered locally on the device without any account

  **Given** a completed session with a score at or above the progression threshold (75 %)
  **When** the score screen renders
  **Then** the next difficulty rung is unlocked for that segment and persisted in `localStorage` only (no server state, no identifier sent)

  **Given** a device with no stored progress
  **When** a segment is selected
  **Then** the session starts at the segment's lowest rung

- **FR69:** The children segment excludes questions touching sensitive topics — slave trades, colonization, violent conflict, and religious controversy — per the editorial doctrine's sensitive-topic clause; exclusion is enforced by a field-path allowlist, so any non-allowlisted field can never reach the children segment

  **Given** a fiche field outside the children allowlist (e.g. `content.historicalRole.conflictsOrAlliances`, `content.appellations.whyProblematic`)
  **When** the generator produces children-segment questions
  **Then** no question referencing that field path is generated for `audience = 'children'`, and a CI audit asserts zero violations in the active bank

  **Given** the account age gate defined by FR45 (Epic 4)
  **When** a child plays the quiz
  **Then** no account interaction is ever proposed inside the children segment — the quiz stays fully anonymous, so FR45 is never triggered from this surface

- **FR70:** Users can share an end-of-session score card as a link whose Open Graph image carries the segment, the score, and the sourcing tagline — and no personal data, tracking parameter, or account reference

  **Given** a finished session
  **When** the user activates « partager le score »
  **Then** a stateless share URL is produced (segment, correct count, total, rung — all Zod-validated ranges) and the Web Share API is used, with copy-to-clipboard fallback announcing « copié » politely

  **Given** the share URL is opened by a third party
  **When** the page renders
  **Then** the full score content is present as text on the page (the OG image is presentational only) with a single CTA to play the quiz

- **FR71:** Users can complete an entire quiz session using only the keyboard, with screen-reader announcements for every state change, no time pressure by default, and touch targets of at least 44 × 44 px

  **Given** a keyboard-only user on any question
  **When** they navigate with Tab / arrow keys, select with Space, validate with Enter
  **Then** the full answer–reveal–next loop completes without a pointer, with no keyboard trap and visible focus at every step

  **Given** any quiz session at MVP
  **When** a question is displayed
  **Then** no countdown, timer, or auto-advance exists — the user controls all pacing

## Data Model & Sourcing

### AFRIK dependencies (read-only)

The generator reads existing tables only: `afrik_peoples`, `afrik_language_families`, `afrik_languages`, `afrik_countries`, `afrik_people_countries` (canonical English names per migration `006`), joined with the Module 0 fabric: `assertions`, `sources`, `confidence_scores`, `flags`. Field paths follow the strict model `public/modele-peuple.json` (e.g. `content.appellations.selfAppellation`, `languageFamilyId`, `content.languages.mainLanguage`, `currentCountries`).

**No new dataset type is needed.** Questions are _derived_ data stored in the database, never authored fiches: no new `public/modele-*.json`, no `dataset/source/` additions, no `validateAfrikData.ts` schema extension. The blocking data story for this epic is the generation sweep itself (Story 10.5), not a data-acquisition effort.

### Question templates (initial set — all derived from structured fields)

| ID  | Template (FR prompt pattern)                                     | Answer field                                               | Distractor pool                   | Baseline difficulty |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------- | ------------------- |
| T1  | « À quelle famille linguistique appartient le peuple X ? »       | `languageFamilyId` → family name                           | Other real FLG names              | 1                   |
| T2  | « Quel est le nom que se donne (autonyme) le peuple appelé X ? » | `content.appellations.selfAppellation`                     | Real autonyms of other peoples    | 2                   |
| T3  | « Dans quel pays le peuple X est-il principalement présent ? »   | `content.demography.distributionByCountry` (largest share) | Other real African countries      | 1                   |
| T4  | « Quelle est la langue principale du peuple X ? »                | `content.languages.mainLanguage`                           | Real languages of sibling peoples | 2                   |
| T5  | « Quel code ISO 639-3 désigne la langue X ? »                    | `content.languages.isoCodes`                               | Real ISO 639-3 codes              | 4                   |

Rules: distractors are **always real values of the same field drawn from other AFRIK entities** — never fabricated strings, never near-duplicates of the answer (matching values across entities are filtered out so a distractor is never _also_ correct). Prompts are template text plus verified field values only; the generator writes no free prose. Any prompt naming a people or language embeds the autonym-first form. Map-based templates are deferred (Epic 12 owns the basemap).

_(All template examples above are illustrative of shape, not data — real prompts are instantiated only from gate-passing fiches at generation time.)_

### New Supabase tables (migration sketch)

Migration `0NN_quiz_engine.sql` (next free number; head at `027` as of writing; idempotent; **human-applied** via `supabase db push` per the AR45 runbook, never auto-applied):

```sql
-- 0NN_quiz_engine.sql — Epic 10 Smart Quiz (idempotent)

do $$ begin
  create type quiz_audience as enum
    ('children','teens','adults','university','professionals');
exception when duplicate_object then null; end $$;

create table if not exists quiz_generation_runs (
  id                 uuid primary key default gen_random_uuid(),
  ran_at             timestamptz not null default now(),
  confidence_threshold smallint not null,
  questions_generated  integer not null default 0,
  questions_revoked    integer not null default 0,
  candidates_rejected  integer not null default 0,
  notes              text
);

create table if not exists quiz_questions (
  id                  uuid primary key default gen_random_uuid(),
  template_id         text not null,                    -- 'T1'..'T5'
  audience            quiz_audience not null,
  difficulty          smallint not null check (difficulty between 1 and 5),
  entity_type         text not null,                    -- Module 0 TEXT convention (009)
  entity_id           text not null,                    -- e.g. PPL_xxxxx
  field_path          text not null,
  prompt_fr           text not null,
  options_fr          jsonb not null,                   -- array of 4 strings
  correct_option      smallint not null check (correct_option between 0 and 3),
  explanation_fr      text not null,
  assertion_id        uuid not null references assertions(id),
  source_ids          uuid[] not null,
  confidence_at_generation smallint not null,
  generation_run_id   uuid not null references quiz_generation_runs(id),
  generated_at        timestamptz not null default now(),
  revoked_at          timestamptz,
  revoked_reason      text
);

create index if not exists idx_quiz_questions_serving
  on quiz_questions (audience, difficulty)
  where revoked_at is null;
create index if not exists idx_quiz_questions_entity
  on quiz_questions (entity_type, entity_id);

alter table quiz_questions enable row level security;
alter table quiz_generation_runs enable row level security;

drop policy if exists quiz_questions_public_read on quiz_questions;
create policy quiz_questions_public_read on quiz_questions
  for select using (revoked_at is null);
-- writes: service-role only (no insert/update policies for anon/authenticated)
drop policy if exists quiz_runs_public_read on quiz_generation_runs;
create policy quiz_runs_public_read on quiz_generation_runs
  for select using (true);   -- generation audit is public (transparency posture)
```

Conventions honored: domain-named tables (no `m10_` prefix), Postgres enums, `(entity_type, entity_id)` polymorphic pair, `timestamptz`, `uuid` PKs (architecture N1).

### Source Tier policy application

- A question's admissibility inherits entirely from Module 0: the assertion must cite ≥ 1 source of type `primary` or `secondary` (Tier 1/2) that is `resolvable = true`. Tier 3 / `ai` sources never qualify. **Source or drop applies transitively: no gate-passing assertion → no question.** The quiz never becomes a channel for unverified claims.
- The generator invents nothing: prompts, options, and explanations are assembled from template text plus verified field values and the assertion's existing source citation. Explanations quote the source, they do not paraphrase beyond the template.
- Given the current corpus state (924 fiches structurally filled, largely unaudited), **the initial bank may be small — that is correct behavior, not a bug**. Bank size grows as Epic 1/5 audits land; the empty-segment state (FR66) is the honest UI for it.

### Integrity rules (FR28-style, quiz bank)

Enforced by the generation sweep and audited in CI (Story 10.5):

- **QZ-1:** every active question's `assertion_id` resolves and still passes the FR65 gate.
- **QZ-2:** `correct_option` value equals the _current_ fiche value for `field_path` (staleness check — a fiche revision that changes the answer revokes the question).
- **QZ-3:** all four options are distinct; distractors are real values from other AFRIK entities; no distractor equals the correct value for its own entity.
- **QZ-4:** zero active `audience = 'children'` questions reference a field path outside the children allowlist.
- **QZ-5:** every generation sweep writes exactly one `quiz_generation_runs` row (auditable regeneration history, publicly readable).

## API Surface

All JSON endpoints follow the 3-layer pattern and the AR8 envelope `{ data, meta: { license, attribution }, errors: [] }`; Zod schemas live in `src/api/v2/schemas/quiz.ts` (NFR38); errors use the AR9 taxonomy; anonymous rate limit 60 req/min (AR11).

### `GET /api/v2/quiz/segments`

- Layers: `src/app/api/v2/quiz/segments/route.ts` → `src/api/v2/handlers/quiz.ts` → `src/api/v2/services/quizService.ts`
- Returns the five segments with French labels, available difficulty rungs, and active question counts per rung (so the UI can disable empty rungs honestly).
- Cache: `s-maxage=3600` (counts change only on generation sweeps).

```jsonc
// data (shape)
{
  "segments": [
    {
      "id": "children",
      "labelFr": "enfants",
      "rungs": [{ "difficulty": 1, "activeQuestionCount": 42 }],
    },
  ],
}
```

### `GET /api/v2/quiz/session?segment={quiz_audience}&difficulty={1..5}&count={5..10}`

- Layers: `src/app/api/v2/quiz/session/route.ts` → handler → service.
- Service composes a random draw (`ORDER BY random()` — fine at bank scale, documented KISS choice over `TABLESAMPLE`) of `count` (default 8) active questions for `(segment, difficulty)`, then runs the **serve-time gate re-check** (batched: current `confidence_scores` join + open-`flags` lookup for the drawn set — N+1 discipline per AR17).
- **Answer key ships in the payload** (`correctOption`, `explanationFr`, `source`). Deliberate: reveal is client-side so a session costs exactly one network round-trip on 4G (reference device), and there is nothing to cheat for — no leaderboard, no persistence, no stakes (dignity rule UX-DR49 #5 forbids competitive metrics anyway).
- Fewer questions than requested → `200` with the shorter array; zero → `200` with an empty array (UI renders the calm empty state). `400 VALIDATION_ERROR` for malformed params; `422 SEMANTIC_ERROR` for a rung not offered by the segment.
- Cache: `no-store` (each session is a fresh random draw).

### `GET /api/og/quiz-score?segment=&correct=&total=&rung=`

- OG image endpoint using `ImageResponse` from **`next/og` (built into Next.js — zero new dependency)**. Lives outside `/api/v2` **because AR8 mandates the JSON envelope for all `/v2/**`responses and this returns`image/png`**; it is presentational, unversioned, and explicitly excluded from the API contract. Params validated by the shared Zod schema (`correct ≤ total`, `total ∈ [5,10]`) so forged absurd cards 404 out.

### OpenAPI

`src/lib/api/openapiV2.ts` is updated **in the same PR** as the two `/v2/quiz/*` endpoints (paths, params, response schemas, error codes); the OpenAPI-diff CI gate must pass. The OG endpoint is documented in the spec description as out-of-contract.

## UX & Components

New domain folder `src/components/quiz/` (mirrors `country/`, `people/`). All components are logic-free per UX-DR48 — play state lives in a hook `src/hooks/use-quiz-session.ts` (TanStack Query fetch + `useReducer` play state machine: `answering → revealed → finished`; no xstate — KISS). Visual specification stays minimal (tokens + shadcn primitives); a designer pass is deferred to the redesign phase — **functional a11y is the maximal deliverable here**.

| Component           | Props sketch                                                                                                                                           | Notes                                                                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QuizSegmentPicker` | `{ segments: SegmentSummary[]; onSelect(id: QuizAudience): void }`                                                                                     | 5 cards, French labels (« enfants », « ados », « adultes », « étudiants », « professionnels »), active-question count shown honestly; empty segments render disabled with the calm explanation                                                                                  |
| `QuizQuestionCard`  | `{ question: QuizQuestion; index: number; total: number; phase: 'answering' \| 'revealed'; onValidate(option: number): void }`                         | Prompt in Fraunces (h2 role); 4 options as a radiogroup + « valider » button; names via `AutonymExonymHeading` variant `inline` (UX-DR49 #1)                                                                                                                                    |
| `QuizAnswerReveal`  | `{ correct: boolean; correctLabel: string; explanationFr: string; source: QuizSourceRef; assertionId: string; entityHref: string; onNext(): void }`    | Verdict « réponse exacte » / « réponse inexacte » — icon + text + color, never color alone; incorrect uses `--afh-terracotta` (never `--afh-error` — non-alarm rule UX-DR49 #3, a wrong answer is not a system error); « ouvrir la chaîne de sources » opens `SourceChainSheet` |
| `QuizProgressDots`  | `{ current: number; total: number }`                                                                                                                   | Dots are `aria-hidden`; adjacent visible text « question 3 sur 8 » carries the information                                                                                                                                                                                      |
| `QuizScoreCard`     | `{ correctCount: number; total: number; segment: QuizAudience; rung: number; nextRungUnlocked: boolean; shareUrl: string; playedFiches: FicheLink[] }` | Calm copy « 7 réponses exactes sur 8 » — no confetti, no emoji, no exclamation (UX-DR27/34); links back to the fiches encountered (quiz → encyclopedia loop)                                                                                                                    |

**Tokens & type:** reuse `--afh-*` only; two aliases added in the token sheet, not new colors: `--afh-quiz-correct: var(--afh-green)` and `--afh-quiz-incorrect: var(--afh-terracotta)`. Fraunces = prompts and score headline; Nunito Sans = options, buttons, meta. Density profile `--afh-density-reading`.

**Layout, mobile-first:** designed at 320–430 px first — one question per screen, options stacked full-width (min 44 px height), « valider » bottom-aligned within thumb reach; reveal panel has a reserved `min-height` so the reveal causes zero layout shift. 720 px: same column, wider gutters. ≥ 800 px: content capped at `max-width: 800px` (reading-surface cap). `min-width` media queries only.

**Routing & copy:** page at `src/app/[lang]/quiz/page.tsx`, slug `quiz` added to `src/lib/routing.ts` (`PageType` + FR slug map) and UI strings to `src/lib/translations.ts` (French only — no locale reintroduction). Top-bar nav gains a « quiz » entry per UX-DR29. Feature flag `NEXT_PUBLIC_FEATURE_QUIZ` (AR39) gates the nav entry and the route while the bank fills.

**Storybook:** `@storybook/react-vite` stories per component at 430 / 720 / 800 px covering states: answering, revealed-correct, revealed-incorrect, empty-bank, reduced-motion. Missing-story detection applies (NFR37).

## Accessibility (WCAG 2.1 AA)

The quiz is functional scope, not polish: every criterion below is an acceptance criterion in its story.

**Segment picker** — _Keyboard:_ Tab through 5 cards, Enter/Space activates; focus ring `--afh-gold` 2–3 px never suppressed. _Screen reader:_ each card is a button labelled « parcours {segment} — {n} questions disponibles »; disabled segments expose `aria-disabled` plus the explanation text. _Targets:_ cards ≥ 44 × 44 px.

**Question card (defining interactive surface)** — _Keyboard:_ options are a `radiogroup` (`fieldset` + `legend` = prompt) with roving tabindex — arrows move, Space selects, Enter on « valider » commits. Two-step select-then-validate is deliberate: forgiving of accidental taps and screen-reader friendly (no commit on focus). After reveal, focus moves to the reveal heading; « question suivante » is next in tab order. No keyboard trap; Esc closes the source sheet only. _Screen reader:_ prompt is an `h2`; progress text « question {n} sur {total} » is in-DOM before the prompt; verdict + explanation announced via `aria-live="polite"` region (« Réponse exacte. {explication}. Source : {titre}, {année}. »). _No time pressure:_ no timer exists at MVP — pacing is entirely user-controlled (FR71).

**Answer reveal / source chain** — verdict conveyed by icon + text + color simultaneously (UX-DR39); « ouvrir la chaîne de sources » opens `SourceChainSheet`, which brings its own audited dialog semantics (role `dialog`, `aria-modal`, focus trap, return-focus, UX-DR10/36) — reused, not reimplemented.

**Text-first equivalent (first-class deliverable, same story wave):** the quiz contains **no dataviz at MVP** — every informational element is text-native by construction. The two graphical elements have full text equivalents shipped in the same stories: progress dots are `aria-hidden` decoration beside the visible text « question {n} sur {total} » (Story 10.9), and the OG score image is presentational only — the share page carries the complete score, segment, and sourcing line as text (Story 10.10). If map questions ever land (post-Epic 12), their text-first equivalent ships in the same wave as the map — recorded here as a binding constraint.

**Reduced motion:** the only animations (reveal crossfade, sheet slide ≤ 200 ms) resolve to 0.01 ms opacity-only under `prefers-reduced-motion: reduce` (UX-DR4); no pulse, no parallax, nothing conveys meaning through motion.

**CI gates:** axe-core runs on all `src/components/quiz/*.stories.tsx` (zero serious/critical); the Playwright a11y workflow (`a11y.yml`, AR20) adds `/fr/quiz` including one scripted full keyboard-only session; per-release manual pass (NFR20) covers the quiz journey with VoiceOver (iOS Safari) + NVDA in French, 200 % zoom sanity, and deuteranopia/protanopia simulation on the verdict states.

## Performance

Target: Lighthouse mobile ≥ 85 on `/fr/quiz` (added to the `lighthouse.yml` reference routes), LCP ≤ 2.5 s / INP ≤ 200 ms / CLS ≤ 0.1 on the 4G profile.

- **One round-trip per session:** the full session payload (8 questions + answers + explanations + source refs, a few KB gzipped) is fetched once; answer/reveal/next are pure client state — zero network on the play loop, which is the decisive choice for the entry-level-Android-on-4G reference device.
- **SSR + lazy island:** `/fr/quiz` server-renders the segment picker (static, cacheable); the play island loads via `next/dynamic` on segment selection, keeping the landing bundle lean. Combined quiz-component JS budget ≤ 15 KB gzipped (no library — plain React state).
- **CLS discipline:** reveal panel space reserved via `min-height`; no image content in the play loop.
- **New dependencies: none.** Explicit decisions (KISS, alternative considered):
  - _OG image:_ `next/og` `ImageResponse` (built-in) — over `@vercel/og` (redundant duplicate of the built-in) and raw `satori` (lower-level, no benefit). **Zero bundle impact** (server-only route).
  - _Play state:_ `useReducer` — over `xstate` (a 3-state machine does not justify a dependency).
  - _Random draw:_ Postgres `ORDER BY random()` — over `TABLESAMPLE` or app-side shuffling infra (bank is thousands of rows at most; measure before optimizing).
- **Caching:** `/v2/quiz/segments` `s-maxage=3600`; session `no-store`; the landing page is edge-cacheable.

## Test Plan (TDD)

TDD is mandatory: each story below opens with its named failing test file(s); Red → Green → Refactor; `make check` before done; no new failures beyond the known pre-existing set (AR41). Placement per project conventions:

| Layer             | Test files                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (lib)        | `src/lib/quiz/__tests__/questionTemplates.test.ts` · `src/lib/quiz/__tests__/eligibility.test.ts` · `src/lib/quiz/__tests__/segmentPolicy.test.ts` · `src/lib/quiz/__tests__/scoreCardParams.test.ts` |
| Script            | `scripts/__tests__/generateQuizQuestions.test.ts` (real fixtures over deep Supabase mocks — the known mock trap)                                                                                      |
| Service / handler | `src/api/v2/services/__tests__/quizService.test.ts` · `src/api/v2/handlers/__tests__/quiz.test.ts`                                                                                                    |
| API routes        | `src/app/api/v2/__tests__/quiz.test.ts`                                                                                                                                                               |
| Components        | colocated `src/components/quiz/*.test.tsx` (behavior through the public interface: render, keyboard, announcements — no internal poking)                                                              |
| A11y/E2E          | quiz journey added to the Playwright a11y suite (`a11y.yml`)                                                                                                                                          |

## Epic 10 Definition

**Epic goal:** Any visitor — child to professional — plays short, anonymous, fully accessible quiz sessions generated exclusively from verified fiche data, where every answer teaches the fact _and_ its source, and shares a zero-PII score card.

**FRs covered:** FR65, FR66, FR67, FR68, FR69, FR70, FR71

**Key deliverables:** `quiz_questions` + `quiz_generation_runs` tables (migration `0NN`, RLS public-read/service-write) · template engine T1–T5 over strict-model field paths · FR65 verification gate (generation-time + serve-time re-check) · children field-path allowlist bound to the editorial doctrine · `scripts/generateQuizQuestions.ts` sweep + QZ-1..QZ-5 CI integrity checks · `/v2/quiz/segments` + `/v2/quiz/session` (3-layer, envelope, OpenAPI) · `/fr/quiz` surface (`QuizSegmentPicker`, `QuizQuestionCard`, `QuizAnswerReveal`, `QuizProgressDots`, `QuizScoreCard`) reusing `SourceChainSheet` / `AutonymExonymHeading` · `next/og` score card · localStorage difficulty ladder · axe + keyboard + Lighthouse CI gates on the quiz route.

**Depends on:** Epic 0 (CI, flags substrate), Epic 1 (Module 0 fabric + `SourceChainSheet`/`ConfidenceChip`), Epic 2 (reading surface, routing, `AutonymExonymHeading`); soft: Epic 3 (live-fiche citation links). Sequenced after Epics 7–9 in the module wave without technical dependency on them.
**Enables:** nothing structural downstream (module-private by design); editorially, it is the site's all-public entry door and the Play pillar's first shipment.

## Stories

### Story 10.1: Quiz engine schema (migration `0NN_quiz_engine.sql`)

**As a** platform engineer,
**I want** module-private `quiz_questions` and `quiz_generation_runs` tables with RLS,
**So that** generated questions are stored auditable, revocable, and publicly readable while writes stay service-role-only (FR65, AR2-pattern, AR45).

**Acceptance Criteria:**

**Given** migrations up to the current head exist
**When** I add `supabase/migrations/0NN_quiz_engine.sql` (`0NN` = the next free migration number at implementation time)
**Then** it creates the `quiz_audience` enum, both tables, the partial serving index, and RLS policies exactly as sketched in this spec, and re-applying it is a no-op (idempotent guards)

**Given** the migration is written
**When** it references `entity_type` and `assertions(id)`
**Then** it follows the Module 0 TEXT `entity_type` convention (migration `009` — no enum type exists) and reuses the Module 0 `assertions` table — no competing definitions

**Given** the AR45 runbook
**When** the migration ships
**Then** it is applied by a human via `supabase db push` and the PR description states the apply status explicitly

**Technical notes:** touches `supabase/migrations/0NN_quiz_engine.sql` only. Failing test first: `scripts/__tests__/generateQuizQuestions.test.ts` gains a schema-shape fixture assertion (table/column contract the script compiles against). **Schema story runs first and alone — nothing else in this epic starts before it merges.**

---

### Story 10.2: Question template engine (`src/lib/quiz/questionTemplates.ts`)

**As a** data engineer,
**I want** pure functions that turn a fiche + reference pools into candidate questions for templates T1–T5,
**So that** question text is deterministic, fabricated-string-free, and unit-testable without a database (FR65, FR66).

**Acceptance Criteria:**

**Given** a fixture fiche and distractor pools of real sibling values
**When** a template instantiates
**Then** it returns `{ templateId, entityType, entityId, fieldPath, promptFr, optionsFr[4], correctOption, explanationFr, baselineDifficulty }` with all four options distinct and every distractor drawn verbatim from the supplied real-value pool

**Given** a distractor candidate equal to the correct answer (same value on another entity)
**When** options are assembled
**Then** it is filtered out; if fewer than 3 valid distractors remain, the template returns `null` (no question) rather than padding with invented values

**Given** a prompt or option containing a people or language name
**When** rendered downstream
**Then** the candidate carries the autonym-first name structure required by `AutonymExonymHeading` (autonym + optional exonym fields, not a bare display string)

**Technical notes:** new `src/lib/quiz/questionTemplates.ts` + `src/types/quiz.ts`. Failing test first: `src/lib/quiz/__tests__/questionTemplates.test.ts`. Pure lib — parallelizable with 10.3/10.4 after 10.1.

---

### Story 10.3: FR65 verification gate (`src/lib/quiz/eligibility.ts`)

**As a** platform engineer,
**I want** a single, heavily tested predicate deciding whether a fiche/assertion may feed a question,
**So that** the load-bearing credibility rule lives in one place used identically by the generator and the serve-time re-check (FR65).

**Acceptance Criteria:**

**Given** inputs `{ confidenceScore, lastHumanAuditAt, assertionSources[], openFlagCount }`
**When** `isQuizEligible` evaluates
**Then** it returns `true` only if score ≥ threshold (env `QUIZ_MIN_CONFIDENCE`, default 80) AND `lastHumanAuditAt` is set AND ≥ 1 source is Tier 1/2 (`type ∈ {primary, secondary}` and `resolvable`) AND `openFlagCount === 0`

**Given** any single condition fails
**When** evaluated
**Then** the result is `false` with a machine-readable rejection reason (enum) for the generation-run audit counters

**Given** boundary values (score exactly at threshold, empty sources array, null audit date)
**When** tested
**Then** each boundary has an explicit test — this module targets exhaustive branch coverage

**Technical notes:** new `src/lib/quiz/eligibility.ts`. Failing test first: `src/lib/quiz/__tests__/eligibility.test.ts`. No Supabase access here — pure predicate over fetched rows (services supply data).

---

### Story 10.4: Audience segmentation, difficulty ladder & children allowlist (`src/lib/quiz/segmentPolicy.ts`)

**As a** product engineer,
**I want** the segment × template × field-path × difficulty matrix as declarative data,
**So that** the children exclusion (FR69) and the per-audience ladder (FR68) are auditable configuration, not scattered conditionals.

**Acceptance Criteria:**

**Given** the policy module
**When** inspected
**Then** it exports: rung ranges per segment (children 1–2, teens 1–3, adults 2–4, university 3–5, professionals 3–5 — initial proposal), template availability per segment, and the **children field-path allowlist** (initial proposal: `content.appellations.selfAppellation`, `content.appellations.mainName`, `languageFamilyId`, `content.languages.mainLanguage`, `currentCountries`, `content.culture.symbols`, `content.culture.artsAndMusic`) with a doc comment referencing the editorial-doctrine sensitive-topic clause and its slug

**Given** any candidate question for `audience = 'children'`
**When** `isAllowedForSegment` evaluates a field path outside the allowlist (e.g. `content.origins.majorHistoricalEvents`, `content.historicalRole.conflictsOrAlliances`, `content.appellations.whyProblematic`, `content.appellations.originOfExonyms`, `content.culture.spiritualities`)
**Then** it returns `false` — allowlist semantics: anything not explicitly allowed is excluded for children

**Given** the allowlist changes later
**When** a PR edits it
**Then** the module's doc comment requires a doctrine reference in the PR description (policy change = editorial decision, flagged for advisory sign-off)

**Technical notes:** new `src/lib/quiz/segmentPolicy.ts`. Failing test first: `src/lib/quiz/__tests__/segmentPolicy.test.ts`. Allowlist scope is Open Question #2 — implement the proposal, mark for sign-off.

---

### Story 10.5: Generation sweep + bank integrity CI (`scripts/generateQuizQuestions.ts`) — **blocking data story**

**As a** platform engineer,
**I want** an idempotent script that generates, revokes, and audits the question bank, wired into nightly CI,
**So that** the bank always mirrors the current verified corpus and QZ-1..QZ-5 hold continuously (FR65, FR69, AR20).

**Acceptance Criteria:**

**Given** the script runs (`tsx scripts/generateQuizQuestions.ts`)
**When** it completes
**Then** it has (a) generated questions only for gate-passing (10.3) and policy-passing (10.4) candidates via templates (10.2), (b) revoked every active question that now fails the gate or the QZ-2 staleness check with `revoked_reason` set, (c) written exactly one `quiz_generation_runs` row with generated/revoked/rejected counters, and (d) logged through `@/lib/api/logger` using the admin client server-side only

**Given** a fiche revision changed a value used as a correct answer
**When** the next sweep runs
**Then** the stale question is revoked (QZ-2) and a fresh one generated only if the revised assertion passes the gate

**Given** the nightly data-integrity workflow
**When** extended with `tsx scripts/generateQuizQuestions.ts --check`
**Then** check mode mutates nothing and fails CI on any QZ-1..QZ-5 violation in the active bank (children allowlist audit included)

**Given** an empty eligible corpus
**When** the sweep runs
**Then** it succeeds with zero questions — an empty bank is a valid, honest state

**Technical notes:** new `scripts/generateQuizQuestions.ts`; edits `.github/workflows/data-integrity.yml` (append job). Failing test first: `scripts/__tests__/generateQuizQuestions.test.ts` (real fixtures, not deep Supabase mocks). Depends on 10.1–10.4. **Blocks 10.6+ — no serving layer ships before the bank pipeline exists.**

---

### Story 10.6: Quiz service & session composer (`src/api/v2/services/quizService.ts`)

**As a** backend engineer,
**I want** a service that lists segments and composes sessions with a serve-time gate re-check,
**So that** even between sweeps, no gate-failing question ever reaches a player (FR65, FR66).

**Acceptance Criteria:**

**Given** `getQuizSegments()`
**When** called
**Then** it returns the five segments with per-rung active question counts in one aggregate query (no N+1)

**Given** `composeQuizSession({ segment, difficulty, count })`
**When** executed
**Then** it draws `count` random active questions for `(segment, difficulty)`, then re-validates the draw against current `confidence_scores` and open `flags` in **batched** lookups (AR17 pattern), silently dropping any failure and returning the survivors

**Given** a question dropped by the re-check
**When** the session returns short (or empty)
**Then** the service returns the shorter array without error — the handler/UI own the empty-state semantics

**Given** the service module
**When** reviewed
**Then** it performs no param validation (route-layer concern) and uses the server Supabase client with defensive `??`/`?.` (strict-off discipline)

**Technical notes:** new `src/api/v2/services/quizService.ts`. Failing test first: `src/api/v2/services/__tests__/quizService.test.ts`. Depends on 10.1, 10.5 (bank shape), 10.3 (shared gate predicate).

---

### Story 10.7: `/v2/quiz/*` routes, handlers, schemas & OpenAPI

**As a** third-party or first-party consumer,
**I want** documented `/v2/quiz/segments` and `/v2/quiz/session` endpoints in the standard envelope,
**So that** the quiz surface (and any future reuse) consumes a contract-stable API (FR66, AR8, AR9, NFR38).

**Acceptance Criteria:**

**Given** the 3-layer pattern
**When** I create `src/app/api/v2/quiz/segments/route.ts`, `src/app/api/v2/quiz/session/route.ts`, `src/api/v2/handlers/quiz.ts`, and `src/api/v2/schemas/quiz.ts`
**Then** routes only parse (Zod, via `utils/validation.ts`), set CORS (`lib/api/cors.ts`) and cache headers (`segments` `s-maxage=3600`; `session` `no-store`); handlers hold the business logic; no layer is collapsed

**Given** invalid params (`segment=babies`, `count=50`)
**When** requested
**Then** `400 VALIDATION_ERROR` in the standard error shape; a rung outside the segment's range returns `422 SEMANTIC_ERROR`; the anonymous 60 req/min limit returns `429 RATE_LIMITED` with `Retry-After` + `X-RateLimit-*`

**Given** a successful session response
**When** inspected
**Then** the envelope is `{ data: { segment, difficulty, questions: [...] }, meta: { license: "CC-BY-SA-4.0", attribution }, errors: [] }` with each question carrying prompt, options, `correctOption`, `explanationFr`, source ref (title, year, tier, url), `assertionId`, and the entity link (type, id, slug, autonym, exonym) — all dates as ISO strings

**Given** `src/lib/api/openapiV2.ts`
**When** the same PR lands
**Then** both paths are fully specified (params, schemas, error codes) and the OpenAPI-diff gate passes

**Technical notes:** new files above + OpenAPI edit. Failing tests first: `src/api/v2/handlers/__tests__/quiz.test.ts`, `src/app/api/v2/__tests__/quiz.test.ts`. Depends on 10.6.

---

### Story 10.8: `/fr/quiz` landing page & `QuizSegmentPicker`

**As a** visitor,
**I want** a quiz entry page where I choose my audience segment,
**So that** I start a session suited to me in one tap, with honest availability per segment (FR66, FR43).

**Acceptance Criteria:**

**Given** routing
**When** I add `quiz` to `src/lib/routing.ts` (`PageType` + FR slug) and strings to `src/lib/translations.ts` (French only)
**Then** `/fr/quiz` server-renders the segment picker fed by `/v2/quiz/segments`, and the top-bar nav gains a « quiz » entry — all gated by `NEXT_PUBLIC_FEATURE_QUIZ` (AR39)

**Given** the five cards at 320–430 px
**When** rendered
**Then** they stack single-column, each ≥ 44 px tall, labels « enfants » / « ados » / « adultes » / « étudiants » / « professionnels » with available-question counts; layout escalates at 720 / 800 px with no horizontal scroll

**Given** a segment with zero active questions
**When** displayed
**Then** the card is visibly non-launchable with the calm copy « les questions de ce parcours arrivent — les fiches correspondantes sont en cours de vérification » (no broken state, no fake session)

**Given** the Storybook story at 430 / 720 / 800 px
**When** axe-core runs
**Then** zero serious/critical violations

**Technical notes:** new `src/app/[lang]/quiz/page.tsx`, `src/components/quiz/QuizSegmentPicker.tsx` (+ story); edits `src/lib/routing.ts`, `src/lib/translations.ts`, nav component, `src/lib/featureFlags.ts`. Failing tests first: `src/components/quiz/QuizSegmentPicker.test.tsx`. Depends on 10.7 (can develop against the schema with fixtures in parallel).

---

### Story 10.9: Session play loop — `QuizQuestionCard`, `QuizAnswerReveal`, `QuizProgressDots`, `use-quiz-session`

**As a** player,
**I want** to answer questions one at a time and immediately see the correct answer with its source,
**So that** each question teaches both the fact and how it is known (FR67, FR68, FR71).

**Acceptance Criteria:**

**Given** a selected segment
**When** the play island mounts (lazy via `next/dynamic`)
**Then** `use-quiz-session` fetches one session via TanStack Query (single round-trip) and drives the `answering → revealed → finished` reducer with zero further network calls during play

**Given** a question in `answering`
**When** operated by keyboard only
**Then** the radiogroup (fieldset/legend, roving tabindex, arrows move, Space selects) plus « valider » (Enter) completes the loop; after reveal, focus lands on the verdict heading and « question suivante » follows in tab order; no timer or auto-advance exists anywhere

**Given** the reveal for any answer
**When** rendered
**Then** it shows verdict (icon + text + color; incorrect = `--afh-terracotta`, never `--afh-error`), the correct answer, `explanationFr`, and the source line (title, year, tier badge) — and « ouvrir la chaîne de sources » opens `SourceChainSheet` for `assertionId`; the verdict + explanation are announced via `aria-live="polite"`

**Given** the progress indicator
**When** rendered
**Then** dots are `aria-hidden` and the visible text « question {n} sur {total} » carries the same information (text-first, same story)

**Given** a session finishing with ≥ 75 % correct
**When** the score screen is reached
**Then** the next rung for that segment is persisted in `localStorage` only, keyed per segment, and pre-selected next time (FR68) — nothing is sent to the server

**Given** stories for all states (answering, revealed-correct, revealed-incorrect, reduced-motion) at 430 / 720 / 800 px
**When** axe-core runs
**Then** zero serious/critical violations; reveal transitions resolve to opacity-only ≤ 0.01 ms under `prefers-reduced-motion: reduce`; the reveal panel's reserved `min-height` keeps CLS at 0 during the loop

**Technical notes:** new `src/components/quiz/QuizQuestionCard.tsx`, `QuizAnswerReveal.tsx`, `QuizProgressDots.tsx` (+ stories), `src/hooks/use-quiz-session.ts`. Failing tests first: colocated `src/components/quiz/QuizQuestionCard.test.tsx`, `QuizAnswerReveal.test.tsx`, `QuizProgressDots.test.tsx` covering keyboard model + announcements through the public interface. Depends on 10.7, 10.8.

---

### Story 10.10: Score screen & shareable OG score card

**As a** player,
**I want** a calm score screen and a shareable link with an OG image,
**So that** I can pass the quiz on without exposing any personal data (FR70).

**Acceptance Criteria:**

**Given** a finished session
**When** the score screen renders
**Then** it shows « {c} réponses exactes sur {t} », the segment, rung-unlock state, links to the fiches encountered, « rejouer », and « partager le score » — no confetti, no emoji, no exclamation marks (UX-DR27/34)

**Given** « partager le score » is activated
**When** the Web Share API is available
**Then** it shares the stateless URL `/fr/quiz/score?segment=&correct=&total=&rung=`; otherwise the URL is copied with a polite « copié » `aria-live` confirmation

**Given** the share URL is opened
**When** the page renders
**Then** the full score content is present as text (the OG image is decorative for social previews only — text-first equivalent, same story), with a single CTA to `/fr/quiz`, and `generateMetadata` points `og:image` at `/api/og/quiz-score` with the same validated params

**Given** forged params (`correct=47&total=8`)
**When** either the page or the OG endpoint validates them via the shared Zod schema (`correct ≤ total`, `total ∈ [5,10]`, known segment)
**Then** the request 404s — absurd cards cannot render (accepted residual: honest-looking forged scores are possible and harmless; no leaderboard exists — dignity rule)

**Given** the OG endpoint
**When** implemented
**Then** it uses `ImageResponse` from `next/og` (no new dependency), lives at `src/app/api/og/quiz-score/route.tsx` outside `/v2` (AR8 envelope does not apply to images), and renders segment + score + « chaque réponse est sourcée » with `--afh-*` palette values

**Technical notes:** new `src/components/quiz/QuizScoreCard.tsx` (+ story), `src/app/[lang]/quiz/score/page.tsx`, `src/app/api/og/quiz-score/route.tsx`, `src/lib/quiz/scoreCardParams.ts`. Failing tests first: `src/lib/quiz/__tests__/scoreCardParams.test.ts`, `src/components/quiz/QuizScoreCard.test.tsx`. Depends on 10.9.

---

### Story 10.11: Quiz a11y & performance CI gates

**As a** release owner,
**I want** the quiz journey wired into the existing automated and manual quality gates,
**So that** FR71 and the Lighthouse ≥ 85 budget are enforced continuously, not once (FR71, NFR18–NFR23, UX-DR35, AR20).

**Acceptance Criteria:**

**Given** the Playwright a11y workflow (`a11y.yml`)
**When** extended
**Then** it runs axe-core on `/fr/quiz` and on a scripted full session (segment → 8 questions → score) with zero serious/critical violations, and includes one **keyboard-only** end-to-end pass asserting focus order and the absence of traps

**Given** the Lighthouse workflow (`lighthouse.yml`)
**When** extended
**Then** `/fr/quiz` joins the reference routes with mobile Performance ≥ 85 as a blocking threshold, and the play-island bundle report confirms ≤ 15 KB gzipped for `src/components/quiz/*`

**Given** the per-release manual pass (NFR20, UX-DR43)
**When** this epic ships
**Then** the quiz session is the designated journey for VoiceOver (iOS Safari) + NVDA (Windows Firefox) validation in French, plus 200 % zoom and deuteranopia/protanopia simulation on the verdict states — checklist recorded in the PR

**Technical notes:** edits `.github/workflows/a11y.yml`, `.github/workflows/lighthouse.yml`, adds the Playwright quiz journey spec alongside the existing a11y suite. Depends on 10.8–10.10 (runs last). No product code — gate wiring only.

---

## Out of Scope

- **Map-based questions** — require the Africa basemap owned by Epic 12; revisit after Epic 12 ships (their text-first equivalent must ship in the same wave, per the constraint recorded above).
- **Account-linked progress persistence** — explicitly a Growth item per the module definition; MVP persistence is device-local `localStorage` only.
- **Leaderboards, rankings, streaks, or any competitive/engagement metric** — permanently excluded by the dignity rule (UX-DR49 #5), not merely deferred.
- **Timed mode** — MVP has no time pressure at all; an _optional_ timed mode is a Growth discussion (Open Question #5).
- **Question authoring/editing UI** — the bank is generated-only; humans improve questions by improving fiches and audits, never by hand-editing questions.
- **Free-text or AI-generated question prose** — only template instantiation over structured, verified fields; no LLM in the question path.
- **Per-user analytics / answer telemetry** — conflicts with privacy defaults (AR26); aggregate difficulty calibration is Open Question #4.
- **Multilingual quiz** — French only (`Language = "fr"`); no locale switch reintroduction.
- **Spaced repetition / adaptive engines, multiplayer, native apps** — out entirely.
- **Visual polish beyond tokens + shadcn** — deferred to the designer-led redesign phase; this epic maximizes functional a11y, not aesthetics.

## Open Questions

1. **Quiz confidence threshold** — is `QUIZ_MIN_CONFIDENCE = 80` (plus mandatory human audit) the right bar, and should it be published on the doctrine page as part of the transparency posture? Needs product-owner (and ideally advisory-board) confirmation before Story 10.3 hardens the default.
2. **Children allowlist sign-off** — the field-path allowlist in Story 10.4 is an engineering proposal; the editorial doctrine's sensitive-topic clause must be extended (or confirmed to cover) quiz-specific exclusions, with advisory sign-off. Who owns that doctrine addendum and on what timeline?
3. **Minimum viable bank to open the door** — given the audit backlog (most of the 924 fiches unaudited), should `/fr/quiz` launch behind `NEXT_PUBLIC_FEATURE_QUIZ` only once a minimum active-question count per launched segment is reached (e.g. ≥ 40/segment), or launch with whatever passes the gate and honest empty states?
4. **Aggregate difficulty calibration** — may we record _aggregate, anonymous_ per-question error rates (e.g. Plausible custom events) to calibrate template difficulty, or does the privacy posture (AR26) exclude even that? Determines whether difficulty stays template-static.
5. **Segment merge at MVP** — with a small initial bank, should « étudiants » and « professionnels » merge into one advanced segment until the bank supports five distinct ladders?
6. **Children-segment copy level** — UX-DR34 sets CEFR B1 for the site; children copy likely needs simpler French (A2). Who validates the children microcopy (francophone copywriter / educator)?
