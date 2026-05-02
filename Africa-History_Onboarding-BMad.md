# Africa History — Onboarding Projet

> Anciennement **EthniAfrica** — renommage en cours (le mot _ethnie_ charrie une connotation coloniale).

---

## Informations générales

|                                 |                                                                      |
| ------------------------------- | -------------------------------------------------------------------- |
| **Méthodologie**                | BMad Method (workflow de planification structuré, phases numérotées) |
| **Dépôt**                       | `ethniafrica`                                                        |
| **Branche de travail**          | `recette` (base : `main`)                                            |
| **Livrables de planification**  | `_bmad-output/planning-artifacts/`                                   |
| **Contexte IA (règles projet)** | `_bmad-output/project-context.md`                                    |
| **Règles techniques**           | `/CLAUDE.md`                                                         |

---

## Vue d'ensemble des phases

| Phase BMad             | Livrable                            | Fichier                                         | Statut         |
| ---------------------- | ----------------------------------- | ----------------------------------------------- | -------------- |
| **1 — Analysis**       | Product Brief (vision long terme)   | `product-brief-vision.md` + `.distillate.md`    | ✅ 2026-04-13  |
| **2 — Planning**       | PRD (Product Requirements Document) | `prd.md`                                        | ✅ 2026-04-15  |
| **3 — Solutioning**    | UX Design Spec                      | `ux-design-specification.md`                    | ✅ 2026-04-15  |
| **3 — Solutioning**    | Architecture Decision Document      | `architecture.md`                               | ✅ 2026-04-15  |
| **3 — Solutioning**    | Epics & Stories                     | `epics.md`                                      | ✅ 2026-04-17  |
| **3 — Solutioning**    | Implementation Readiness Report     | `implementation-readiness-report-2026-04-15.md` | ✅ 2026-04-15  |
| **4 — Implementation** | Sprint planning + dev               | `_bmad-output/implementation-artifacts/`        | ⏳ Pas démarré |

> Tous les fichiers ci-dessus se trouvent dans `_bmad-output/planning-artifacts/` sauf mention contraire.

---

## Phase 1 — Analysis (Vision & Concept)

**Fichier** : `product-brief-vision.md` (140 lignes, FR) — version condensée : `product-brief-vision.distillate.md` (110 lignes)

### Points clés

**Pourquoi ce projet existe.** Les encyclopédies actuelles (Wikipedia, Britannica) reproduisent une grammaire coloniale : exonymes par défaut, classifications figées, frontières naturalisées. Africa History inverse cette grammaire.

**Triptyque éditorial** : _Noms · Liens · Regards_ × 3 modes d'accès : _Explorer · Comprendre · Jouer_.

**Audience cible** (par ordre de priorité) :

1. Public africain continental — collégiens, lycéens, étudiants, enseignants
2. Diaspora africaine — quête identitaire, transmission familiale
3. _(Pas les académiques, pas les curieux occidentaux en priorité)_

**Fondations existantes** (avril 2026) : 924 fiches peuples, 24 familles linguistiques, 55 pays. Hiérarchie AFRIK : `FLG → Langue → Peuple → Pays`. API v2 publique en production (Next.js 16 + Supabase + OpenAPI). Page pays avec design system "Carte vivante" (8 sections, breakpoints 430/720/800px, mobile-first). Migration V1→V2 terminée, FR-only.

**Risque #1 identifié.** Les 924 fiches sont structurellement complètes mais factuellement non auditées (enrichissement IA-assisté). Cas concrets détectés : PPL_TOKELAU_FAUXEX (peuple polynésien classé africain), 8 doublons non résolus, 6 mismatches FLG/dossier, 5 fiches population=0. La réponse : Module #0 "Sources & Vérification" — fondation transversale conditionnant tout le reste.

**Principes non négociables** : gratuit, open data (CC-BY-SA), pas de monétisation, décolonial, mobile-first, sources traçables, français d'abord.

**Métriques de succès** : ≥80% fiches avec 2+ sources vérifiées à 2 ans, >60% trafic Afrique + diaspora, adoption éducative, réutilisation open data, partenariats institutionnels.

---

## Phase 2 — Planning (PRD)

