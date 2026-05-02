---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
status: complete
classification:
  projectType: web_app
  projectTypeSecondary: api_backend
  domain: edtech
  domainQualifier: cultural-heritage-open-data-commons
  complexity: high
  projectContext: brownfield
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-vision.md
  - _bmad-output/planning-artifacts/product-brief-vision.distillate.md
  - _bmad-output/project-context.md
  - docs/index.md
  - docs/project-overview.md
  - docs/architecture.md
  - docs/data-models.md
  - docs/api-contracts.md
  - docs/component-inventory.md
  - docs/development-guide.md
  - docs/source-tree-analysis.md
  - docs/DEPLOYMENT.md
  - docs/INSTRUCTIONS_AFRIK.txt
  - docs/PRÉREQUIS_AFRIK.txt
documentCounts:
  briefs: 2
  research: 0
  brainstorming: 0
  projectDocs: 11
projectType: brownfield
scope: product-wide
workflowType: "prd"
---

# Product Requirements Document - ethniafrica

**Author:** Jnk
**Date:** 2026-04-15

## Executive Summary

Africa History is a free, open-data, mobile-first public commons that retells the history of African peoples from their own point of view. Delivered in French first — multilingual deferred — for African secondary and university students, teachers, the continental curious public, and the African diaspora pursuing identity and heritage. Not targeting academia or Western curiosity as primary audiences.

The product is a brownfield continuation of EthniAfrica's V2 stack (Next.js 16 + Supabase, public API v2 with OpenAPI, 924 PPL fiches, 24 FLG, 55 countries, "Carte vivante" country-page design system live in production). This PRD re-scopes the roadmap around a transversal verification fabric and ten successor modules. Working name "Africa History" supersedes "EthniAfrica" (the term _ethnie_ carries colonial baggage); final naming is an open decision tracked in this PRD.

The problem is not an absence of encyclopedias on African peoples — Wikipedia, Britannica and their peers cover them. The problem is that **their grammar reproduces the colonial gaze**: exonyms as default, classifications presented as certainties, power-to-name left uncontested, colonial frontiers naturalized. Africa History inverts all three — endonyms first, classifications contextualized and contestable, imposed borders problematized — and makes the inversion auditable, not editorial.

Experience organized around a triptych — **Names · Links · Gazes** — and three access modes: **Explore** (atlas, maps, fiches), **Understand** (timelines, analyses, narrative modules), **Play** (quizzes, comparators). Ten product modules implement this surface; a transversal Module #0 ("Sources & Verification") conditions all of them.

### What Makes This Special

**Radical source transparency as a first-class product surface.** Every fiche publishes its confidence score, source chain (primary/secondary/tertiary with resolvable URLs, page, year), last human-verification date, open flags, and public error-reporting inbox. Users do not merely consume content — they can contest assertions, propose counter-sources, and watch moderation happen in public. A written, public editorial doctrine governs endonyms vs. exonyms, contested classifications, and sensitive topics (colonization, race, religion).

**Core insight: radical transparency converts structural weakness into defensible credibility.** Solo-dev development + AI-assisted enrichment + decolonial posture normally compounds into a credibility deficit. Exposed publicly via per-fiche scores, an open audit queue, provenance metadata, automated CI checks (FLG-folder mismatches, duplicates, invalid ISO codes, non-resolvable sources), and a contributor-verification pipeline, the same properties become a credibility surplus — and the primary lever to attract institutional partners (UNESCO, IWGIA, African universities) and scientific volunteers.

**Differentiation moment (under 10 seconds):** a visitor arriving expecting "another Wikipedia for Africa" sees an explicit confidence score above the fold, a reproducibility-grade source trail on every factual assertion, and a visible editorial doctrine on how the site handles contested categories. Nothing else in the African-heritage digital space currently offers this.

**Non-negotiable principles:** free and open data (CC-BY-SA or equivalent, to validate); no monetization (patronage, institutional partnerships, volunteer contributions); decolonial in form and substance; mobile-first (target audience accesses the web primarily via mobile); traceable sources for every assertion; French first.

## Project Classification

- **Project Type:** `web_app` (primary) — Next.js 16 App Router, React 18, Tailwind + shadcn/ui, mobile-first (breakpoints 430 / 720 / 800 px)
- **Project Type (secondary):** `api_backend` — public REST/JSON API v2 with authoritative OpenAPI spec, treated as a first-class product surface for open-data reuse and institutional integrations, not internal plumbing
- **Domain:** `edtech` — educational adoption by teachers/institutions is a tracked success metric; target audience is secondary/university students and educators
- **Domain qualifier:** cultural-heritage / open-data-commons — load-bearing for editorial doctrine, endonym governance, colonial-legacy treatment, CC-BY-SA licensing, and the cross-cutting standards that push complexity above edtech's default
- **Complexity:** `high` — driven by the Module #0 verification fabric (per-fiche confidence, source chains, public error reporting, human-review queue, audit CI, editorial doctrine), contested-classification governance, partnership-grade transparency, and deferred multilingual re-opening
- **Project Context:** `brownfield` — V2 stack in production; the PRD extends it around Module #0 plus ten modules (People page, Language-family page, formalized public API, Names Atlas, Hidden Links between peoples, Migrations Timeline, Interactive Comparator, Colonization & Resistances, Smart Quiz, Africa History Assistant)

## Success Criteria

### User Success

- **Discovery in <10 seconds:** a first-time visitor landing on any fiche (people, country, language family) can see, without scrolling, (a) the endonym/autonym prominently, (b) a confidence score with its source count, and (c) a "contest this assertion" affordance. Baseline target: 100 % of published fiches at launch, because Module #0 is the whole differentiator.
- **Autonomous verification:** a student or teacher can click any factual assertion (population, date, classification, etymology) and land on a resolvable primary or secondary source (URL + page + year) in ≤ 1 click. Target: ≥ 90 % of assertions on "verified" fiches link to a resolvable source by month 12 post-launch.
- **Contestability works:** a user who disagrees with a classification, exonym, or figure can submit a counter-source, receive an auto-acknowledgement, and watch the moderation status publicly. Target: median flag-to-moderation-visible time ≤ 7 days; moderation backlog visible publicly.
- **Educational fit:** a teacher can cite a fiche as a classroom source (stable URL, printable/exportable view, visible source list). Target: ≥ 10 documented teacher/institution citations by month 18.
- **Mobile-first delight:** every page fully usable on a 430 × 812 px viewport with < 2 s TTFB on a mid-range Android over 4G; no horizontal scroll, no tap-target < 44 px. Target: Lighthouse mobile performance ≥ 85, accessibility ≥ 95.

### Business Success

No commercial KPIs (no monetization). Mission-oriented targets:

| Metric                                                                 | 12 months    | 24 months |
| ---------------------------------------------------------------------- | ------------ | --------- |
| PPL fiches with ≥ 2 resolvable sources + human-audited                 | 40 %         | 80 %      |
| % traffic from Africa (continental) + identified diaspora              | ≥ 50 %       | ≥ 60 %    |
| Third-party projects consuming the public API (documented)             | ≥ 3          | ≥ 10      |
| Active verification contributors (monthly)                             | ≥ 10         | ≥ 30      |
| Signed institutional partnership (UNESCO / IWGIA / African university) | 0 (courting) | ≥ 1       |
| Documented educational citations                                       | ≥ 10         | ≥ 50      |

### Technical Success

- **Data integrity, continuous:** automated CI gates block merges on (a) FLG code ≠ parent folder, (b) duplicate `PPL_*` identifiers, (c) populations summing ≠ 100 % per country, (d) invalid ISO 3166-1 α-3 or ISO 639-3 codes, (e) `languageFamilyId` not matching an existing `FLG_*`, (f) non-resolvable source URLs on fiches marked "verified", (g) orphan fiches (no country, no language). Target: zero failing CI gates on `main`.
- **Public API SLOs:** p95 latency ≤ 500 ms for list endpoints, ≤ 200 ms for single-resource lookups (Supabase + Next.js edge cache); OpenAPI spec is the authoritative contract and is regenerated on every build.
- **Audit debt at zero before any cross-fiche module ships:** 8 duplicates resolved, 6 `languageFamilyId` mismatches corrected, non-existent FLG codes (`FLG_KWA`, `FLG_NILO_SAHARIEN`, `FLG_OMOTIC`) remapped or deleted, `PPL_TOKELAU_FAUXEX` removed, 5 fiches with `population = 0` fixed or flagged, filename commas normalized to underscores. Hard gate on MVP.
- **Accessibility baseline:** WCAG 2.1 AA on all public pages (verified in CI via axe-core on representative routes).
- **Confidence-score integrity:** the score shown on a fiche is re-derivable from its stored sources + verification log at any time; no "cosmetic" scores.
- **Rebrand executed without SEO bleed:** 100 % of V1 public URLs either preserved or covered by a 301 redirect; sitemap and canonical tags regenerated.

### Measurable Outcomes

