# ETHNIAFRICA - Présentation technique

## Utilisation de l'outil dans le projet (7 min)

---

## 1. Stack technique en 30 secondes

**Frontend** :

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (React Query)

**Backend** :

- Supabase (PostgreSQL)
- API REST documentée (Swagger/OpenAPI)

**Outils** :

- Cursor AI (génération de fichiers AFRIK)
- Scripts TypeScript pour migration/traitement

---

## 2. Architecture du projet

### Structure des dossiers

```
ethniafrica/
├── src/                    # Code source Next.js
│   ├── app/               # Pages et routes API
│   ├── components/        # Composants React
│   ├── lib/               # Utilitaires (API, DB, i18n)
│   └── hooks/             # React hooks personnalisés
├── public/                 # Fichiers statiques
│   ├── modele-*.txt       # Modèles AFRIK
│   └── *.csv              # CSV démographiques
├── dataset/source/afrik/  # Données sources
│   ├── famille_linguistique/
│   ├── peuples/FLG_*/
│   └── pays/
├── scripts/               # Scripts de traitement
└── supabase/             # Migrations SQL
```

### Organisation des données

**Fichiers TXT** : Données sources structurées selon modèles

- `FLG_*.txt` : Familles linguistiques
- `PPL_*.txt` : Peuples (organisés par famille)
- `[ISO].txt` : Pays (codes ISO 3166-1 alpha-3)

**Fichiers CSV** : Démographie et métadonnées

- `famille_linguistique.csv`
- `peuple_demographie_globale.csv`
- `pays_demographie.csv`

**Base de données** : Supabase pour l'application

- Tables normalisées (pays, régions, ethnies)
- Relations entre entités
- Système de contributions

---

## 3. Utilisation de Cursor AI

### Configuration : `.cursorrules`

Le fichier `.cursorrules` contient toutes les règles pour générer des fichiers AFRIK.

**Règles d'activation automatique** :

- "Génère le pays X" → Fichier basé sur `modele-pays.txt`
- "Génère le peuple X" → Fichier basé sur `modele-peuple.txt`
- "Génère la famille linguistique X" → Fichier basé sur `modele-linguistique.txt`

### Workflow de génération

**Étape 1 : Charger le modèle**

- L'agent charge le modèle correspondant depuis `/public/modele-*.txt`

**Étape 2 : Recherche web obligatoire**

- Nom, appellations historiques, origines, migrations
- Langues et codes ISO 639-3
- Démographie (ONU, UNFPA, CIA, SIL)
- Sources académiques

**Étape 3 : Génération du fichier**

- Respect 100% des sections du modèle
- Conservation des titres et ordre exact
- Remplissage de chaque ligne (même si "N/A")

**Étape 4 : Validation automatique**

- Vérification que l'entité existe dans les CSV
- Cohérence démographie TXT ↔ CSV
- Vérification des identifiants
- Vérification famille linguistique

### Exemple concret

**Commande** : "Génère le peuple Yoruba"

**Actions de l'agent** :

1. Charge `modele-peuple.txt`
2. Recherche web : "Yoruba", "origines", "migrations", "appellations"
3. Génère `PPL_YORUBA.txt` dans `/dataset/source/afrik/peuples/FLG_BENOUECONGO/`
4. Vérifie cohérence avec CSV
5. Met à jour les fichiers de suivi

---

## 4. Scripts et outils

### Scripts actifs

**Migration et traitement** :

- `migrate-to-supabase.ts` : Migration vers Supabase
- `migrateEnrichedData.ts` : Migration des données enrichies
- `parseCountryDescriptions.ts` : Parsing des descriptions
- `matchCSVAndDescriptions.ts` : Matching CSV ↔ descriptions

**Validation** :

- `buildEthnieReferential.ts` : Construction du référentiel
- `verifyDeployment.ts` : Vérification du déploiement

**Utilitaires** :

- `generateTranslations.ts` : Génération des traductions
- `invalidateCache.ts` : Invalidation du cache

### Utilisation

```bash
# Exécution d'un script
tsx scripts/migrateEnrichedData.ts

# Développement
npm run dev

# Build production
npm run build
```

---

## 5. API REST

### Documentation Swagger

- **Interface Swagger UI** : `/docs/api`
- **Spécification OpenAPI** : `/api/docs`

### Endpoints principaux

**Statistiques** :

- `GET /api/stats` : Statistiques globales

**Régions** :

- `GET /api/regions` : Liste des régions
- `GET /api/regions/{key}` : Détails d'une région

**Pays** :

- `GET /api/countries` : Liste des pays
- `GET /api/countries/{name}` : Détails d'un pays

**Ethnies** :

- `GET /api/ethnicities` : Liste des ethnies
- `GET /api/ethnicities/{name}` : Détails d'une ethnie

**Téléchargement** :

- `GET /api/download?format=csv` : Export CSV (ZIP)
- `GET /api/download?format=excel` : Export Excel (XLSX)

### Format des réponses

Toutes les réponses sont en JSON avec codes HTTP standards :

- `200` : Succès
- `404` : Ressource non trouvée
- `500` : Erreur serveur

---

## 6. Workflow de développement

### Installation

```bash
npm install
cp env.dist .env.local
# Configurer les variables d'environnement
npm run dev
```

### Variables d'environnement

- `NEXT_PUBLIC_SUPABASE_URL` : URL Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service (admin)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` : Interface admin

### Commandes

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run start        # Serveur production
npm run lint         # Linting
npm run type-check   # Vérification TypeScript
```

### Déploiement

1. Appliquer les migrations SQL (`supabase/migrations/`)
2. Configurer les variables d'environnement
3. Exécuter les scripts de migration des données
4. Déployer (Vercel recommandé)

---

## 7. Gestion des données

### Workflow AFRIK

**7 étapes obligatoires** :

1. Familles linguistiques (24/24 ✅)
2. Langues (✅)
3. Peuples (592/592 ✅)
4. Pays (13/55 ⏳)
5. Démographies CSV (⏳)
6. Validation (⏳)
7. Publication (⏳)

### Fichiers de suivi

**`WORKFLOW_AFRIK_STATUS.md`** :

- Checklist humaine
- Progression visible
- État de chaque étape

**`workflow_status.csv`** :

- Suivi technique
- Statuts : pending / in_progress / done

### Cohérence des données

**Vérifications automatiques** :

- TXT ↔ CSV : Toute entité TXT existe dans CSV
- Démographie : TXT = CSV
- Identifiants : ID identiques partout
- Somme des peuples : = 100% par pays
- Année de référence : 2025

**Correction automatique** : L'agent propose des corrections si incohérence détectée

---

## 8. Internationalisation (i18n)

### Langues supportées

- Français (par défaut)
- Anglais
- Espagnol
- Portugais

### URLs localisées

- `/{lang}/regions`
- `/{lang}/pays`
- `/{lang}/peuples`

### Traductions

- Fichiers de traduction dans `src/lib/translations/`
- Génération automatique via `generateTranslations.ts`

---

## Points clés techniques

1. **Next.js 15 App Router** : SSR, routing automatique, optimisations
2. **Supabase** : Backend as a Service avec PostgreSQL
3. **Cursor AI** : Génération automatique de fichiers selon modèles stricts
4. **API REST** : Documentation Swagger/OpenAPI
5. **Workflow AFRIK** : 7 étapes avec validation automatique
6. **Cohérence** : Vérifications automatiques TXT ↔ CSV

---

**Durée estimée de présentation** : 7 minutes
**Public** : Développeurs, contributeurs techniques
**Focus** : Architecture, outils, workflow technique