**Fichier** : `prd.md` (755 lignes, EN)

Le PRD classifie le projet comme `web_app + api_backend`, domaine `edtech + cultural-heritage`, complexité `high`, contexte `brownfield`.

**46 exigences fonctionnelles** (FR1–FR46) réparties en 9 catégories :

1. Content Discovery & Exploration (FR1–5)
2. Source Transparency & Confidence (FR6–11)
3. Public Contribution & Moderation (FR12–17)
4. Content Versioning & Citation (FR18–21)
5. Editorial Governance & Doctrine (FR22–25)
6. Data Quality & Automation (FR26–32)
7. Public API & Open Data Reuse (FR33–38)
8. User Account & Contributor Lifecycle (FR39–42)
9. Accessibility, Platform & Compliance (FR43–46)

**45 exigences non-fonctionnelles** (NFR1–NFR45) couvrant : performance (LCP ≤ 2.5s p75 sur 4G, API 300ms p95 caché), sécurité (TLS, Supabase Auth, isolation client/admin), scalabilité (100k MAU, 10k fiches sans refonte schéma), accessibilité (WCAG 2.1 AA), fiabilité, intégration (OpenAPI 3.1), observabilité, maintenabilité, compliance (GDPR, GDPR-K 16+, EAA 2025).

**Scope MVP** recentré sur : Module #0 (vérification) + Module #1 (page Peuple) + Module #3 (API publique formalisée). Les modules cartographiques, comparateur, gamification et assistant IA sont post-MVP.

---

## Phase 3 — Solutioning

Cette phase produit 4 livrables interconnectés.

### 3a. UX Design Specification

**Fichier** : `ux-design-specification.md` (1535 lignes, EN)

**5 personas journey-driven** :

| Persona            | Profil                                | Contexte                                                            |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------- |
| **Amina**, 16 ans  | Lycéenne, Dakar                       | Android entrée de gamme, 4G, data rationnée → cible mobile primaire |
| **Kofi**, 34 ans   | Diaspora, Atlanta                     | Conteste une assertion, fournit contre-source                       |
| **Fatou**, 31 ans  | Modératrice bénévole, doctorante UCAD | Triage ~4h/sem sur desktop                                          |
| **Thomas**, 42 ans | Data engineer NGO, Nairobi            | Consomme l'API pour revitalisation linguistique                     |
| **Ngozi**, 44 ans  | Prof d'histoire, Lagos                | Unité pédagogique sur 6 semaines avec URL figées (@v34)             |

**Thèse UX centrale** : la transparence radicale des sources comme surface produit de premier plan — score de confiance, chaîne de sources, date du dernier audit et statut de classification au-dessus de la ligne de flottaison, pas planqués dans un menu.

**Nouveaux composants design system** : `ConfidenceChip`, `ClassificationBadge`, `SourceChainSheet`, `DoctrineLinkCard`, `PinnedVersionBanner`, `RevisionDrawer`. Typographie : Fraunces + Nunito Sans via `next/font`, tokens `--afh-*`, Storybook public à `/design-system`.

### 3b. Architecture Decision Document

**Fichier** : `architecture.md` (975 lignes, EN)

**Stack verrouillée** (déjà en prod) : Next.js 16 App Router, React 18, TypeScript `strict: false`, Tailwind + shadcn/ui, TanStack Query, Supabase (3 clients isolés : browser/server/admin), Vitest + happy-dom, Storybook react-vite.

**Nouvelles tables** (~12) : `sources`, `source_assertion_links`, `fiche_revisions`, `confidence_scores`, `verification_log`, `flags`, `moderation_actions`, `doctrine_versions`, `user_roles`, `api_keys`, `api_key_usage`, `user_accounts`.

**Nouveaux endpoints** (~8) : `/v2/flags`, `/v2/peoples/{id}/revisions`, `/v2/peoples/{id}@v{n}`, `/v2/doctrine`, `/v2/health/verification`, `/v2/internal/moderation/**`, extensions `/v2/peoples`.

**Migrations DB** : 007 (écrite, pas encore appliquée) + 008–011 à scaffolder.

