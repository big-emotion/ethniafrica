# PROJET ETHNIAFRICA - Documentation complète

## Table des matières

1. [Vue d'ensemble](#a-vue-densemble)
2. [Architecture technique](#b-architecture-technique)
3. [Méthodologie AFRIK](#c-méthodologie-afrik)
4. [Organisation des données](#d-organisation-des-données)
5. [Utilisation des agents Cursor](#e-utilisation-des-agents-cursor)
6. [Modes de travail](#f-modes-de-travail)
7. [API publique](#g-api-publique)
8. [Scripts et outils](#h-scripts-et-outils)
9. [Développement](#i-développement)
10. [Choix et décisions techniques](#j-choix-et-décisions-techniques)
11. [Choix et décisions fonctionnelles](#k-choix-et-décisions-fonctionnelles)
12. [Choix et décisions structurelles](#l-choix-et-décisions-structurelles)
13. [Principes méthodologiques](#m-principes-méthodologiques)
14. [Objectifs et évolution](#n-objectifs-et-évolution)

---

## A. Vue d'ensemble

### Description du projet

**ETHNIAFRICA** est une application web open source qui permet d'explorer les peuples d'Afrique par région, pays et groupe ethnique, avec des statistiques de population claires et une interface pensée pour desktop et mobile.

**Note importante** : Le nom actuel du site ("Ethniafrica") est voué à changer car il évoque la notion d'"ethnie" qui est elle-même héritée de la période coloniale. Un nouveau nom sera choisi pour mieux refléter l'approche décoloniale du projet et ses objectifs pédagogiques.

Le projet utilise la **méthodologie AFRIK** pour organiser et structurer les données ethnographiques et linguistiques de l'Afrique selon une hiérarchie simplifiée : Famille linguistique → Langue → Peuple → Pays.

### Objectifs principaux

1. **Documentation complète** : Fournir des informations détaillées sur les peuples, langues et familles linguistiques d'Afrique
2. **Approche décoloniale** : Traiter les données avec sensibilité, en contextualisant les termes coloniaux et péjoratifs
3. **Sources fiables** : Utiliser uniquement des sources reconnues (ONU, CIA, SIL, UNESCO, etc.)
4. **Accessibilité** : Interface multilingue (français, anglais, espagnol, portugais) et responsive
5. **Open source** : Données et code accessibles pour la recherche et l'éducation

### Public cible

- Chercheurs et étudiants en anthropologie, linguistique, études africaines
- Éducateurs et enseignants
- Développeurs et contributeurs open source
- Toute personne intéressée par la diversité culturelle et linguistique de l'Afrique

### État actuel

Selon `WORKFLOW_AFRIK_STATUS.md` :

- ✅ **Familles linguistiques** : 24/24 complétées
- ✅ **Langues principales** : Complétées
- ✅ **Peuples** : 592/592 générés
- ⏳ **Pays** : 9/55 générés
- ⏳ **CSV démographies** : En cours
- ⏳ **Validation globale** : En attente
- ⏳ **Publication** : À venir

**Note importante** : Le projet a été simplifié pour se concentrer uniquement sur familles linguistiques, langues, peuples et pays. Les données ethnies/sous-ethnies/clans ont été déplacées dans `/dataset/source/archive/`.

---

## B. Architecture technique

### Stack technologique

- **Framework** : Next.js 15 (App Router) avec TypeScript
- **Styling** : Tailwind CSS + shadcn/ui
- **State Management** : TanStack Query (React Query)
- **Base de données** : Supabase (PostgreSQL)
- **Documentation API** : Swagger/OpenAPI
- **Build** : Next.js avec optimisations de production

### Structure des dossiers

```
ethniafrica/
├── src/                    # Code source de l'application
│   ├── app/               # Pages Next.js (App Router)
│   │   ├── [lang]/        # Pages localisées
│   │   ├── admin/         # Interface d'administration
│   │   ├── api/           # Routes API REST
│   │   └── docs/          # Documentation Swagger
│   ├── components/        # Composants React
│   ├── lib/               # Utilitaires et helpers
│   ├── hooks/             # React hooks personnalisés
│   └── types/             # Définitions TypeScript
├── public/                 # Fichiers statiques
│   ├── modele-*.txt       # Modèles de fichiers AFRIK
│   └── *.csv              # CSV démographiques
├── dataset/               # Données du projet
│   └── source/
│       └── afrik/         # Données AFRIK organisées
│           ├── famille_linguistique/
│           ├── peuples/
│           └── pays/
├── scripts/                # Scripts de migration et traitement
├── docs/                   # Documentation technique
└── supabase/              # Migrations SQL
```

### Organisation du code source

- **`src/app/`** : Structure Next.js App Router avec routes API et pages
- **`src/components/`** : Composants React réutilisables (UI, pages, détails)
- **`src/lib/`** : Utilitaires (API, base de données, traductions, etc.)
- **`src/hooks/`** : Hooks React personnalisés pour la logique métier
- **`src/types/`** : Types TypeScript pour la cohérence du code

### Base de données (Supabase/PostgreSQL)

Le projet utilise Supabase comme backend avec PostgreSQL pour stocker :

- Données démographiques (pays, régions, ethnies)
- Contributions utilisateurs
- Métadonnées et relations

Les migrations SQL sont dans `/supabase/migrations/`.

### API REST

L'application expose une API REST publique documentée avec Swagger/OpenAPI. Voir section [G. API publique](#g-api-publique).

---

## C. Méthodologie AFRIK

### Hiérarchie simplifiée

La méthodologie AFRIK organise les données selon une hiérarchie stricte :

1. **Famille linguistique** (FLG\_\*) - Ex: FLG_BANTU, FLG_MANDE
2. **Langue** (code ISO 639-3) - Ex: swa (Swahili), lin (Lingala)
3. **Peuple** (PPL\_\*) - Ex: PPL_COMORIEN, PPL_YORUBA
4. **Pays** (ISO 3166-1 alpha-3) - Ex: COM, ZAF, CMR

### Identifiants AFRIK

Chaque entité possède un identifiant unique :

- **ID famille linguistique** : `FLG_xxxxx` (ex: FLG_BANTU)
- **ID langue** : Code ISO 639-3 (ex: swa, lin, kin)
- **ID peuple** : `PPL_xxxxx` (ex: PPL_COMORIEN)
- **ID pays** : ISO 3166-1 alpha-3 (ex: COM, ZAF, CMR)

Les identifiants doivent être cohérents entre les fichiers TXT et CSV.

### Modèles de fichiers

Chaque type d'entité suit un modèle strict :

- **`modele-pays.txt`** : Structure pour les fichiers pays
- **`modele-peuple.txt`** : Structure pour les fichiers peuples
- **`modele-linguistique.txt`** : Structure pour les familles linguistiques

Les modèles sont dans `/public/modele-*.txt` et doivent être respectés à 100% :

- Toutes les sections doivent être présentes
- L'ordre des sections doit être respecté
- Aucune section ne peut être supprimée ou renommée
- Chaque ligne doit être remplie (même si c'est "N/A")

### Règles de nommage

**Fichiers TXT** :

- Familles linguistiques : `FLG_xxxxx.txt` (ex: FLG_BANTU.txt)
- Peuples : `PPL_xxxxx.txt` (ex: PPL_COMORIEN.txt)
- Pays : `[code ISO 3166-1 alpha-3].txt` (ex: COM.txt, ZAF.txt)

**Identifiants** : MAJUSCULES, sans espaces, underscore pour séparer

### Traitement des termes coloniaux/péjoratifs

Voir section [M. Principes méthodologiques - Traitement des termes coloniaux](#m-principes-méthodologiques).

### Sources autorisées

Voir section [M. Principes méthodologiques - Sources fiables uniquement](#m-principes-méthodologiques).

---

## D. Organisation des données

### Structure `/dataset/source/afrik/`

Les données AFRIK sont organisées comme suit :

```
dataset/source/afrik/
├── famille_linguistique/      # 24 familles linguistiques
│   ├── FLG_*.txt              # Fichiers des familles
│   └── famille_linguistique.csv
├── peuples/                   # 592 peuples organisés par famille
│   ├── FLG_BANTU/
│   │   ├── PPL_*.txt
│   │   └── FLG_BANTU-peuple.csv
│   ├── FLG_MANDE/
│   │   ├── PPL_*.txt
│   │   └── FLG_MANDE-peuple.csv
│   └── ...
└── pays/                      # 9/55 pays générés
    └── [code ISO].txt
```

### Fichiers CSV démographiques

Trois fichiers CSV maîtres dans `/public/` :

1. **`famille_linguistique.csv`** : Démographie des familles linguistiques
2. **`peuple_demographie_globale.csv`** : Démographie globale des peuples
3. **`pays_demographie.csv`** : Démographie des pays

Chaque entrée contient :

- Identifiant
- Population
- Année de référence (2025)
- Source

### Archive

Le dossier `/dataset/source/archive/` contient :

- **`ethnies/`** : 1716 fichiers ETH\_\*.txt (archivés)
- **`sous_ethnies/`** : 36 fichiers SUB\_\*.txt (archivés)
- **`clans/`** : 8 fichiers CLN\_\*.txt (archivés)
- **`ambigus/`** : 4 fichiers (archivés)
- **`legacy/`** : Anciennes données organisées par région
- **`logs/`** : Logs des étapes passées

Ces données sont conservées pour référence mais ne font plus partie du workflow actuel.

---

## E. Utilisation des agents Cursor

### Configuration via `.cursorrules`

Le fichier `.cursorrules` à la racine du projet contient toutes les règles que l'agent Cursor doit suivre pour générer des fichiers AFRIK.

### Règles d'activation automatique

Lorsque l'utilisateur demande :

- **"Génère le pays X"** / **"Fais-moi la fiche du pays X"**
  → Générer un fichier `.txt` basé strictement sur `modele-pays.txt`

- **"Génère le peuple X"** / **"Fais-moi la fiche du peuple X"**
  → Générer un fichier `.txt` basé strictement sur `modele-peuple.txt`
  → Placer dans `/dataset/source/afrik/peuples/FLG_*/PPL_*.txt`
  → Mettre l'accent sur les origines, migrations et appellations

- **"Génère la famille linguistique X"**
  → Générer un fichier `.txt` basé strictement sur `modele-linguistique.txt`
  → Placer dans `/dataset/source/afrik/famille_linguistique/FLG_*.txt`

- **"Génère la démographie de X"**
  → Remplir le ou les fichiers CSV correspondants

### Génération de fichiers

L'agent doit :

1. Charger le modèle TXT correspondant depuis `/public/modele-*.txt`
2. Respecter 100% des sections du modèle
3. Conserver les titres et l'ordre exact
4. Ne jamais supprimer, renommer ou ajouter de sections
5. Remplir chaque ligne (même si c'est "N/A")

### Recherche web obligatoire

Aucune donnée ne doit être inventée. L'agent doit effectuer une recherche web pour :

- Nom du pays/peuple/famille linguistique
- Appellations historiques (exonymes et endonymes)
- Origines et migrations
- Royaumes, civilisations, dynasties
- Langues et codes ISO 639-3
- Démographie (ONU, UNFPA, CIA, SIL)
- Sources académiques

### Validation et cohérence

L'agent doit vérifier automatiquement :

- Que toute entité dans un TXT existe dans les CSV correspondants
- Que la démographie TXT = démographie CSV
- Que les ID sont identiques partout
- Que la famille linguistique TXT existe dans CSV

---

## F. Modes de travail

### Mode éditeur

Génération directe de fichiers selon les modèles. L'utilisateur demande à l'agent de générer un fichier, et l'agent le crée directement en respectant le modèle correspondant.

### Mode l-plan

Planification et exécution par étapes. L'utilisateur demande un plan, l'agent le crée, puis l'utilisateur valide et l'agent exécute étape par étape.

### Workflow officiel AFRIK

Le workflow suit 7 étapes obligatoires :

1. **Familles linguistiques** (24/24 ✅)
2. **Langues** (✅)
3. **Peuples** (592/592 ✅)
4. **Pays** (9/55 ⏳)
5. **Démographies CSV** (⏳)
6. **Validation** (⏳)
7. **Publication** (⏳)

### Fichiers de suivi

Deux fichiers obligatoires pour suivre l'avancement :

1. **`WORKFLOW_AFRIK_STATUS.md`** : Checklist humaine, progression visible
2. **`workflow_status.csv`** : Suivi technique, statuts (pending / in_progress / done)

Aucune étape ne peut être considérée comme finalisée tant qu'elle n'est pas mise à jour dans ces fichiers.

---

## G. API publique

### Documentation Swagger

L'API est documentée avec Swagger/OpenAPI accessible sur :

- **Interface Swagger UI** : `/docs/api`
- **Spécification OpenAPI JSON** : `/api/docs`

### Endpoints disponibles

#### Statistiques

- `GET /api/stats` - Statistiques globales (population totale de l'Afrique)

#### Régions

- `GET /api/regions` - Liste toutes les régions
- `GET /api/regions/{key}` - Détails d'une région spécifique
- `GET /api/regions/{key}/countries` - Pays d'une région

#### Pays

- `GET /api/countries` - Liste tous les pays
- `GET /api/countries/{name}` - Détails d'un pays (avec ethnies)

#### Ethnies

- `GET /api/ethnicities` - Liste toutes les ethnies
- `GET /api/ethnicities/{name}` - Détails d'une ethnie globale

#### Téléchargement de données

- `GET /api/download?format=csv` - Télécharge toutes les données en CSV (ZIP)
- `GET /api/download?format=excel` - Télécharge toutes les données en Excel (XLSX)

Les exports incluent tous les champs enrichis (langues, descriptions, informations culturelles, etc.).

### Format des réponses

Toutes les réponses sont au format JSON avec codes HTTP standards :

- `200` - Succès
- `404` - Ressource non trouvée
- `500` - Erreur serveur

### Référence APIs externes

Le fichier `API_AFRIK_REFERENCE.md` documente toutes les APIs externes utilisées pour enrichir les données :

- Glottolog
- Wikidata SPARQL
- CIA World Factbook
- UNESCO
- ASCL Leiden
- Et autres sources fiables

---

## H. Scripts et outils

### Scripts actifs

Scripts utilisés dans le workflow actuel :

- **`matchCSVAndDescriptions.ts`** : Matching entre CSV et descriptions
- **`migrate-to-supabase.ts`** : Migration vers Supabase
- **`migrateEnrichedData.ts`** : Migration des données enrichies
- **`parseCountryDescriptions.ts`** : Parsing des descriptions de pays
- **`parseEnrichedCountryCSV.ts`** : Parsing des CSV enrichis
- **`resetDatabase.ts`** : Réinitialisation de la base de données
- **`verifyDeployment.ts`** : Vérification du déploiement
- **`generateTranslations.ts`** : Génération des traductions
- **`invalidateCache.ts`** : Invalidation du cache
- **`buildEthnieReferential.ts`** : Construction du référentiel ethnies

### Scripts archivés

Les scripts liés aux étapes passées sont dans `/scripts/archive/` :

- Scripts d'enrichissement (Étape 4)
- Scripts de génération d'ethnies
- Scripts de sous-groupes (Étape 5)
- Scripts de nettoyage

Voir `/scripts/archive/README.md` pour plus de détails.

### Utilisation

Les scripts sont exécutés avec `tsx` :

```bash
tsx scripts/parseEnrichedCountryCSV.ts
tsx scripts/migrateEnrichedData.ts
```

---

## I. Développement

### Installation et configuration

**Prérequis** : Node.js 18+ et npm

```bash
npm install
cp env.dist .env.local
# Configurer les variables d'environnement dans .env.local
npm run dev
```

L'application démarre sur `http://localhost:3000`.

### Variables d'environnement

Copier `env.dist` vers `.env.local` et configurer :

- `NEXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service Supabase (opérations admin)
- `ADMIN_USERNAME` : Nom d'utilisateur pour l'interface admin
- `ADMIN_PASSWORD` : Mot de passe pour l'interface admin

### Commandes de développement

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # Linting
npm run type-check   # Vérification TypeScript
```

### Déploiement

Voir `docs/DEPLOYMENT.md` pour le guide complet de déploiement.

**Résumé rapide** :

1. Appliquer les migrations SQL (`supabase/migrations/`)
2. Configurer les variables d'environnement
3. Exécuter les scripts de migration des données
4. Déployer l'application (Vercel recommandé)

---

## J. Choix et décisions techniques

### Stack technologique

**Next.js 15 avec App Router** : Choix pour le SSR, le routing automatique et les optimisations de performance.

**TypeScript** : Typage fort pour la cohérence du code et la détection d'erreurs.

**Supabase** : Backend as a Service avec PostgreSQL pour la flexibilité et la scalabilité.

**Tailwind CSS + shadcn/ui** : Design system moderne et accessible.

**TanStack Query** : Gestion efficace du cache et des requêtes API.

### Architecture API REST

API RESTful standardisée avec :

- Routes claires et prévisibles
- Codes HTTP appropriés
- Format JSON cohérent
- Documentation OpenAPI/Swagger

### Structure de base de données

PostgreSQL via Supabase avec :

- Tables normalisées pour les pays, régions, ethnies
- Relations claires entre entités
- Support des données enrichies (descriptions, langues, etc.)
- Système de contributions modérées

### Gestion du cache

- Cache côté client (localStorage) pour les données fréquemment consultées
- Cache côté serveur (Next.js) pour les pages statiques
- Invalidation intelligente du cache lors des mises à jour

### Internationalisation (i18n)

Support de 4 langues :

- Français (par défaut)
- Anglais
- Espagnol
- Portugais

URLs localisées : `/{lang}/regions`, `/{lang}/pays`, etc.

### Responsive design

Interface optimisée pour :

- Desktop (navigation fixe, tableaux complets)
- Mobile (menu burger, recherche accessible, tableaux adaptatifs)

### Optimisations de performance

- Code splitting automatique (Next.js)
- Images optimisées
- Lazy loading des composants
- Pagination intelligente des tableaux

---

## K. Choix et décisions fonctionnelles

### Hiérarchie simplifiée

**Choix** : Famille linguistique → Langue → Peuple → Pays

**Raison** : Cette hiérarchie reflète mieux la réalité linguistique et culturelle de l'Afrique, en mettant l'accent sur les langues plutôt que sur des catégories ethniques souvent problématiques.

### Abandon de la classification par ethnie

**Choix** : Les données ethnies/sous-ethnies/clans ont été déplacées dans l'archive.

**Raison** :

- La catégorisation par "ethnie" est souvent héritée de la période coloniale
- Elle peut être réductrice et ne reflète pas la complexité des identités
- L'approche par famille linguistique est plus objective et scientifique

### Focus sur les peuples et familles linguistiques

**Choix** : Le projet se concentre sur les peuples (groupes culturels) et les familles linguistiques.

**Raison** :

- Les peuples sont des entités culturelles vivantes
- Les familles linguistiques permettent une classification scientifique
- Cette approche évite les pièges de la catégorisation ethnique rigide

### Traitement décolonial des données

**Choix** : Contextualisation systématique des termes coloniaux et péjoratifs.

**Raison** :

- Respect des communautés concernées
- Approche éthique et scientifique
- Éducation sur l'histoire coloniale

### Méthodologie AFRIK vs approches traditionnelles

**Choix** : Création d'une méthodologie spécifique AFRIK plutôt que d'utiliser des classifications existantes.

**Raison** :

- Besoin d'une approche adaptée au contexte africain
- Intégration de la sensibilité décoloniale
- Standardisation pour la cohérence des données

---

## L. Choix et décisions structurelles

### Organisation par famille linguistique

**Choix** : Les peuples sont organisés par famille linguistique (`/peuples/FLG_*/`) plutôt que par ethnie ou région.

**Raison** :

- Classification scientifique objective
- Regroupement logique des peuples partageant des langues apparentées
- Facilite la recherche et la navigation

### Identifiants standardisés

**Choix** : Utilisation d'identifiants standardisés (FLG*, PPL*, codes ISO).

**Raison** :

- Cohérence dans toute la base de données
- Interopérabilité avec d'autres systèmes
- Traçabilité et référencement

### Modèles de fichiers stricts

**Choix** : Modèles de fichiers stricts avec sections obligatoires.

**Raison** :

- Cohérence des données
- Facilité de traitement automatisé
- Garantie que toutes les informations importantes sont présentes

### Archive des données non essentielles

**Choix** : Conservation des données ethnies/sous-ethnies/clans dans l'archive plutôt que suppression.

**Raison** :

- Référence historique
- Possibilité de réutilisation future
- Traçabilité des décisions

### Séparation claire entre données sources et données générées

**Choix** : Structure claire avec `/dataset/source/afrik/` pour les données sources et base de données pour les données utilisées par l'application.

**Raison** :

- Traçabilité des sources
- Facilité de mise à jour
- Séparation des préoccupations

---

## M. Principes méthodologiques

### Traitement des termes coloniaux/péjoratifs

**Principe absolu** : Aucun terme colonial ou péjoratif ne doit être présenté comme neutre.

**Règles obligatoires** :

1. **Conservation du terme historique** : Le terme est conservé pour référence historique
2. **Explication de l'origine** : L'origine du terme est expliquée
3. **Explication du problème** : Pourquoi le terme pose problème est indiqué
4. **Mise en avant de l'auto-appellation** : L'endonyme (nom que le groupe se donne) est mis en avant
5. **Contextualisation de l'usage contemporain** : L'usage actuel du terme est précisé
6. **Jamais présenter comme neutre** : Le terme n'est jamais présenté comme un simple synonyme

**Exemple** : Si un terme comme "Bantou" est utilisé historiquement de manière problématique, il doit être expliqué que :

- C'est un terme linguistique (famille de langues)
- Il ne doit pas être utilisé comme catégorie ethnique
- Les peuples concernés ont leurs propres noms
- Le terme peut être utilisé dans un contexte linguistique mais pas pour catégoriser des personnes

### Sources fiables uniquement

**Principe** : Aucune donnée ne doit provenir de sources non vérifiées.

**Sources autorisées** :

**Démographie** :

- ONU (Nations Unies)
- UNFPA (Fonds des Nations Unies pour la population)
- CIA World Factbook
- Banque Mondiale

**Langues** :

- Ethnologue (SIL) - Classification linguistique
- Glottolog - Référentiel linguistique
- UNESCO - Langues en danger
- African Language Atlas

**Sources académiques** :

- Vansina (historien spécialiste de l'Afrique)
- Ehret (linguiste et historien)
- Hiernaux (anthropologue)
- IWGIA (International Work Group for Indigenous Affairs)
- Encyclopaedia Africana
- ASCL Leiden (African Studies Centre Leiden)

**Règle** : Toutes les sources doivent être citées dans la section "Sources" de chaque fichier.

### Recherche web obligatoire

**Principe** : Aucune donnée ne doit être inventée.

**Obligations** :

1. **Recherche systématique** : Pour chaque entité (pays, peuple, famille linguistique), effectuer une recherche web
2. **Vérification** : Vérifier les informations auprès de plusieurs sources
3. **Citation** : Citer toutes les sources utilisées
4. **Mise à jour** : Utiliser les données les plus récentes disponibles (année 2025 pour la démographie)

**Informations à rechercher** :

- Nom du pays/peuple/famille linguistique
- Appellations historiques (exonymes et endonymes)
- Origines et migrations
- Royaumes, civilisations, dynasties
- Langues et codes ISO 639-3
- Démographie
- Sources académiques

### Cohérence et validation

**Principe** : Toutes les données doivent être cohérentes entre les fichiers.

**Vérifications obligatoires** :

1. **TXT ↔ CSV** : Toute entité dans un TXT doit exister dans les CSV correspondants
2. **Démographie** : La démographie TXT = démographie CSV
3. **Identifiants** : Les ID sont identiques partout
4. **Famille linguistique** : La famille linguistique TXT existe dans CSV
5. **Somme des peuples** : La somme des peuples d'un pays = EXACTEMENT 100%
6. **Population totale** : Les peuples = population totale (tous pays)
7. **Année de référence** : Toutes les données démographiques sont pour l'année 2025

**Correction automatique** : Si une incohérence est détectée, l'agent doit proposer une correction automatique.

---

## N. Objectifs et évolution

### Roadmap

**Court terme** :

- Compléter la génération des pays (55/55)
- Finaliser les CSV démographiques
- Validation globale des données
- Publication initiale

**Moyen terme** :

- Enrichissement qualitatif des fiches existantes
- Ajout de cartes interactives
- Amélioration de l'interface utilisateur
- Traductions dans les langues africaines

**Long terme** :

- Carte interactive des zones de présence
- Fiches enrichies : sous-ethnies, histoire, culture, religions, royaumes, personnalités
- Sciences et arts
- API publique complète
- Communauté de contributeurs

### Prochaines étapes

1. Génération des 46 pays restants
2. Complétion des CSV démographiques
3. Validation de la cohérence (100%)
4. Tests utilisateurs
5. Publication et communication

### Améliorations prévues

- **Interface** : Amélioration de l'UX/UI
- **Données** : Enrichissement continu
- **Performance** : Optimisations supplémentaires
- **Accessibilité** : Amélioration de l'accessibilité
- **Documentation** : Documentation utilisateur complète

### Vision à long terme

**ETHNIAFRICA** vise à devenir la référence open source pour les données ethnographiques et linguistiques de l'Afrique, avec :

- Une approche décoloniale respectueuse
- Des données fiables et vérifiées
- Une interface accessible et multilingue
- Une communauté active de contributeurs
- Un impact éducatif et scientifique positif

### Fonctionnalités futures

Le projet prévoit l'ajout de nombreuses fonctionnalités pédagogiques et innovantes pour enrichir l'expérience utilisateur. Voir [ROADMAP_FONCTIONNALITES.md](ROADMAP_FONCTIONNALITES.md) pour la liste complète.

**Exemples de fonctionnalités prévues :**

- **Atlas des noms** : Étymologie, évolution historique, usages coloniaux, auto-appellations
- **Généalogie des classifications** : Explication des classifications linguistiques et anthropologiques, leur évolution et leur contexte
- **Liens cachés entre peuples** : Visualisation des relations linguistiques, migratoires, culturelles et historiques
- **Colonisation & résistances** : Cartographie des impacts coloniaux sur les noms, peuples et classifications
- **Frise des migrations africaines** : Visualisation interactive des grandes migrations historiques
- **Quiz intelligent** : Apprentissage interactif sur les peuples, langues et histoire de l'Afrique
- **Graphes relationnels** : Visualisation des réseaux de relations entre peuples, langues et cultures
- **Comparateurs interactifs** : Outils de comparaison entre peuples, pays, langues
- **Module "Les mots et la violence"** : Analyse de l'impact des noms et termes coloniaux sur les identités

Ces fonctionnalités s'articulent autour de trois colonnes pédagogiques : **Les noms**, **Les liens**, et **Les regards**, avec trois modes d'accès : **Explorer**, **Comprendre**, et **Jouer**.

---

## Conclusion

Ce document présente l'ensemble du projet ETHNIAFRICA, de son architecture technique à ses principes méthodologiques. Le projet combine une approche scientifique rigoureuse avec une sensibilité décoloniale, pour créer une ressource précieuse et respectueuse sur les peuples et langues d'Afrique.

Pour toute question ou contribution, voir le [README.md](README.md) et la [documentation API](docs/API_ROUTES.md).

Pour connaître les fonctionnalités prévues, voir [ROADMAP_FONCTIONNALITES.md](ROADMAP_FONCTIONNALITES.md).

---

**Dernière mise à jour** : 2025-01-XX  
**Version du document** : 1.0
