# Refonte complète du projet Afrik – Prompt pour Cursor (Version AFRIK)

Tu es mon assistant développeur dans Cursor.

Le projet **existe déjà** : c'est un site Next.js autour du projet **Afrik / EthniAfrica**.  
Mais je veux faire une **refonte complète** :

- L'architecture fonctionnelle du site doit être repensée.
- Les **schémas de données doivent être complètement refaits** selon la méthodologie AFRIK.
- Il faut **migrer les données existantes** depuis `/dataset/source/afrik/` vers les nouveaux schémas.
- Il ne faut pas hésiter à **supprimer tout ce qui ne sera plus utilisé** (modèles, tables, endpoints, pages), tant que c'est fait proprement et de manière cohérente.
- L'objectif est d'obtenir une base technique propre, stable, structurée pour le long terme.

Tu dois donc :

- analyser et tirer parti de l'existant,
- mais ne **PAS te laisser contraindre** par l'ancienne structure si elle n'est plus adaptée,
- proposer un schéma de données et une arborescence **clairs et modernes**, puis adapter le code.

---

# Objectif du site

Je construis un site web pédagogique autour du projet **Afrik** : un atlas des peuples, des noms, des langues et des dynamiques historiques en Afrique.

Objectifs principaux :

- Permettre de **consulter les données** (pays, peuples, langues, familles linguistiques, démographie).
- Mettre en avant le **sens des noms** (étymologie, auto-appellations, exonymes, noms coloniaux, usages problématiques).
- Montrer les **liens et dynamiques** (migrations, influences, routes commerciales, effets de la colonisation, connexions entre peuples).
- Proposer plus tard un **espace interactif** (quiz, exploration cartographique, comparateurs).

Le site doit être **riche** mais **simple à naviguer**.

**Note importante** : La méthodologie AFRIK simplifiée ne distingue que 4 niveaux hiérarchiques : Famille linguistique (FLG_xxxxx) → Langue (ISO 639-3) → Peuple (PPL_xxxxx) → Pays (ISO 3166-1 alpha-3). Les concepts d'ethnies, sous-ethnies et clans ne sont pas structurés dans cette méthodologie.

---

# Stack technique (actuelle ou cible)

- Framework : **Next.js** (App Router)
- Langage : **TypeScript**
- Base de données : **PostgreSQL** (Supabase)
- ORM : idéalement **Prisma**
- Style : Tailwind CSS + shadcn/ui

Ton travail inclura :

- vérifier ce qui existe déjà dans le repo,
- proposer une nouvelle structure,
- **refactorer progressivement** vers cette structure,
- gérer la **migration des données** depuis les fichiers TXT AFRIK dans `/dataset/source/afrik/`.

---

# 1. Arborescence du site (routes cibles)

Le site est organisé autour de **3 grandes portes** (3 "hubs") sur la page d'accueil :

1. **Peuples & Pays**
2. **Histoire des Noms**
3. **Liens & Dynamiques**

Merci de structurer (ou refactorer) le dossier `app/` de Next.js en conséquence.

---

## 1.1. Page d'accueil

**Route :** `/`

Contenu / sections :

- Hero avec :
  - Titre : _Comprendre l'Afrique par ses peuples, ses noms et ses histoires._
  - Sous-titre expliquant le concept.
- 3 grandes cartes / boutons menant aux hubs :
  1. **Peuples & Pays**

     > Comprendre qui est qui. Peuples, pays, langues, familles linguistiques.  
     > Lien : `/peuples-et-pays`

  2. **Histoire des Noms**

     > Comprendre pourquoi ils s'appellent ainsi. Étymologie, auto-appellations, exonymes, noms coloniaux.  
     > Lien : `/histoire-des-noms`

  3. **Liens & Dynamiques**
     > Comprendre comment tout est connecté. Migrations, influences, connexions historiques, cartes, quiz.  
     > Lien : `/liens-et-dynamiques`

- Bloc "à quoi ça sert ?" avec 2–3 paragraphes pédagogiques.
- Quelques blocs "contenu mis en avant" (ex: derniers peuples ajoutés, exemples de noms problématiques, exemples de cartes).

---

## 1.2. Hub 1 : Peuples & Pays

**Route hub :** `/peuples-et-pays`

Cette page doit proposer des cartes / liens vers :

- `/pays`
- `/peuples`
- `/langues`
- `/familles-linguistiques`
- `/demographie`
- `/recherche`

### Pages détaillées cibles :