**Nouveaux patterns Module #0** : envelope API `{ data, meta, errors }`, casing camelCase JSON, taxonomie d'erreurs 9 codes, format URL figée `@v{n}`, feature flags, convention de citation source (primaire/secondaire/tertiaire/ai-enriched).

**Pipelines CI** : data integrity (FR26–30), OpenAPI drift, Lighthouse mobile, axe-core, contrôle URL externe hebdomadaire.

### 3c. Epics & Stories

**Fichier** : `epics.md` (3344 lignes, EN) — **7 epics, 77 stories** couvrant les 46 FR.

| Epic  | Titre                                           | FRs couverts                       | Dépend de |
| ----- | ----------------------------------------------- | ---------------------------------- | --------- |
| **0** | Trustworthy Data Baseline & Platform Foundation | FR26–32, FR46                      | —         |
| **1** | Source Transparency Fabric (Module #0 core)     | FR6–11, FR22–25                    | 0         |
| **2** | People Fiche Reading Experience (Module #1)     | FR1–5                              | 1         |
| **3** | Pinned Versions, Revision History & Citation    | FR18–21                            | 1, 2      |
| **4** | Community Contributions (Flags & Corrections)   | FR12–14, FR17, FR39–40, FR42, FR45 | 0, 1      |
| **5** | Moderation & Editorial Workflow                 | FR15–16, FR41                      | 3, 4      |
| **6** | Public API & Developer Portal (Module #3)       | FR33–38                            | 0, 1–3    |

**Graphe de dépendances** :

```
Epic 0 ──┬──► Epic 1 ──┬──► Epic 2 ──► Epic 3 ──┐
         │             │                          │
         │             └──► Epic 4 ──► Epic 5     │
         │                                        │
         └────────────────────────────────────────► Epic 6
```

**Epic 0 = hard gate** avant tout : cleanup pré-MVP du dataset (supprimer PPL_TOKELAU_FAUXEX, résoudre 8 doublons, fixer 6 mismatches FLG, 5 populations=0, normaliser filenames), appliquer migrations, CI blocantes, Sentry + Plausible + logger structuré, Supabase Auth bootstrap, bandeau cookies + privacy policy, headers sécurité.

### 3d. Implementation Readiness Report

**Fichier** : `implementation-readiness-report-2026-04-15.md` (43 lignes)

Rapport de cohérence vérifiant que PRD ↔ Architecture ↔ UX ↔ Epics sont alignés. **Statut : passant** — toutes les FR sont couvertes, les dépendances techniques sont déclarées, l'UX est traçable.

---

## Fichiers de contexte pour l'onboarding

| Fichier                           | Pourquoi le lire                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `_bmad-output/project-context.md` | **À lire en premier** — règles non-évidentes pour agents IA (isolation Supabase, discipline AFRIK, contraintes Storybook, invariants V1→V2) |
| `/CLAUDE.md`                      | Règles techniques projet (commandes, stack, tests, conventions)                                                                             |
| `public/DIRECTIVES-AFRIK.md`      | Méthodologie AFRIK (comment remplir une fiche peuple)                                                                                       |
| `public/modele-*.txt`             | Modèles stricts des fichiers AFRIK (peuple, famille linguistique, pays)                                                                     |
| `supabase/migrations/`            | Schéma DB actuel (006 = schéma AFRIK ; 007 = types contribution V2, à appliquer)                                                            |
| `src/lib/supabase/`               | 3 clients isolés — ne jamais croiser                                                                                                        |
| `src/app/api/v2/`                 | API publique v2 (pattern 3 couches)                                                                                                         |
| `src/components/country/`         | Référence de design system "Carte vivante"                                                                                                  |
| `src/styles/country-tokens.css`   | Tokens CSS à étendre (`--country-*` → prochain préfixe `--afh-*`)                                                                           |
| `docs/index.md`                   | Documentation codebase auto-générée                                                                                                         |

---

## Prochaine étape

**Phase 4 — Implementation** : démarrer l'Epic 0 (Trustworthy Data Baseline & Platform Foundation) qui constitue le hard gate avant tout développement fonctionnel.

---

_Document généré le 18 avril 2026 — Méthodologie BMad Method_
