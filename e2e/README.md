# e2e — Playwright suite

End-to-end tests for Africa History (EthniAfrica), driven by the persona +
emotional-matrix-driven test strategy under
`_bmad-output/test-artifacts/test-design/`. Run with `npm run e2e`.

## Layout

```
e2e/
├── support/
│   ├── fixtures.ts            # Playwright test.extend — testRunId, signIn, supabaseAdmin
│   ├── auth.ts                # signInAsRole — STUB until Supabase Auth migration (ASR-1)
│   ├── device-profiles.ts     # Reference 4G Android profile (ASR-7)
│   ├── guardrails.ts          # Emotion-guardrail assertions (R-10)
│   ├── clients/
│   │   └── supabase-admin.ts  # Test-only admin client
│   └── factories/
│       ├── fiche.ts           # seedFiche — STUB until per-assertion data model (R-2, ASR-4, ASR-6)
│       ├── flag.ts            # seedFlag — STUB, depends on flag schema
│       └── key.ts             # seedKey — STUB until test API-key tier (ASR-5)
├── global.setup.ts            # Pre-flight env check; future: migrations + reference seed
├── amina/                     # Reading-surface happy path (Phase 1)
├── kofi/                      # Per-assertion flagging (Phase 2 — gated on R-2)
├── fatou/                     # Moderator triage (Phase 3 — desktop ≥ 1024 px)
├── thomas/                    # Public API + developer portal (Phase 4)
├── ngozi/                     # Pinned-version pedagogy (Phase 1)
└── cross-cutting/             # Emotion-guardrails, data invariants
```

## Tags

| Tag                                            | Purpose                                           |
| ---------------------------------------------- | ------------------------------------------------- |
| `@amina @kofi @fatou @thomas @ngozi`           | Persona scope                                     |
| `@phase-1 @phase-2 @phase-3 @phase-4 @phase-5` | UX phase roadmap                                  |
| `@nfr-perf @nfr-a11y @nfr-security`            | Non-functional axis                               |
| `@emotion-guardrail`                           | Negative assertion against UX "emotions to avoid" |
| `@cross-viewport`                              | Run at 430 / 720 / 800 (default is 430 only)      |

Select with grep, e.g. `npx playwright test --grep "@amina|@phase-1"`.

## Environment

Copy `.env.example` to `.env.local` (or set in CI) and provide:

| Variable                        | Purpose                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `BASE_URL`                      | Defaults to `http://localhost:3000`. Override for staging.         |
| `NEXT_PUBLIC_SUPABASE_URL`      | Test project URL                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Test project service-role key — NEVER use prod                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Test project anon key                                              |
| `SKIP_WEB_SERVER`               | Set to skip the local `npm run dev` boot (when BASE_URL is remote) |
| `CI`                            | Auto-set on GitHub Actions; tunes parallelism + reporter           |

The recommended local backend is **Supabase CLI** (`supabase start`) so the
gate runs against a clean database every PR. Staging Supabase is reserved for
nightly smoke + perf only.

## Reference device profile (ASR-7)

Mobile-first non-negotiable. The default `mobile-430` project encodes:

- Viewport 430 × 812 px, deviceScaleFactor 2.625, isMobile, hasTouch
- Locale `fr-FR`, timezone `Africa/Dakar`
- `X-Test-Bypass-Cache` header to skip `s-maxage` edge cache (ASR-3)

Persona thresholds (Amina 10 s, Ngozi 30 s) are SLOs against this profile.
Do NOT assert wall-clock budgets against `Desktop Chrome` — assertions will
pass on a fast laptop and fail on real users.

## Quarantine

Pre-existing 6 + 4 Vitest failures are excluded from the gate via
`vitest.config.ts` `exclude` pattern (ASR-11). They are out of scope unless
the active task explicitly fixes them.

## Open implementation work

These pieces are scaffolded as stubs and must be implemented as the underlying
schema/auth/key infrastructure lands. See TEA test design ASR-1, ASR-2, ASR-4,
ASR-5, ASR-6.

| File                         | Blocked by                                     |
| ---------------------------- | ---------------------------------------------- |
| `support/auth.ts`            | Supabase Auth + OAuth migration (Phase 3 prep) |
| `support/factories/fiche.ts` | `fiche_revisions` table + per-assertion schema |
| `support/factories/flag.ts`  | `flags` table + assertion FK                   |
| `support/factories/key.ts`   | `api_keys.tier='test'` + reset endpoint        |
