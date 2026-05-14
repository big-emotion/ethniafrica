-- =============================================================================
-- Migration: 016_editorial_doctrine_seed.sql
-- Story: ETNI-30 — Editorial doctrine seed + MDX rendering page
-- =============================================================================
--
-- Seeds the four MVP editorial-doctrine entries used by the
-- /fr/doctrine/[slug] route.
--
-- ORDERING NOTE
-- -------------
-- This migration assumes the editorial_doctrine table has been reconciled
-- by migration 014 (ETNI-22 — module_zero_fabric_align) to the canonical
-- shape:
--
--   editorial_doctrine (
--     id           UUID PRIMARY KEY,
--     slug         TEXT NOT NULL,
--     title        TEXT NOT NULL,
--     mdx_source   TEXT NOT NULL,
--     version      INTEGER NOT NULL,
--     published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     superseded_at TIMESTAMPTZ,
--     UNIQUE (slug, version)
--   );
--
-- Until 014 lands, this migration is a no-op against the legacy
-- (key, content, category, active) shape: the INSERT will fail
-- with a "column slug does not exist" error and rollback cleanly.
-- Apply 014 BEFORE 016.
--
-- IDEMPOTENCY
-- -----------
-- Uses `ON CONFLICT (slug, version) DO NOTHING` so re-running the
-- migration is safe.
-- =============================================================================

INSERT INTO editorial_doctrine (slug, title, mdx_source, version, published_at)
VALUES
  (
    'endonymes-vs-exonymes',
    'Endonymes vs exonymes',
    $mdx$# Endonymes vs exonymes

Un **endonyme** (ou auto-appellation) est le nom qu'un peuple, une langue ou
un lieu se donne à lui-même dans sa propre langue.

Un **exonyme** est un nom donné de l'extérieur — souvent par un autre peuple,
une administration coloniale ou un cartographe européen.

## Notre politique

- Nous privilégions systématiquement les **endonymes** lorsqu'ils sont attestés.
- L'exonyme courant (français ou anglais) est conservé en sous-titre pour
  faciliter la recherche, mais n'est jamais présenté comme le nom principal.
- Lorsqu'un exonyme est porteur d'une charge coloniale (voir
  *Héritage colonial*), nous l'expliquons explicitement.
$mdx$,
    1,
    NOW()
  ),
  (
    'classifications-contestees',
    'Classifications contestées',
    $mdx$# Classifications contestées

Une classification est **contestée** lorsqu'elle fait l'objet de débats actifs
entre chercheurs : sous-classification interne discutée, frontières floues
avec une famille voisine, hypothèses concurrentes documentées.

## Comment nous traitons les classifications contestées

- Nous conservons la classification **courante** dans la littérature
  scientifique majoritaire.
- Nous **signalons** la controverse via un badge dédié sur la fiche.
- Nous documentons les hypothèses concurrentes avec leurs sources primaires.
- Aucune position n'est imposée au lecteur : nous exposons l'état du débat.
$mdx$,
    1,
    NOW()
  ),
  (
    'heritage-colonial',
    'Héritage colonial',
    $mdx$# Héritage colonial

De nombreuses catégories ethniques, linguistiques ou géographiques utilisées
aujourd'hui ont été **produites ou figées pendant la période coloniale**, par
des administrateurs, des missionnaires ou des linguistes travaillant pour
l'administration coloniale.

## Notre politique

- Nous **conservons** ces catégories pour respecter la traçabilité historique
  et faciliter le croisement avec les sources existantes.
- Nous **expliquons** systématiquement pourquoi elles sont problématiques.
- Nous présentons en parallèle les **auto-appellations** (endonymes) lorsqu'elles
  sont attestées.
- Nous ne réécrivons pas l'histoire : nous l'éclairons.
$mdx$,
    1,
    NOW()
  ),
  (
    'topics-sensibles',
    'Sujets sensibles',
    $mdx$# Sujets sensibles

Certains sujets — esclavage, génocides, conflits ethniques contemporains,
pratiques rituelles, frontières disputées — exigent une **vigilance éditoriale
particulière**.

## Notre approche

- **Faits sourcés uniquement** : aucune affirmation sans source primaire ou
  secondaire de référence (UN, UNFPA, IWGIA, UNESCO, travaux académiques
  pairs-relus).
- **Pluralité des points de vue** lorsque les sources divergent.
- **Pas de jugement moral** porté par la fiche : nous décrivons, nous ne
  condamnons ni ne célébrons.
- **Avertissement explicite** lorsque le contenu peut heurter (violences,
  iconographie sensible).
$mdx$,
    1,
    NOW()
  )
ON CONFLICT (slug, version) DO NOTHING;