- `/pays` : liste des pays africains (cartes + filtre par région).
- `/pays/[id]` : fiche pays (métadonnées + texte long + peuples principaux avec identifiants PPL\_).
- `/peuples` : liste des peuples (PPL_xxxx).
- `/peuples/[id]` : fiche peuple (lien vers langues, pays, famille linguistique, contenu long).
- `/langues` : liste des langues (codes ISO 639-3).
- `/langues/[id]` : fiche langue (famille linguistique, peuples associés, nombre de locuteurs).
- `/familles-linguistiques` : liste des familles linguistiques (FLG_xxxxx).
- `/familles-linguistiques/[id]` : fiche famille linguistique (peuples associés avec PPL\_, langues, répartition).
- `/demographie` : vue synthétique des données démographiques.
- `/recherche` : recherche globale (pays, peuples, langues, noms).

**Note importante** : Les routes `/ethnies` et `/ethnies/[id]` ne doivent PAS être créées, car la méthodologie AFRIK simplifiée ne distingue pas les ethnies des peuples. Les informations sur les sous-groupes ethniques sont présentes dans les fichiers peuples mais en texte libre (section "Ethnies incluses dans le peuple").

Si des pages existantes chevauchent ces routes sous d'autres noms, les **adapter ou rediriger** au lieu de tout casser brutalement.

---

## 1.3. Hub 2 : Histoire des Noms

**Route hub :** `/histoire-des-noms`

Page qui introduit :

- auto-appellation
- exonyme
- nom colonial
- variantes historiques
- étymologie

Sous-pages :

- `/noms` : "Atlas des noms" (tous les noms connus, triables/filtrables).
- `/noms/[id]` : fiche d'un nom (origine, sens, type, connotation, entités liées).
- `/etymologies` : vue plus graphique / timeline des étymologies.
- `/auto-appellations` : focus sur les auto-appellations.
- `/exonymes` : focus sur les exonymes.
- `/noms-coloniaux` : focus sur les noms imposés pendant la colonisation.

Si une partie de ces fonctionnalités existe déjà sous des formes différentes, tu peux **réutiliser le code** mais en l'adaptant à la nouvelle structure.

---

## 1.4. Hub 3 : Liens & Dynamiques

**Route hub :** `/liens-et-dynamiques`

Cette page doit orienter vers :

- `/migrations` : cartes et données sur les grandes migrations (ex: expansion bantoue).
- `/carte-des-influences` : influences religieuses, commerciales, politiques.
- `/relations-entre-peuples` : graphes ou tableaux de liens entre peuples.
- `/classifications` : explication des familles, des différentes écoles de classification.
- `/frontieres-coloniales` : cartes avant/après colonisation.
- `/comparateur` : comparer deux peuples / pays / langues.
- `/routes-historiques` : routes commerciales (transsahariennes, swahilies, atlantiques).
- `/quiz` : hub des quiz et jeux (même si le contenu ludique vient plus tard).
- `/quiz-noms`, `/quiz-peuples`, etc. (routes futures à prévoir).

---

# 2. Schéma de données (nouveau modèle conceptuel AFRIK)

L'ancien schéma **doit être repensé** selon la méthodologie AFRIK.  
Les modèles existants peuvent être :

- migrés vers les nouveaux modèles,
- enrichis,
- ou supprimés si obsolètes.

Merci de définir un schéma **Prisma** (ou, si déjà présent, de le refactorer complètement) basé sur les entités suivantes.

**Identifiants Afrik (OBLIGATOIRE) :**

- Pays : code ISO 3166-1 alpha-3 (ex: "DZA", "ZWE")
- Famille linguistique : `FLG_xxxxx` (ex: FLG_BANTU, FLG_MANDE)
- Peuple : `PPL_xxxxx` (ex: PPL_SHONA, PPL_YORUBA)
- Langue : ISO 639-3 (ex: "sna", "swa", "lin")

**Note importante** : Les identifiants ETH_xxxxx, SUB_xxxxx, CLN_xxxxx n'existent PAS dans la méthodologie AFRIK simplifiée et ne doivent PAS être créés.

**Source des données** : Les données doivent être migrées depuis les fichiers TXT dans `/dataset/source/afrik/` :

- Pays : `/dataset/source/afrik/pays/[ISO].txt` (ex: `ZWE.txt`)
- Peuples : `/dataset/source/afrik/peuples/FLG_*/PPL_*.txt` (organisés par famille linguistique)
- Familles linguistiques : `/dataset/source/afrik/famille_linguistique/FLG_*.txt`