- **Factual-confidence curve:** weekly dashboard of `% fiches with ≥ 2 human-audited resolvable sources`, published publicly as a "verification health" page — radical transparency applied to the product's own credibility.
- **Moderation throughput:** monthly public report of flags received / flags resolved / median time to resolution.
- **Open-data adoption:** quarterly list of third-party projects consuming the API, published as an integrations page.
- **Audience geography:** monthly report of traffic share by region, diaspora-identified share, and referral mix; no PII — aggregate only.

## Product Scope

### MVP — Minimum Viable Product

Goal: earn the right to claim "decolonial credible encyclopedia" by shipping the source-transparency fabric plus a complete country/people reading experience on already-clean data. In strict dependency order:

1. **Editorial doctrine written and published** — endonyms vs. exonyms, contested classifications, sensitive topics (colonization, race, religion), source-quality hierarchy (primary / secondary / tertiary / AI-enriched). Static page, linked from every fiche footer.
2. **Data audit & cleanup** (pre-requisite for any cross-fiche module)
   - Delete `PPL_TOKELAU_FAUXEX`
   - Resolve 8 PPL duplicates
   - Fix 6 `languageFamilyId` mismatches
   - Remap invalid FLG codes (`FLG_KWA`, `FLG_NILO_SAHARIEN`, `FLG_OMOTIC`)
   - Fix 5 zero-population fiches
   - Normalize filenames (comma → underscore)
3. **Module #0 — Sources & Verification MVP** — confidence score + source chain on fiche UI; public error-reporting form; moderator queue (admin); editorial-doctrine link; automated CI audit gates (listed in Technical Success).
4. **Module #1 — People page** — "Carte vivante" design-system extension for the 924 PPL fiches, mobile-first; every factual block pulls provenance from Module #0.
5. **Naming decision** — keep "EthniAfrica" for now OR commit to "Africa History" (or other) with a rebrand plan; decision must precede Modules 2+.

Explicit non-goals for MVP: multilingual reopening (stays deferred), AI assistant (Module 10), quizzes (Module 9), migrations timeline, graph visualizations, comparator.

### Growth Features (Post-MVP)

In roughly this sequence, subject to adoption signals and partnership conversations:

- **Module #2 — Language family page** (interactive tree over the 24 FLG)
- **Module #3 — Public API formalized** (Swagger hosted publicly, free API keys, rate-limit tiers, developer docs, integration showcase)
- **Module #4 — Names Atlas** (etymology + exonym/endonym evolution) — the first "Names" triptych module
- **Module #8 — Colonization & Resistances** (imposed names, partitioned peoples) — the first "Gazes" triptych module; high ideological-leverage, moderate-complexity
- **Rebrand executed** if the decision in MVP was to switch names (301 redirects, sitemap regen, SEO monitoring)
- **Light scientific advisory board** (2–4 volunteers) formalized, their names + affiliations published

### Vision (Future)

- **Module #5 — Hidden Links between peoples** (relational graph: linguistic, migratory, commercial, religious)
- **Module #6 — African migrations timeline** (Bantu, Nilo-Saharan, Cushitic, slave routes, caravans)
- **Module #7 — Interactive comparator** (peoples / countries / languages side by side)
- **Module #9 — Smart quiz** (progressive, frictionless learning)
- **Module #10 — Africa History Assistant** (conversational AI on the dataset; inconsistencies it finds flow back into Module #0's audit queue — the loop closes)
- **Multilingual reopening** (English first, then Spanish / Portuguese) — the code shape is preserved from V1→V2 migration; reopening is a coordinated change, not a re-architecture
- **Institutional partnerships live** — UNESCO, IWGIA, and/or African university(ies) co-curating specific domains
- **Open-data ecosystem** — ≥ 10 third-party projects citing the API; a dataset export distributed under CC-BY-SA on institutional repositories (Zenodo, Harvard Dataverse, etc.)

## User Journeys

### Journey 1 — Amina (primary user, happy path)

**Persona:** Amina, 16, lycéenne in Dakar. Phone: entry-level Android, 4G, data plan rationed. Homework: present a portrait of her people, the Sérère, for Monday's civics class. Most search results she's clicked today were in English or wrote "Serer" as if it were the name they called themselves.

**Opening scene.** 9 p.m., shared bedroom, single bar of wifi. She types _"sérère peuple"_ into her phone, taps the Africa History result because the snippet shows _"A seereer mu ñoom"_ — she recognizes the greeting from her grandmother.

**Rising action.** The page opens in under two seconds. First thing above the fold: the autonym "_Seereer_", then under it a small chip reading **Confidence 74 %** and **12 sources · last verified 2 months ago** (tappable). She scrolls to "Les noms" — the fiche explains that _Sérère_ comes from Wolof, that the internal name is _Seereer_, that nineteenth-century colonial administrators fixed the spelling. She screenshots the paragraph for her presentation.

**Climax.** She taps the confidence chip, curious. A sheet slides up: five primary sources with authors, years, and live URLs; three secondary; four AI-enriched + human-audited. She taps the UNESCO link — it opens to the exact page. For the first time, a website about her people showed her _how it knows what it knows_.

**Resolution.** She copies the fiche's canonical URL and the "citer cette fiche" block (format: title, URL, last-verified date, license CC-BY-SA). She leaves a small in-page action ("je connais ce peuple") that feeds an audience-geography signal — she is in Senegal and she recognized herself. Confidence in the source travels into her slide deck.

**Capabilities this journey forces:**