---

## 2.1. Pays

```ts
interface Country {
  id: string; // ISO 3166-1 alpha-3 (ex: "DZA", "ZWE")
  nameFr: string;
  nameEn?: string;
  officialNameFr?: string;
  etymology: string; // Section "Étymologie du nom" du fichier TXT
  nameOriginActor?: string; // personne / peuple / administration
  region:
    | "Afrique du Nord"
    | "Afrique de l'Ouest"
    | "Afrique Centrale"
    | "Afrique de l'Est"
    | "Afrique Australe";

  // Contenu long (sections du fichier TXT)
  content: {
    historicalAppellations?: string; // Section "Appellations historiques et origines du nom"
    documentedKingdoms?: Array<{
      name: string;
      period: string;
      dominantPeoples: string[]; // PPL_xxxxx
      politicalCenters: string;
      historicalRole: string;
    }>;
    majorPeoples?: Array<{
      name: string;
      peopleId: string; // PPL_xxxxx
      selfAppellation?: string;
      exonyms?: string[];
      region?: string;
      languages?: string[]; // codes ISO 639-3
      familyId: string; // FLG_xxxxx
      notes?: string;
    }>;
    culture?: string; // Section "Culture, modes de vie, langues, spiritualités"
    majorHistoricalEvents?: string; // Section "Faits historiques majeurs"
  };

  // Démographie
  population2025?: number;
  source?: string;
}
```

---

## 2.2. Famille linguistique

```ts
interface LanguageFamily {
  id: string; // FLG_xxxxx (ex: FLG_BANTU)
  nameFr: string;
  nameEn?: string;
  historicalLabels: string[];
  problematicNotes?: string; // Notes décoloniales sur les termes historiques
  autoAppellation?: string; // Auto-appellation contemporaine
  areaDescription: string;
  estimatedLanguageCount: number;
  estimatedSpeakers: number;

  // Contenu long
  content: {
    branches?: string; // Branches internes / sous-groupes
    associatedPeoples?: string[]; // PPL_xxxxx (identifiants des peuples)
    linguisticCharacteristics?: string;
    history?: string; // Origines, migrations, ruptures
    geographicDistribution?: string;
  };
}
```

---

## 2.3. Langue

```ts
interface Language {
  id: string; // ISO 639-3 (ex: "sna", "swa")
  name: string;
  nameFr?: string;
  nameEn?: string;
  familyId: string; // FLG_xxxxx
  subfamily?: string; // ex: "Bantu Nguni", "Bantu Zone S"
  speakerCount?: number;

  // Peuples associés (relation many-to-many)
  peoples?: string[]; // PPL_xxxxx
}
```

---

## 2.4. Peuple

```ts
interface People {
  id: string; // PPL_xxxxx (ex: PPL_SHONA)
  nameMain: string;
  selfAppellation?: string; // Auto-appellation (endonyme)
  exonyms?: string[]; // Exonymes / appellations historiques
  exonymOrigin?: string; // Origine des termes (exonymes)
  problematicTermsNotes?: string; // Pourquoi certains termes posent problème
  contemporaryUsage?: string; // Usage contemporain des appellations

  languageFamilyId: string; // FLG_xxxxx
  ethnoLinguisticGroup?: string; // ex: "Bantu Zone S"
  historicalRegion?: string; // Codes ISO séparés par virgules (ex: "ZWE, MOZ")
  currentCountries: string[]; // codes ISO (ex: ["ZWE", "MOZ"])

  // Contenu long (sections du fichier TXT)
  content: {
    includedEthnicGroups?: string; // Section "Ethnies incluses" (texte libre, pas de structure)
    origins?: string; // Section "Origines, migrations et formation du peuple"
    organization?: string; // Section "Organisation et structure interne"
    languages?: string; // Section "Langues et sous-familles"
    culture?: string; // Section "Culture, rites et traditions"
    historicalRole?: string; // Section "Rôle historique et interactions régionales"
    globalDemography?: {
      totalPopulation: number;
      distributionByCountry: Array<{
        countryId: string; // ISO code
        population: number;
        percentage?: number;
      }>;
      year: number;
      source: string;
    };
  };
}
```

---

## 2.5. Démographie

```ts
interface CountryPopulation {
  id: string;
  countryId: string; // ISO 3166-1 alpha-3
  year: number;
  population: number;
  source: string;
}

interface PeopleGlobalDemography {
  id: string;
  peopleId: string; // PPL_xxxxx
  year: number;
  totalPopulation: number;
  source: string;
}

interface PeopleInCountry {
  id: string;
  peopleId: string; // PPL_xxxxx
  countryId: string; // ISO 3166-1 alpha-3
  year: number;
  regionWithinCountry?: string;
  population: number;
  percentageInCountry: number;
  percentageInAfrica: number;
  source: string;
}

interface LanguageFamilyStats {
  id: string;
  familyId: string; // FLG_xxxxx
  year: number;
  totalSpeakers: number;
  source: string;
}
```

---

## 2.6. Table transversale des Noms (cœur du site)

```ts
type NamedEntityType = "country" | "people" | "language" | "family";

type NameType =
  | "auto_appellation"
  | "exonym"
  | "colonial"
  | "administrative"
  | "academic"
  | "historical_variant";

interface NameRecord {
  id: string;
  entityType: NamedEntityType;
  entityId: string; // DZA, PPL_xxxxx, FLG_xxxxx, ISO 639-3
  label: string;
  languageOfLabel?: string; // "fr", "en", "ar", etc.
  period?: string; // "Antiquité", "Colonial", "Contemporain"...
  type: NameType;
  meaning?: string;
  originStory?: string;
  isPejorative?: boolean;
  notesOnProblematicUsage?: string;
}
```

---

# 3. Fonctionnalités & refonte / migration

Tu dois penser en termes de **refonte + migration**, pas de projet from scratch.

## 3.1. Tâches attendues

1. **Analyser le code existant** :
   - schéma actuel de la base (Supabase/PostgreSQL)
   - composants principaux
   - pages existantes et leurs routes
   - endpoints API existants (`/api/countries`, `/api/ethnicities` → à remplacer par `/api/peoples`)

2. **Concevoir le nouveau schéma** (Prisma) basé sur les interfaces ci-dessus.

3. **Planifier une migration des données** :
   - Parser les fichiers TXT depuis `/dataset/source/afrik/`
   - Extraire les identifiants (FLG*, PPL*, ISO codes)
   - Créer les relations (peuples ↔ pays, peuples ↔ familles linguistiques)
   - Migrer les CSV démographiques depuis `/dataset/source/afrik/peuples/*.csv` et `/dataset/source/afrik/famille_linguistique/*.csv`
   - Scripts de migration (ou notes de migration si manuel)
   - Gestion des champs obsolètes (les supprimer proprement)

4. **Refactorer l'API** :
   - `/api/countries` + `/api/countries/[id]`
   - `/api/peoples` + `/api/peoples/[id]` (remplacer `/api/ethnicities`)
   - `/api/languages` + `/api/languages/[id]`
   - `/api/families` + `/api/families/[id]`
   - `/api/names` + `/api/names/[id]`
   - `/api/search`

5. **Refactorer / créer les pages de base du MVP** :
   - `/` (accueil avec 3 portes)
   - `/peuples-et-pays`
   - `/pays` + `/pays/[id]`
   - `/peuples` + `/peuples/[id]`
   - `/langues` + `/langues/[id]`
   - `/familles-linguistiques` + `/familles-linguistiques/[id]`
   - `/noms` + `/noms/[id]`

6. **Supprimer ou adapter le code inutile** :
   - anciens modèles ou tables qui ne correspondent plus à la vision AFRIK,
   - anciennes routes `/ethnies` (remplacer par `/peuples`),
   - endpoints `/api/ethnicities` (remplacer par `/api/peoples`),
   - composants non utilisés.

Documente dans le code (ou en README) ce que tu supprimes ou renommes.

---

# 4. Ce que j'attends concrètement de toi dans Cursor

1. Proposer une **structure de dossier Next.js** (`app/`, `lib/`, `components/`, `prisma/`) adaptée à ce plan.
2. Générer ou refactorer le **schéma Prisma** en fonction des interfaces ci-dessus.
3. Créer un plan de **migration des données** depuis `/dataset/source/afrik/` vers la base de données.
4. Implémenter les **routes API** et les **pages principales** du MVP refondu.
5. Nettoyer l'existant (code, schémas, pages) qui n'est plus aligné avec cette vision AFRIK.

Tu peux commencer par :

- Inspecter le schéma actuel.
- Proposer le nouveau schéma Prisma.
- Créer la migration.
- Mettre en place les premières pages (`/`, `/peuples-et-pays`, `/pays`, `/pays/[id]`, `/noms`, `/noms/[id]`).