- Mobile-first fiche layout, ≤ 2 s TTFB on a 4G mid-range Android
- Autonym displayed above exonym, prominent and first
- Visible confidence score + tappable source chain (Module #0 on the reading surface)
- Resolvable primary / secondary / tertiary source URLs
- Canonical URL + "cite this fiche" block with licensing
- Audience self-declaration signal feeding geography analytics (no PII)

### Journey 2 — Kofi (primary user, contest / diaspora)

**Persona:** Kofi, 34, software engineer in Atlanta. Ghanaian father, American mother. Spent the last two weekends on genealogy. On the Africa History Akan fiche, a line reads _"matrilineal kinship structure, largely unchanged into the contemporary period"_. His father's family lived that system dissolving in the 1970s under cocoa-plantation land reforms; the line is incomplete at best.

**Opening scene.** He taps the line. A tiny flag icon appears next to it in hover/long-press — _"contester cette assertion"_.

**Rising action.** The form is short: what's wrong, what's your counter-source, who are you (optional — display name or pseudonym, region). He pastes a link to a J. of African History article he read last week, adds two sentences on his family's experience as context, submits. He receives an auto-acknowledgement email with a **public flag URL** — the flag is already visible on the fiche with status _"en cours de modération"_, and the disputed assertion now shows a small contested marker next to it.

**Climax.** Eleven days later he gets a notification. A moderator (Fatou — see Journey 3) added his article to the fiche's source list, rewrote the contested line with a more nuanced period framing, credited "flagged by Kofi, Atlanta" in a public changelog. The confidence score moved from 74 to 78. Another diaspora reader, two days later, upvotes his original flag as "helpful".

**Resolution.** Kofi shares the fiche in his family group chat with a pride he didn't have when he arrived. He has contributed. He can see exactly what he contributed, and he is credited. He becomes a recurring flagger.

**Capabilities this journey forces:**

- Per-assertion flagging UI (precise, not fiche-wide)
- Counter-source submission + optional identity disclosure
- **Public moderation surface** — every flag has its own URL and visible status
- Public changelog per fiche — every accepted correction visible with contributor credit
- Notifications on flag resolution
- Recomputation of confidence score from underlying sources + verification log (no cosmetic scores)

### Journey 3 — Fatou (secondary user, volunteer moderator)

**Persona:** Fatou, 31, PhD candidate in African linguistics at UCAD, 4 hours/week moderating for Africa History. Her motivation: the editorial doctrine is explicit, the moderation is public, she can write "moderated for Africa History" on her CV without apologizing.

**Opening scene.** Thursday evening. She signs in to the admin surface — same site, single sign-on with a GitHub OAuth — and lands on the moderation queue. Twelve pending flags, sorted by _oldest first_ by default, with a sidebar counter: _median resolution time this month — 5.2 days, target ≤ 7_.

**Rising action.** She picks Kofi's flag. The moderator view shows: the disputed line, the flagger's counter-source preview (article DOI, abstract, year), the fiche's existing sources on that claim, and a suggested edit generated by the assistant. She verifies the DOI resolves, reads the abstract, judges the counter-source as higher quality than the two AI-enriched sources currently attached, rewrites the assertion in nuanced terms, attaches the counter-source, and submits with a short moderation note visible publicly. The UI warns her: _"this assertion is tagged 'sensitive — colonial-economic history'; editorial doctrine §4.2 applies"_ — a link opens the relevant paragraph.

**Climax.** Next she handles a harder flag: a user contests the classification of a small group as a "sous-peuple" of a larger one, claiming it erases autonomy. No counter-source provided. The suggested path is escalation — she clicks **"escalate to advisory board"**, picks two advisors by domain, attaches the thread, adds her own position. The flag's public status moves to _"en arbitrage — conseil scientifique"_.

**Resolution.** She resolves three flags, escalates one, leaves two open awaiting counter-sources. Her dashboard updates her personal contribution log (public, opt-in). The queue's median time inches down.

**Capabilities this journey forces:**

- Moderator dashboard with priority queue, SLA counters, oldest-first default
- Single-sign-on for moderators (OAuth GitHub / Google / ORCID)
- Per-flag view: diff-level disputed assertion, flagger identity (if disclosed), counter-source preview, existing-source comparison, assistant-suggested edit
- Link to editorial-doctrine clauses tagged on sensitive assertions
- **Advisory-board escalation path** — pickable experts, traceable thread
- Public moderator activity log (opt-in, pseudonymizable)
- Confidence score auto-recomputed on assertion change

### Journey 4 — Thomas (secondary user, API consumer)

**Persona:** Thomas, 42, data engineer at a Nairobi-based NGO working on minority-language revitalization. He needs a trustworthy, CC-BY-SA-licensed linguistic dataset of African peoples to seed a multilingual dictionary pipeline. He's burned before by Wikipedia exports (license confusion) and GeoNames (outdated).

**Opening scene.** He googles _"Africa peoples language open data api"_. Third result: Africa History `/api`. He lands on a public developer portal — hosted Swagger UI, a plain-text license statement (CC-BY-SA-4.0, attribution format pre-filled), a "get a free API key" button.

**Rising action.** He signs up (email + purpose statement — kept private; a short self-classification "commercial / academic / nonprofit / journalist / hobbyist" — public in aggregate). His key arrives, with rate limits: 10 req/s, 50 000 req/day. He reads the `/peoples` and `/language-families` endpoints, finds the `?sinceVerifiedAfter=…` filter, the `?minConfidence=…` filter, and the pagination scheme. He pulls a bulk export of all PPL fiches with confidence ≥ 50 %, filtered by Niger-Congo families, into his pipeline.

**Climax.** Two weeks later, his pipeline runs. The fiches include their source arrays, confidence scores, and last-verified dates. He builds a dashboard showing, for each of the 117 peoples his project targets, the confidence curve over time. Four of them have fiches with confidence below 40 % — he decides to focus volunteer effort there first. **Africa History's data chose his team's priorities for them, honestly.**

**Resolution.** He publishes his dashboard, cites Africa History with the mandated attribution, and adds his project to the integrations showcase via a simple submission form. His citation becomes the third documented API consumer in the quarterly integrations report.

**Capabilities this journey forces:**

- Public developer portal with hosted Swagger UI, licensing, attribution block
- Self-serve API keys with rate-limit tiers (free tier non-trivial; documented upgrade path)
- Filters matching the editorial model: `minConfidence`, `sinceVerifiedAfter`, `languageFamilyId`, `countryIso3`
- Bulk / export endpoints and pagination suitable for full-dataset pulls
- Per-fiche response includes source arrays + confidence + verification timestamps (public schema)
- Public integrations showcase with self-service submission
- Quarterly integrations report (public page)

### Journey 5 — Ngozi (primary user, educator edge case)

**Persona:** Ngozi, 44, history teacher in Lagos. Plans a 6-week unit on Yoruba peoples for her Year 10 class. Wants reproducibility: if she builds her lesson around a fiche today, she needs the fiche to still say the same thing when she teaches it in 2027, or she needs a clear record of what changed.

**Opening scene.** On the Yoruba fiche, she taps a small timestamp next to the confidence score: _"Last verified 2026-02-19 · See full revision history"_.

**Rising action.** The revision history sheet opens — a time-ordered list of every editorial change, flag resolution, and source addition since the fiche was published, each with a diff. Above it sits a **"citer une version figée"** button. She taps it — the URL `/fr/peuples/PPL_YORUBA@v34` is copied to her clipboard. She tests it, loads, and the fiche renders exactly as it is today, with a banner reading _"vous consultez la version du 2026-04-15 ; la fiche vivante a évolué depuis"_.

**Climax.** She builds her lesson plan using the pinned version URL, prints two pages (the fiche's "printable view" collapses the interactive graphs into static images but keeps source footnotes numbered). In her lesson plan document she includes the pinned URL, the print-out, and — as an in-class exercise — she asks students to compare the pinned version with the live version a year later, looking for what the moderators changed and why. **The verification fabric becomes pedagogy.**

**Resolution.** She submits her lesson plan to Africa History's "ressources pédagogiques" form so it's listed publicly with her consent. It becomes the fourth teacher-submitted lesson plan. The educational-adoption counter ticks from 3 to 4.

**Capabilities this journey forces:**

- Per-fiche revision history UI with diffs (public, no login)
- **Immutable pinned-version URLs** (e.g. `@v34` semantics) with a banner clearly distinguishing pinned vs. live
- Printable/exportable fiche view with numbered source footnotes
- Public "ressources pédagogiques" submission surface
- Educational-adoption counter (public, aggregate)

### Journey Requirements Summary

| Area                                       | Capabilities                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Reading surface (Modules #0 + #1 + #2)** | Autonym-first layout; confidence score above fold; tappable source chain; resolvable URLs with page/year; canonical URL + citation block; revision history + pinned-version URLs; printable view; mobile-first with strict perf budget                                                                                                     |
| **Contribution & moderation**              | Per-assertion flagging; counter-source submission; optional identity/geo disclosure; public flag URLs and statuses; contributor credit on changelog; notifications on resolution; moderator dashboard (SSO, queue, SLA counters, assistant-suggested edits); advisory-board escalation; per-fiche changelog; confidence auto-recomputation |
| **Editorial doctrine surface**             | Public doctrine page linked from every fiche footer; sensitive-topic tagging + clause links in moderator UI                                                                                                                                                                                                                                |
| **Public API (Module #3)**                 | Developer portal with Swagger + license + attribution; self-serve keys with rate-limit tiers; filters (`minConfidence`, `sinceVerifiedAfter`, `languageFamilyId`, `countryIso3`, etc.); bulk/export; source arrays + verification metadata in responses; integrations showcase; quarterly integrations report                              |
| **Educational & institutional surface**    | Pinned-version URLs; pedagogical-resources submission; teacher/institution citation counter; audience self-declaration signal                                                                                                                                                                                                              |
| **Analytics (no PII)**                     | Audience geography aggregate (continental/diaspora split); moderation throughput dashboard; verification-health dashboard; audience self-declaration feed                                                                                                                                                                                  |

Explicit gaps — intentionally out of MVP scope and not turned into requirements yet: AI conversational assistant (Module #10), quizzes (Module #9), graph/timeline visualizations (Modules #5/#6), comparator (#7). Each will get its own journey when its module PRD scopes it.

## Domain-Specific Requirements

### Compliance & Regulatory

- **GDPR (EU) + equivalents** — the platform is hosted in the EU (Vercel / Supabase EU region), the audience is partly European (diaspora), therefore GDPR applies as baseline. Cookie consent, data-minimization in analytics (no PII in audience-geography signals), right-to-erasure for contributor accounts (flags and comments can be anonymized-in-place; original authorship becomes "anonymous contributor" without destroying the moderation audit trail).
- **COPPA / youth data** — target audience explicitly includes lycéens and high-school students; the product does **not** directly collect data from minors. Contribution features (flagging, counter-source submission, moderator signup) require ≥ 16 years (EU digital age of consent). Pure reading requires no account. This removes COPPA-parental-consent obligations while keeping minors as a welcomed read-only audience.
- **Accessibility** — WCAG 2.1 AA baseline on all public pages; French-language screen-reader testing; respects `prefers-reduced-motion`; minimum 44 px tap targets; color-contrast ≥ 4.5:1 on body text. EU Accessibility Act (EAA) applies from June 2025 for covered services — align even if unclear whether the product falls in scope.
- **Licensing (product content)** — dataset and editorial content: CC-BY-SA-4.0 (to validate with a short legal review before MVP ships; fallback: CC-BY-4.0 if share-alike proves incompatible with partner content). Every public-API response and downloadable export carries license metadata in the payload.
- **Licensing (ingested sources)** — fair-use quotes from academic/encyclopedic sources: short excerpts only, attribution mandatory, links to original. No republication of full source texts.
- **Trademark / naming** — "Africa History" is a generic descriptor; before MVP ships, a short WIPO + EUIPO + AFRIPO search for conflicting marks on exact-string and near-matches in the relevant Nice classes (41 education, 42 software, 45 online publishing). If conflict, revisit naming.
- **No FERPA, no HIPAA, no PCI** — the product is not a school platform, not a health platform, not a payment platform. Explicit non-scope.

### Technical Constraints

- **Security — service-role key isolation** (already enforced by `project-context.md`): `src/lib/supabase/admin.ts` is server-only; any leak is a security incident. CI to forbid imports of `supabase/admin.ts` from files not under `src/app/api/**`, `src/api/**`, `scripts/**`.
- **Security — moderator authentication**: SSO via OAuth (GitHub / Google / ORCID) — no self-hosted password store for moderators. Every moderator action is server-logged with actor + timestamp + before/after diff.
- **Security — contributor rate-limiting**: anti-spam on flag submission (IP + session + content-similarity heuristic); email verification before a flag is publicly visible.
- **Privacy — contributor identity is opt-in**: default pseudonym, disclosure is user-controlled per-contribution (display name + optional region). No real-name requirement.
- **Privacy — analytics**: aggregate only, no cross-session tracking, no third-party ad trackers. Prefer Plausible-style analytics or self-hosted (Umami) over Google Analytics. Respect Do-Not-Track.
- **Performance — mobile-first budget**: Lighthouse mobile score ≥ 85; TTFB ≤ 2 s on 4G; page weight ≤ 500 KB compressed on a people fiche; no render-blocking third-party scripts.
- **Performance — read path**: country / people / family-linguistique pages cached with `s-maxage=86400, immutable` on stable fields; edge-cached via Next.js / Vercel. API list endpoints `s-maxage=3600`, mutable endpoints `revalidate=0`.
- **Availability**: best-effort 99.5 % on public reads; no hard SLA commitments to external consumers until post-MVP (API consumers get a "best-effort" statement in the portal).
- **Data durability**: Supabase daily backups; the JSON source-of-truth under `dataset/source/afrik/**` is tracked in git — the dataset is reproducible from the repo alone.
- **Observability**: structured logging via `src/lib/api/logger.ts` (already in place). Add an error-tracking tier (Sentry free / self-hosted) with PII scrubbing before MVP.

### Integration Requirements

- **None required at MVP.** No third-party integrations block the MVP ship.
- **At Growth** — public developer portal integrations: GitHub OAuth for moderators, OAuth for API-key self-serve (Google + GitHub), Plausible/Umami for analytics, Sentry for error tracking, ORCID for scientific-advisory-board authentication.
- **At Vision** — Zenodo / Harvard Dataverse for dataset-export publication; DOI minting per dataset version; OAI-PMH endpoint if library / repository partners ask.
- **External data sources** (one-way, pull) — Glottolog, Ethnologue (license-respecting excerpts), UNESCO, IWGIA, UN demographics. These are **ingestion sources for enrichment**, not live integrations; pulls are periodic (quarterly) and feed the moderation queue, not the live site.

### Decolonial Content Governance

- **Endonym primacy** enforced in data model: every PPL fiche MUST have a non-null `autonym` field; fiches lacking one are flagged in CI and cannot reach `confidence ≥ medium`.
- **Contested-classification taxonomy**: a closed enum `classificationStatus ∈ {consensual, contested, colonial-legacy, reconstructive}`. Fiches marked `contested` or `colonial-legacy` must cite ≥ 2 sources AND display a doctrine-link banner.
- **Living-culture representation**: fiches representing communities that still exist today are reviewed on a stricter cadence (annually vs. biennially for historical peoples). An opt-in mechanism lets a community's named representative request a curator review — recorded publicly on the fiche.
- **Public editorial doctrine**: `/doctrine` page, versioned, cited from every sensitive assertion. Changes to doctrine require advisory-board sign-off recorded in the public changelog.
- **Moderation transparency**: every moderation action has a public permalink; a sample audit is publishable without breaking anyone's privacy (moderators are pseudonymizable; contributors opt-in on disclosure).

### Risk Mitigations

| Risk                                                                                                  | Severity   | Mitigation                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Defamation / misrepresentation of a living community                                                  | High       | Living-culture review cadence; community opt-in representative channel; doctrine clause on living peoples; takedown-request workflow documented on `/mentions-legales`                    |
| Hallucinated facts shipped under "verified"                                                           | High       | Source-resolvability CI gate; `confidence ≥ verified` requires ≥ 2 human-audited, resolvable sources (no AI-only paths to "verified")                                                     |
| License confusion (user thinks data is public-domain, commercializes it, CC-BY-SA viral clause bites) | Medium     | License metadata in every API response; `/licence` page with worked examples; attribution-format snippet on every fiche                                                                   |
| Polemics spiraling on contested fiches                                                                | Medium     | Per-assertion flagging (narrower than fiche-wide); advisory-board escalation; public doctrine; rate-limiting against brigading                                                            |
| Moderator burnout / solo-dev bus factor                                                               | Medium     | Public contribution credit; written moderator handbook; simple moderator SLA targets published so bar is clear; explicit "it's OK to leave fiches in `contested` status" editorial stance |
| SEO bleed on rebrand                                                                                  | Low-medium | 100 % of V1 URLs covered by 301 redirects before rebrand ships; Search Console monitoring for 30 days post-cut                                                                            |
| Third-party API consumers depending on pre-1.0 shape                                                  | Low-medium | API versioned `/v2`, `/v3` (breaking changes); deprecation notices via `Sunset` header + developer-portal changelog                                                                       |
| Minors posting contributions despite the 16+ gate                                                     | Low        | Age-self-declaration on signup; moderation tools allow removing + anonymizing disclosed content on request                                                                                |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Per-assertion confidence + provenance chain, published on the reading surface.** Not a novel technology stack — standard relational modeling — but genuinely novel as an editorial design stance for an encyclopedic product. Wikipedia, Britannica, and the African-content encyclopedias (ASCL Leiden, SIL Ethnologue, Glottolog) all expose references, but none expose a machine-readable confidence score above the fold, none distinguish primary/secondary/tertiary/AI-enriched visually, and none treat source-resolvability as a CI gate. Fact-checking organizations (Africa Check, Full Fact) have attempted confidence-as-product but claim-by-claim and periodically, not as a persistent fabric on an encyclopedia. Novel at: encyclopedia format × confidence-first fact-checking format.

**2. Pinned-version URLs as a first-class pedagogical surface.** Wikipedia has revision history, but it's editor-facing, buried, and not treated as a reading or citation affordance. `/fr/peuples/PPL_YORUBA@v34` as a publicly-shareable URL that renders the frozen fiche with a banner "this version dates from X, the living fiche has evolved" is a new citation primitive for online educational content. Combined with the public changelog, it turns the verification fabric into pedagogy (Journey 5). Collapses the distinction between "citing an encyclopedic fiche" (normally unstable) and "citing a primary source" (stable via DOI). Closest analog: ArXiv versioned paper URLs, applied to encyclopedic reading instead of academic preprints.

**3. Contested-classification taxonomy as a data-model primitive.** The enum `classificationStatus ∈ {consensual, contested, colonial-legacy, reconstructive}` built into the schema, enforced by CI, surfaced in UI, tied to the public editorial doctrine. Most decolonial content products treat the decolonial stance as editorial copy — tone and framing in prose. Encoding it at the data-model level and making it a UI affordance (banner, doctrine link, stricter source requirement) has not been executed at scale on African content. Novel at: decolonial posture × data-modeling discipline.

**4. AI-enriched dataset × radical-transparency as a deliberate framework.** Solo-dev + AI-assisted enrichment is framed as the reason for the verification fabric, not a secret to be concealed. Sources are tagged `primary / secondary / tertiary / ai-enriched`, and `confidence ≥ verified` explicitly requires human-audited sources — no AI-only path to "verified". Post-2023 AI-slop anxiety has pushed publishers toward hiding AI involvement or disclaiming quality; Africa History's stance is radical disclosure as the trust mechanism. The framework itself is the innovation; if it works, other knowledge-base projects can adopt it as a template.

### Market Context & Competitive Landscape

- **Generalist encyclopedias** — Wikipedia (fr/en) has broad African-peoples coverage but reproduces colonial grammar (exonyms default, flat assertions, power-to-name uncontested). Britannica, Encyclopedia.com: same, with paywalled depth. No confidence scores, no per-assertion flagging. Gap: grammar + transparency.
- **Ethnographic / linguistic specialty databases** — SIL Ethnologue (partly paywalled, language-centric not people-centric), Glottolog (language catalog, CC-BY, not people), ASCL Leiden African Studies (library-focused), UNESCO World Atlas of Languages (thin). Strong data quality, narrow scope. Gap: people-centric narrative + decolonial framing + public moderation.
- **African-content specialty sites** — Wiki Loves Africa (photography initiative), African Heritage Portal (fragmented), various NGO-run portals (short-lived, no open data). Gap: durability, open data, structured schema.
- **Fact-checking / confidence tooling** — Africa Check, ClaimReview schema (Google), Full Fact. Claim-by-claim, periodic. Gap: not integrated into an encyclopedic reading surface.
- **Decolonial academic publications** — scholarly books/journals, dense, inaccessible to secondary-school audience, not open-data. Gap: audience accessibility.

Africa History occupies the empty quadrant: **people-centric × decolonial × open-data × transparency-fabric × secondary-school-accessible**. No known competitor covers all five dimensions; closest is Wikipedia in three (people-centric, open-data, accessible) but missing the load-bearing two (decolonial grammar, transparency fabric).

### Validation Approach

| Innovation                                | Validation method                                                                                                                                                                                                                                                             | Success signal                                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Confidence + provenance fabric            | Post-MVP user research: 5–8 qualitative interviews with lycéens, teachers, diaspora users on whether the confidence score changes their trust / cite behavior. A/B-style comparison: show same fiche with vs. without confidence chip; measure click-through to source links. | ≥ 60 % of interviewees report the chip changed how they would use the fiche; source-link CTR ≥ 15 % on fiches with confidence < 80 %          |
| Pinned-version URLs as citation primitive | Post-MVP teacher outreach: onboard 3–5 teachers, ask them to build a lesson using a pinned URL. Observe whether they cite the pinned URL vs. the live URL.                                                                                                                    | ≥ 2 of 5 teachers use pinned URLs in final lesson plans; "ressources pédagogiques" page lists ≥ 3 pinned citations within 6 months of MVP     |
| Contested-classification taxonomy         | Apply the enum to the 924 existing PPL fiches during data-audit cleanup. Measure how many require `contested` / `colonial-legacy`. If > 30 %, the taxonomy is load-bearing; if < 5 %, it is decorative.                                                                       | 10–40 % of fiches tagged non-`consensual` at MVP launch — proves the taxonomy discriminates                                                   |
| Radical-transparency on AI enrichment     | Post-MVP: measure fraction of contested flags that originate from fiches tagged `ai-enriched-only` vs. `human-audited`. Complementary: institutional conversations — does UNESCO / IWGIA / universities cite the framework as a reason to engage?                             | ≥ 20 % of flags target `ai-enriched-only` fiches specifically; ≥ 1 institutional partner cites the framework as reason to engage at 18 months |

### Risk Mitigation (Innovation-specific)

- **The confidence score becomes a theater number rather than a trust signal.** Mitigation: the score MUST be re-derivable from underlying data (stored sources + verification log). CI test: load any fiche, recompute score from raw data, assert equality with displayed value. No special-cases, no editor overrides without log entry.
- **Pinned-version URLs don't get used — too clever for the audience.** Fallback: keep them in the data model (cheap to maintain) but demote the UI affordance if adoption < 2 teachers in first 6 months. The underlying revision-history feature stands alone as a transparency affordance; the pinned URL is the bonus layer.
- **The `classificationStatus` enum becomes contested itself.** Mitigation: the enum is versioned, governed by the public editorial doctrine, and advisory-board-approved. Treating it as a living artifact (not frozen) is part of the stance — when the enum evolves, the change is logged and rationalized on `/doctrine`.
- **Radical AI-transparency scares off institutional partners ("it's AI-generated, we can't endorse it").** Mitigation: institutional partnerships engage at the human-audited subset, not the `ai-enriched-only` subset. Partners can filter via `confidence ≥ verified` AND `verificationSource contains "institutional-review"`. The framework lets partners participate without endorsing the AI-enriched base layer.

## Web App + API Backend — Specific Requirements

### Project-Type Overview

Africa History is structurally a **dual-surface product**:

- **Web app (primary)** — Next.js 16 App Router, server-rendered pages under `src/app/[lang]/...`, French-only active (Language type locked to `"fr"`). Read-heavy, mostly anonymous, mobile-first, SEO-critical. Interactive surfaces are narrow: moderation dashboard, contribution/flag forms, pinned-version selector.
- **API backend (secondary, first-class)** — REST/JSON, authoritative OpenAPI spec at `src/lib/api/openapiV2.ts`, 3-layer pattern (route → handler → service), `/v2` in production. This is a product surface (open-data reuse, partner integrations, Journey 4), not internal plumbing.

Both surfaces read from the same Supabase schema (`afrik_familles_linguistiques`, `afrik_langues`, `afrik_peuples`, `afrik_pays`, `contributions`); Module #0 introduces new schemas (`sources`, `flags`, `fiche_revisions`, `confidence_scores`, `moderation_actions`) reused by both.

### Web App — Technical Requirements

**Rendering model.** MPA with App-Router SSR + route-level client islands. Not SPA. Each fiche URL is independently server-rendered and cacheable at the edge. Client components are added only where interaction demands it (flag forms, moderation queue, revision-history sheet, version picker, printable toggle) and always behind `"use client"` — never wholesale.

**Browser matrix.** Modern evergreen (last two stable versions): Chrome / Edge / Safari / Firefox on desktop; Chrome + Samsung Internet on Android; Safari on iOS. Entry-level Android over 4G is the reference device (Journey 1), not high-end iPhone. No IE11, no legacy Edge. Minimum browser screen width: 320 px; layout hard-guaranteed at 430 px.

**Responsive design.** Breakpoints from the "Carte vivante" design system: mobile < 720 px (primary target, 430 px design width), tablet `md` 720–799 px, desktop `xl` ≥ 800 px (country page max-width cap). Mobile-first authoring discipline — every new page reviewed first at 320–430 px, then tablet, then desktop. Design tokens live in `src/styles/country-tokens.css` and are extended for the people page (Module #1) and language-family page (Module #2).

**Performance targets.**

- Lighthouse mobile: performance ≥ 85, accessibility ≥ 95, best practices ≥ 90, SEO ≥ 95
- TTFB ≤ 2 s on 4G mid-range Android (cold); ≤ 500 ms warm cache
- LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (Core Web Vitals "good" thresholds)
- Page weight ≤ 500 KB compressed on a people fiche; images lazy-loaded below fold; `next/image` mandatory
- No render-blocking third-party scripts. Analytics loads `async defer`; no Google Tag Manager, no Hotjar
- Budget enforced in CI via Lighthouse CI on representative routes (home, a country fiche, a people fiche, a language-family fiche, `/doctrine`, `/api-docs`)

**SEO strategy.**

- Every fiche has a stable canonical URL; pinned-version URLs (`@vN`) are `noindex` to avoid duplicate-content penalties
- Structured data: `schema.org/Article` with `author` (moderator list), `dateModified` (last-verified timestamp), `citation` (source list). `schema.org/Person` is explicitly not used for PPL fiches; `schema.org/DefinedTerm` or a custom profile is preferred
- `sitemap.xml` regenerated at build time, listing all public fiches with canonical URL and last-modified
- Rebrand (if decided): strict 1:1 redirect map from V1 routes to V2; deployed atomically with the cutover; Search Console monitored for 30 days
- Multilingual `hreflang` tags prepared in head template but emit only `fr` for now — re-enabling other locales is a coordinated change across `src/types/shared.ts`, `src/lib/routing.ts`, `src/lib/translations.ts`
- `robots.txt` allows all public routes; disallows `/admin/*`, `/api/internal/*`, and pinned-version URLs if `noindex` header proves unreliable

**Real-time.** No real-time requirements at MVP. Moderation queue refreshes on navigation; flag submissions use POST + page revalidation; no WebSockets, no SSE, no in-browser push. Contributor notifications go via transactional email. Revisit at Growth only if advisory-board collaboration demands live co-editing.

**Accessibility.**

- WCAG 2.1 AA verified in CI via axe-core on representative routes
- Keyboard navigation exhaustive; visible focus rings (no removing default outline without replacement)
- Screen-reader testing in French (NVDA + VoiceOver on Safari iOS) on the reading surface and the flag-submission form before MVP ships
- `prefers-reduced-motion` respected; no auto-playing media
- Minimum 44 × 44 px tap targets; 4.5:1 contrast on body text; 3:1 on UI components; 7:1 where content is dense (source-list sheet)

**Admin/moderation surface.** Lives under `/admin` (already middleware-protected), SSO via Supabase Auth (OAuth: GitHub, Google, ORCID — add ORCID provider). Not optimized for mobile — desktop-first, minimum supported viewport 1024 px wide.

### API Backend — Technical Requirements

**Endpoint specification.** Existing `/v2` plus Module #0 additions:

| Path                                 | Method     | Purpose                                 | Cache                       | Introduced                                                                           |
| ------------------------------------ | ---------- | --------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| `/v2/language-families`              | GET        | List FLG                                | `s-maxage=86400, immutable` | Existing                                                                             |
| `/v2/language-families/{id}`         | GET        | FLG detail + descendants                | `s-maxage=86400, immutable` | Existing                                                                             |
| `/v2/peoples`                        | GET        | List PPL, paginated, filter-capable     | `s-maxage=3600`             | Existing (extend with `minConfidence`, `classificationStatus`, `sinceVerifiedAfter`) |
| `/v2/peoples/{id}`                   | GET        | PPL detail + sources + confidence       | `s-maxage=3600`             | Existing (extend payload with Module #0 fields)                                      |
| `/v2/peoples/{id}/revisions`         | GET        | Revision history of a fiche             | `s-maxage=3600`             | New (Module #0)                                                                      |
| `/v2/peoples/{id}@v{n}`              | GET        | Pinned-version rendering                | `s-maxage=86400, immutable` | New (Module #0 / Journey 5)                                                          |
| `/v2/countries`                      | GET        | List countries                          | `s-maxage=86400, immutable` | Existing                                                                             |
| `/v2/countries/{iso3}`               | GET        | Country detail                          | `s-maxage=86400, immutable` | Existing                                                                             |
| `/v2/search`                         | GET        | Cross-entity search                     | `s-maxage=300`              | Existing                                                                             |
| `/v2/flags`                          | POST       | Submit a flag (auth'd via session)      | `no-store`                  | New (Module #0)                                                                      |
| `/v2/flags/{id}`                     | GET        | Public flag status                      | `s-maxage=60`               | New (Module #0)                                                                      |
| `/v2/flags`                          | GET        | Public flag queue (filtered, paginated) | `s-maxage=60`               | New (Module #0)                                                                      |
| `/v2/doctrine`                       | GET        | Current doctrine (content + version)    | `s-maxage=86400`            | New (Module #0)                                                                      |
| `/v2/health/verification`            | GET        | Per-entity verification metrics         | `s-maxage=3600`             | New (Module #0 — public "verification health" page)                                  |
| `/v2/internal/moderation/queue`      | GET        | Moderator queue (auth req.)             | `no-store`                  | New — internal                                                                       |
| `/v2/internal/moderation/flags/{id}` | POST/PATCH | Resolve / escalate flags                | `no-store`                  | New — internal                                                                       |

OpenAPI spec at `src/lib/api/openapiV2.ts` is the authoritative contract — regenerated on every build; Swagger UI hosted publicly at `/docs/api` (MVP — minimal), moving to a dedicated developer portal at Growth.

**Authentication & authorization.**

- **Public reads (anonymous)** — no auth for all `GET /v2/...` except `/internal/**`. IP-based rate limit only.
- **Contributor actions (authenticated, session-based)** — `POST /v2/flags` requires a Supabase Auth session (email + magic link, or OAuth: Google / GitHub). Email verification required before the flag goes public. Contributor identity is opt-in per submission.
- **Moderator actions (authenticated + role)** — `/internal/moderation/**` requires a session AND `role IN ('moderator', 'admin', 'advisor')` stored in `user_roles`. Middleware (`src/middleware.ts`) gates `/admin/*` routes and internal API paths.
- **API key (Growth)** — optional bearer token for developers wanting higher rate limits. Self-serve in developer portal. Scope: read-only against `/v2/**` public endpoints. Rotating; tracked per-key for analytics and abuse.
- **Advisory-board auth (Growth)** — ORCID OAuth provider added; `role = 'advisor'` granted by admin on signup verification.

**Data formats.**

- Request: JSON (`application/json; charset=utf-8`); query params for filters and pagination; no multipart/form at MVP (no file uploads)
- Response: JSON; envelope carries `{ data, meta: { license, version, verifiedAt, pagination? } }`
- Dates: ISO-8601 strings (`toISOString()` — never raw `Date`)
- License metadata: every payload carries `meta.license = "CC-BY-SA-4.0"` and `meta.attribution = "Africa History — <url>"`
- Error shape: `{ error: { code, message, details? } }` formatted via `src/api/v2/utils/response.ts`

**Error codes.**

| HTTP | `error.code`       | When                                                                    |
| ---- | ------------------ | ----------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR` | Zod validation failed on params or body                                 |
| 401  | `UNAUTHENTICATED`  | Endpoint requires session and none present                              |
| 403  | `FORBIDDEN`        | Authenticated but lacks role                                            |
| 404  | `NOT_FOUND`        | Entity id not found or pinned version doesn't exist                     |
| 409  | `CONFLICT`         | Duplicate flag on same assertion from same user                         |
| 422  | `SEMANTIC_ERROR`   | Valid shape but invalid content (e.g. `countryIso3=XXX` not in catalog) |
| 429  | `RATE_LIMITED`     | Rate limit exceeded (with `Retry-After` header)                         |
| 500  | `INTERNAL_ERROR`   | Unexpected server failure (no stack in response; logged server-side)    |
| 503  | `UNAVAILABLE`      | Scheduled or forced maintenance                                         |

**Rate limits.** Anti-abuse and fairness, not monetization:

| Tier                   | Scope | Limit                                 | Enforcement                                  |
| ---------------------- | ----- | ------------------------------------- | -------------------------------------------- |
| Anonymous              | IP    | 60 req/min per endpoint class         | Vercel edge middleware or Upstash rate-limit |
| Contributor (session)  | user  | 10 flag submissions / hour, 100 / day | Server-side token bucket in Supabase         |
| API key — free tier    | key   | 10 req/s, 50 000 req/day              | Upstash or Supabase edge function            |
| API key — partner tier | key   | Negotiated per-partner (Growth)       | Manual key tagging                           |
| Moderator/admin        | user  | No explicit limit                     | —                                            |

`429` responses include `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

**Versioning.** URL-path versioning (`/v2/`, `/v3/` when breaking). Additive changes within a major version are non-breaking: new endpoints, new optional query params, new fields in response envelopes. Breaking changes only in a new major version. Deprecation protocol: `Sunset` header (RFC 8594) + `Deprecation` header + changelog entry on the developer portal; minimum 6-month overlap window before a deprecated version is retired.

**SDK.** No SDK at MVP. OpenAPI 3.1 spec is sufficient — consumers can code-generate typed clients via `openapi-typescript` or `openapi-generator`. At Growth, a thin TypeScript SDK may be added if a specific high-value integration partner requires one — demand-driven, not pre-emptive.

**API documentation.** Authoritative: OpenAPI spec at `src/lib/api/openapiV2.ts`, regenerated on every build. Hosted: Swagger UI at `/docs/api` (MVP — minimal), moving to a dedicated developer portal at Growth with intro, auth/key-request flow, attribution examples, versioning/deprecation policy, and a "consumer showcase" page listing documented integrations (Journey 4).

### Implementation Considerations

- **3-layer discipline is non-negotiable.** New Module #0 endpoints follow route → handler → service exactly. Route = parsing + CORS + caching; handler = business logic + permission checks; service = Supabase queries. No collapsing.
- **Zod schemas co-located** under `src/api/v2/schemas/` or beside their handler. Never inline `z.object({...})` in route files.
- **Supabase client isolation.** Browser / server / admin clients never mix. Module #0's moderation endpoints use `src/lib/supabase/admin.ts` (service role) — server-only, never leak.
- **N+1 discipline.** Module #0 introduces fan-out risk (fiche → sources → revisions → flags). Apply the existing `getCountryRelationsMap()` batching pattern to build `getSourcesMap(peopleIds)`, `getConfidenceMap(peopleIds)`, `getFlagsSummaryMap(peopleIds)`.
- **CI gates (listed in Success / Domain) must be GitHub Actions jobs that block merge.** Data-integrity gates run against the JSON source tree (`dataset/source/afrik/**`) before DB migration; API-contract gate regenerates OpenAPI and diffs against `src/lib/api/openapiV2.ts` — drift fails CI.
- **Known broken tooling**: `npm run lint` and `npx eslint src/` are broken at root. Any new contribution-driven lint work must not rely on them until the ESLint config is restored at root; unblock during Module #1 people-page work since new code will need linting.
- **Pre-existing test failures** (6 in `scripts/__tests__/migrateAfrikToDatabase.test.ts`, 4 in handler tests — Supabase mock issues): do not fix opportunistically. Fixing them is its own scoped task; the PRD treats them as acknowledged debt.
- **Storybook constraint**: `@storybook/react-vite` only (incompatible with Next 16 Storybook Next framework). Install with `--legacy-peer-deps`. Every new public UI primitive ships a story.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP archetype: validated-posture MVP, not audience-feature MVP.** The MVP's job is to prove the verification-fabric posture is real and operable at the scale of one fiche, audited end-to-end in public, with Module #0 mechanics wired into UI, API, and CI. It is _not_ to ship all ten modules with thin content — that path optimizes for surface area and destroys the credibility thesis.

> This section gives the engineering acceptance view of MVP. The product-scope view (feature list, Growth, Vision phases) is in §Product Scope above; the two must stay consistent.

**What MVP must validate (non-negotiable):**

1. A single audited fiche (Module #1 — People page) renders confidence score, source chain with resolvable URLs, last-audit date, classification status, and public flag inbox — all driven by Module #0 data, not mocked.
2. The contributor journey (Journey 2 — Kofi) works end-to-end: sign up, submit a per-assertion flag with counter-source, see it enter the public moderation queue, receive a resolution notification, and see credited attribution in the fiche changelog.
3. The moderator journey (Journey 3 — Fatou) works end-to-end: SSO sign-in, triage the queue, apply a decision (accept / reject / escalate), publish a revision that resolves one or more flags, recompute the confidence score, and emit an immutable audit-log entry.
4. The educator journey (Journey 5 — Ngozi) works end-to-end: open a fiche's revision history, copy a pinned-version URL, render it with the "vous consultez la version du X" banner, and generate a citation block suitable for a lesson plan.
5. CI gates are live and blocking: FLG-folder mismatch, duplicate PPL ids, population sum = 100 %, ISO code validity, resolvable source URLs, OpenAPI contract drift.
6. At least 20 fully-audited PPL fiches exist in production — enough to demonstrate the workflow works at small scale, not enough to pretend the whole dataset is clean.
7. Public editorial doctrine v1 is written and published.

**What MVP explicitly does NOT include:** Module #4 Names Atlas · Module #5 Hidden Links · Module #6 Migrations Timeline · Module #7 Comparator · Module #8 Colonization & Resistances · Module #9 Smart Quiz · Module #10 Africa History Assistant · multilingual · SDK · developer portal (beyond Swagger UI) · rebrand execution.

### Resource Requirements & Development Budget

Solo-dev baseline, 1–2 prospective collaborators (mobile design · African social sciences contributor). No fixed deadline, but explicit effort budget to force scope discipline.

| Phase                                                                                          | Solo-dev weeks (est.) | Calendar window      | Exit criteria                                                                              |
| ---------------------------------------------------------------------------------------------- | --------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| Data cleanup                                                                                   | 2–3                   | Month 0–1            | All known data-quality issues from distillate resolved; CI gates green                     |
| Module #0 foundation (schema, confidence scoring, source model, flag inbox)                    | 6–8                   | Month 1–3            | Public API reads confidence + sources from DB; 20 fiches audited end-to-end                |
| Module #1 People page + Module #0 UI surface                                                   | 5–7                   | Month 3–5            | Fiche renders with full Module #0 surface; Journey 1, 3, 5 walkthroughs work in production |
| Formalize public API (Module #3) — Swagger UI polish, rate limits, free keys, attribution docs | 2–3                   | Month 5–6            | Third-party integrator can complete Journey 4 unaided                                      |
| Editorial doctrine v1 (written, public) + naming decision + rebrand plan                       | 1–2                   | Month 2–6 (parallel) | Doctrine published; final product name chosen; 301-redirect plan documented                |
| MVP polish + 20 audited fiches + launch communication                                          | 2–3                   | Month 6–9            | Public launch of validated-posture MVP                                                     |
| Reserved for slippage / unknown-unknowns                                                       | 4–6                   | —                    | Absorb overruns without killing scope                                                      |

**Total MVP budget: ~22–30 solo-dev weeks over a 9–15 month calendar window** (accounting for part-time cadence, one contributor onboarded mid-way, and the reserved slippage buffer).

**Staffing assumptions:**

- Solo dev full-stack (Next.js + Supabase + TypeScript + data) — jnk, existing.
- Mobile design contributor — 0.2 FTE, recruited Month 2–3. Owns Module #0 surface design on the People page.
- African social-sciences contributor — 0.1 FTE, recruited Month 2–4. Reviews editorial doctrine; audits the first 20 fiches; validates classification-status taxonomy.
- Moderators — volunteers, recruited at soft-launch (Month 7–8). Trained on queue tooling. Not required for MVP code completion, required for MVP operational readiness.

**Infrastructure:**

- Supabase Pro tier (~$25/month) — sufficient for MVP scale.
- Vercel Pro (~$20/month) — Edge caching, SSR, sufficient for expected traffic.
- Domain + rebrand domain (~$50/year combined).
- Sentry (free tier) — error tracking.
- Upstash Redis (free tier) — rate limiting.

**Total monthly burn at MVP scale: ~$50–75/month.** Funded by founder for the MVP window; patronage / institutional-partnership revenue sought during Growth.

### MVP Simplifications — What Goes Manual at Launch

| Area                           | MVP approach                                                            | Eventual (Growth)                                                                              |
| ------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Moderation queue               | Supabase Studio views + manual reassignment                             | Custom moderator UI with claim/release/handoff                                                 |
| Contributor onboarding         | Signup + email verification; moderator status granted manually by admin | Self-service scientific-contributor application with credential-checking workflow              |
| Editorial doctrine publication | Versioned Markdown in `/fr/doctrine` rendered via MDX                   | Change-tracked UI with diff view + community comment surface                                   |
| Audit dashboards               | SQL queries run manually, snapshots posted monthly                      | Public dashboard with live confidence-score distribution, audit velocity, flag resolution time |
| Translation / multilingual     | French only, ignored in MVP                                             | Full i18n reopening with `Language` type extension + routing/translations coordinated change   |
| SDK                            | None — OpenAPI spec only                                                | Thin TS SDK if integration partner demand emerges                                              |
| Developer portal               | Swagger UI at `/docs/api`                                               | Branded portal with auth/key-request flow, attribution examples, changelog                     |
| Rate-limit analytics           | Raw Upstash logs                                                        | Public API-health page + per-key usage metrics                                                 |
| Rebrand execution              | Planned, documented, NOT executed pre-launch                            | Executed at Growth once product-market fit proven                                              |
| Naming decision                | Locked by Month 3 of MVP to avoid rebrand during launch                 | — (resolved)                                                                                   |

### Risk Mitigation Strategy

**Technical risks**

- _Data-quality rot between audit waves_ — recurring CI jobs re-check all resolvable URLs weekly; fiches with broken sources get flagged automatically and drop in confidence score.
- _Next.js 16 / Supabase breaking change during MVP_ — lock dependency versions at MVP start; dependabot PRs are reviewed, not auto-merged; major upgrades deferred to Growth.
- _Storybook drift from production_ — every new public UI component requires a story; CI visual-regression check on the story snapshot.

**Market risks**

- _MVP credibility challenge ("only 20 audited fiches — the rest are still unaudited")_ — the audited-fiche badge and explicit non-audited-fiche disclaimer are first-class UI; unaudited fiches show confidence score 0 and a "pending human audit" banner rather than hiding behind silence.
- _Polemics on contested classifications post-launch_ — editorial doctrine v1 must ship before MVP public launch; doctrine explicitly names the dissensus protocol (multi-perspective box on contested fiches).
- _Rebrand mismanagement (SEO loss)_ — rebrand explicitly deferred to Growth; 301-redirect plan drafted during MVP; at rebrand, a 30-day soft-launch announcement + simultaneous domain redirects + sitemap refresh.

**Resource risks**

- _Solo-dev burnout / bus factor 1_ — codebase open-source from Month 1; contributor recruitment is a tracked MVP exit criterion (not a Growth concern); every module ships with a complete CONTRIBUTING.md section.
- _Volunteer churn in moderation pool_ — MVP launches with N ≥ 3 active moderators; if it drops to 1, the flag queue is explicitly paused (shown as "moderation paused" banner) rather than silently accumulating backlog.
- _Scope creep pressure from "just add Module #X"_ — the Bail-Out Ladder below is the explicit escape hatch; scope creep is rejected by default, accepted only by explicit PRD revision.

### Bail-Out Ladder — Scope Cuts in Order If Effort Doubles

Executed top-down. Each rung individually preserves the credibility thesis.

1. **Drop Module #1 full redesign** — keep the V2 People page as-is, bolt the Module #0 UI surface onto the existing page. Recovers ~3–4 weeks. Costs: less elegant first-impression; design-system inconsistency between Country (Carte vivante) and People.
2. **Soften CI gates** — ship FLG-folder mismatch + duplicate-PPL + ISO-code checks as blocking; demote population-sum + URL-resolution to warnings. Recovers ~1–2 weeks. Costs: weaker automation claim during launch communication.
3. **Drop `classificationStatus` enum from MVP** — contested-classification treatment reduced to a free-text "classification notes" field on fiches. Recovers ~1 week. Costs: no structured query for contested fiches until Growth.
4. **Drop axe-core CI accessibility gate** — manual accessibility review on MVP surfaces only. Recovers ~1 week. Costs: accessibility regressions can slip in post-launch.
5. **Reduce audited-fiche target from 20 to 10** — last resort; holds the verification-fabric demonstration credible at the thinnest possible scale. Do not go below 10.

**Red line — do NOT cut:**

- Module #0 data model (confidence score, source chain, flag inbox, audit log, editorial doctrine link).
- Public flag-submission + moderation-queue end-to-end flow.
- Public editorial doctrine v1.
- Authoritative OpenAPI spec + formalized public API.
- Audit log + immutable-revision versioning.

Cutting any of these removes the MVP's reason to exist.

## Functional Requirements

### Content Discovery & Exploration

- **FR1:** Users can browse people fiches organized by linguistic family, language, and country
- **FR2:** Users can search fiches by endonym, exonym, historical name, or alternative spelling
- **FR3:** Users can view a complete people fiche with structured sections (identity, origins, history, demographics, languages, culture, sources)
- **FR4:** Users can navigate from any fiche to its related entities (linguistic family, languages spoken, countries of presence) and back
- **FR5:** Users can access all public content without authentication, registration, or payment

### Source Transparency & Confidence

- **FR6:** Visitors can see the confidence score of every fiche displayed above the fold, not buried in metadata
- **FR7:** Visitors can see the list of sources supporting factual assertions, classified by tier (primary, secondary, tertiary, ai-enriched)
- **FR8:** Visitors can follow each cited source to its external origin via a resolvable URL, with page and year where applicable
- **FR9:** Visitors can see the date of the most recent human audit of each fiche
- **FR10:** Visitors can see a visible disclaimer on unaudited fiches distinguishing them from audited content
- **FR11:** Visitors can see how a fiche's confidence score is computed (inputs and weighting)

### Public Contribution & Moderation

- **FR12:** Registered contributors can submit a flag against a factual assertion, attaching a reason and optionally a counter-source
- **FR13:** Registered contributors can propose a textual correction to a fiche with supporting evidence
- **FR14:** Visitors can view the public moderation queue and the status of every open flag
- **FR15:** Moderators can triage flags (accept, reject, request more info, merge with a prior flag)
- **FR16:** Moderators can publish a revision that resolves one or more flags, producing an immutable audit-log entry
- **FR17:** Contributors can see the resolution outcome of flags they submitted and of flags they are watching

### Content Versioning & Citation

- **FR18:** Every fiche has a stable, human-readable URL that always serves the current revision
- **FR19:** Every fiche has a pinned-version URL format that serves the exact content as of a given revision, permanently
- **FR20:** Visitors can read the full audit log of a fiche showing every revision with timestamp, moderator, and reason
- **FR21:** Visitors can generate a ready-to-paste citation block for a fiche that references a pinned version

### Editorial Governance & Doctrine

- **FR22:** Visitors can read the public editorial doctrine (endonyms vs exonyms, contested classifications, sensitive-topic treatment) via a dedicated section
- **FR23:** Visitors can see each fiche's classification status (consensual, contested, colonial-legacy, reconstructive) with an inline explanation
- **FR24:** Contested fiches display a multi-perspective view presenting each documented position with its own sources
- **FR25:** Visitors can see which version of the editorial doctrine was in force when a given fiche revision was published

### Data Quality & Automation

- **FR26:** The system validates that every FLG identifier matches its parent folder in the source tree
- **FR27:** The system validates that no two PPL identifiers designate the same people (duplicate detection)
- **FR28:** The system validates that demographic percentages sum to 100% per country
- **FR29:** The system validates that every ISO 639-3 and ISO 3166-1 alpha-3 code referenced is valid
- **FR30:** The system validates that every referenced source URL resolves
- **FR31:** A source URL that becomes unresolvable automatically lowers its fiche's confidence score and surfaces a public flag
- **FR32:** Continuous integration blocks merges that introduce data-integrity regressions across FR26–FR30

### Public API & Open Data Reuse

- **FR33:** Third-party integrators can read any public fiche, source, and confidence metadata via a documented JSON API
- **FR34:** Third-party integrators can obtain a free API key with a known, published rate limit
- **FR35:** API responses embed attribution metadata (license, canonical URL, pinned version) sufficient for legally compliant citation
- **FR36:** The public API is documented via an authoritative OpenAPI 3.1 specification exposed at a stable URL
- **FR37:** Breaking API changes are communicated via a versioning policy with a minimum 6-month deprecation window
- **FR38:** Third-party integrators can discover updated fiches via a changelog or feed without polling every endpoint

### User Account & Contributor Lifecycle

- **FR39:** Visitors can register a contributor account with email verification
- **FR40:** Contributors can submit flags and corrections under their account, with attribution visible in the public record
- **FR41:** Administrators can grant moderator status to verified contributors
- **FR42:** Contributors can manage their profile and delete their account, including flag attribution per GDPR

### Accessibility, Platform & Compliance

- **FR43:** Users can access every user journey fully on mobile devices (320–430 px), tablets, and desktops without functional degradation
- **FR44:** Users relying on assistive technology can complete every user journey via keyboard and screen reader (WCAG 2.1 AA)
- **FR45:** The site displays a clear notice and age gate on account registration per COPPA / GDPR-K for users under 16
- **FR46:** The site exposes a cookie/tracking notice and consent surface compliant with GDPR

## Non-Functional Requirements

### Performance

- **NFR1:** Public pages achieve Largest Contentful Paint ≤ 2.5 s at p75 on a 4G mobile profile (390 px viewport, 1.6 Mbps down / 750 kbps up); Cumulative Layout Shift ≤ 0.1; Interaction-to-Next-Paint ≤ 200 ms
- **NFR2:** Fiche detail pages render the above-the-fold content (identity + confidence score + primary endonym) within 1.5 s p75 on the same 4G profile
- **NFR3:** Public API endpoints respond within 300 ms p95 for cached reads and 800 ms p95 for uncached aggregate reads
- **NFR4:** Full-text search over the fiche corpus returns results within 500 ms p95 at MVP scale (~1 000 fiches)
- **NFR5:** Stable-reference endpoints (families, countries, languages) serve from edge cache with ≥ 95 % cache-hit ratio

### Security

- **NFR6:** All data in transit is encrypted with TLS 1.2 or higher; HSTS is enforced
- **NFR7:** The Supabase service-role key is never exposed to browser-reachable code paths; a repo-wide static check blocks any `src/lib/supabase/admin.ts` import from client modules
- **NFR8:** User passwords are managed by Supabase Auth (bcrypt/argon2); no plaintext password ever reaches logs, Sentry, or structured events
- **NFR9:** State-changing API calls from the admin and moderator surfaces require an authenticated session and CSRF protection
- **NFR10:** API keys are stored as salted hashes; the raw key is shown exactly once at issuance and never again
- **NFR11:** Access to contributor PII (email, real identity behind a pseudonym) is logged to a server-side audit trail retained 90 days
- **NFR12:** Contributor account deletion removes PII within 30 days; contribution attribution is replaced by a deterministic pseudonym rather than hard-deleted, to preserve audit-log integrity — documented in the public privacy policy
- **NFR13:** Rate limits are enforced server-side and survive any client-side bypass attempt

### Scalability

- **NFR14:** The system supports 100 000 monthly active visitors at MVP hardware tier (Supabase Pro + Vercel Pro) with no architectural change
- **NFR15:** The public API supports 1 000 concurrent connections under documented rate-limit bucketing
- **NFR16:** Scaling the fiche corpus to 10 000 (≈ 10× MVP) requires no schema change; pagination, indexes, and query patterns are designed for that upper bound
- **NFR17:** The edge-cache strategy absorbs traffic spikes of up to 20× baseline (e.g., a curriculum resource linking a specific fiche) without origin scaling

### Accessibility

- **NFR18:** Every public surface conforms to WCAG 2.1 Level AA
- **NFR19:** Every user journey (browse, read, flag, moderate, cite) is fully operable by keyboard; no keyboard trap exists on any page
- **NFR20:** At least one full user journey per release is manually validated with VoiceOver (iOS + macOS) and NVDA (Windows)
- **NFR21:** Color contrast is ≥ 4.5 : 1 for body text and ≥ 3 : 1 for large text and non-text UI components; verified by axe-core in CI across MVP surfaces
- **NFR22:** All interactive elements expose a visible focus indicator; focus order matches DOM order
- **NFR23:** Motion respects `prefers-reduced-motion`; no auto-playing video; no animation carries essential meaning

### Reliability & Availability

- **NFR24:** Public-site availability target is 99.5 % monthly (≈ 3.6 h downtime budget) reported on a public status page
- **NFR25:** Public-API read-endpoint availability target is 99.9 % monthly
- **NFR26:** Every data-mutating action (flag, moderation decision, revision publish, doctrine-version publish) is durably logged before the response returns success
- **NFR27:** Database backups run automatically at least daily with 30-day retention; recovery-time objective ≤ 4 h, recovery-point objective ≤ 24 h
- **NFR28:** Deployment rollback to the prior immutable build completes within 10 minutes

### Integration

- **NFR29:** The authoritative OpenAPI 3.1 spec at `src/lib/api/openapiV2.ts` is the contract of record; CI fails if runtime responses drift from the spec
- **NFR30:** External source-URL health checks run at least weekly; every broken URL automatically produces a public flag and decrements the affected fiche's confidence score
- **NFR31:** JSON response envelopes are stable within a major API version; changes are additive only
- **NFR32:** Changelog and feed endpoints are idempotent and safe under replay

### Observability

- **NFR33:** All server-side code (API routes, handlers, services, scripts) logs through `@/lib/api/logger`; no raw `console.*` in production paths
- **NFR34:** Runtime errors are captured in Sentry with 30-day retention and deduplication; personally identifiable fields are scrubbed before transport
- **NFR35:** Product-health metrics — confidence-score distribution, audit velocity, median flag-resolution time, API requests per key, CI-gate outcomes — are collected and queryable
- **NFR36:** Admin-surface events (moderation decisions, moderator grants, doctrine publishes) log actor, timestamp, target entity, and reason

### Maintainability

- **NFR37:** Every new public UI primitive ships with a Storybook story (`@storybook/react-vite`); missing-story detection runs in CI
- **NFR38:** Every new API endpoint ships with a Zod validation schema co-located under `src/api/v2/schemas/` and an update to the OpenAPI spec in the same PR
- **NFR39:** `npm run type-check` (TypeScript) and the Vitest suite pass on every PR; merges are blocked otherwise
- **NFR40:** The full test suite completes in ≤ 5 minutes locally and in CI
- **NFR41:** The codebase remains open-source throughout; content is licensed CC-BY-SA-4.0, code under a permissive license (final choice between MIT and Apache-2.0 tracked as an open decision); every PR preserves top-level license files

### Compliance & Legal

- **NFR42:** All data processing conforms to GDPR — lawful-basis documentation, consent surfaces for analytics and tracking, right to access, right to erasure, public record of processing activities
- **NFR43:** Registration enforces COPPA / GDPR-K — users under 16 cannot self-register a contributor account; a clear notice explains why
- **NFR44:** Public content surfaces satisfy the EU Accessibility Act obligations applicable to public-interest digital services (effective 2025); compliance posture is documented publicly
- **NFR45:** Data-retention windows for logs, audit trails, and PII are specified in the public privacy policy and enforced programmatically (not by convention)
