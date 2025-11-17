# Refonte complète du projet Afrik – Prompt pour Cursor

Tu es mon assistant développeur dans Cursor.

Le projet **existe déjà** : c’est un site Next.js autour du projet **Afrik / EthniAfrica**.  
Mais je veux faire une **refonte complète** :

- L’architecture fonctionnelle du site doit être repensée.
- Les **schémas de données doivent être complètement refaits**.
- Il faut **migrer les données existantes** vers les nouveaux schémas.
- Il ne faut pas hésiter à **supprimer tout ce qui ne sera plus utilisé** (modèles, tables, endpoints, pages), tant que c’est fait proprement et de manière cohérente.
- L’objectif est d’obtenir une base technique propre, stable, structurée pour le long terme.

Tu dois donc :

- analyser et tirer parti de l’existant,
- mais ne **PAS te laisser contraindre** par l’ancienne structure si elle n’est plus adaptée,
- proposer un schéma de données et une arborescence **clairs et modernes**, puis adapter le code.

---

# Objectif du site

Je construis un site web pédagogique autour du projet **Afrik** : un atlas des peuples, des noms, des langues et des dynamiques historiques en Afrique.

Objectifs principaux :

- Permettre de **consulter les données** (pays, peuples, ethnies, langues, familles linguistiques, démographie).
- Mettre en avant le **sens des noms** (étymologie, auto-appellations, exonymes, noms coloniaux, usages problématiques).
- Montrer les **liens et dynamiques** (migrations, influences, routes commerciales, effets de la colonisation, connexions entre peuples).
- Proposer plus tard un **espace interactif** (quiz, exploration cartographique, comparateurs).

Le site doit être **riche** mais **simple à naviguer**.

---

# Stack technique (actuelle ou cible)

- Framework : **Next.js** (App Router si possible, sinon on planifie la migration)
- Langage : **TypeScript**
- Base de données : **PostgreSQL** (si autre, adapter le plan de migration)
- ORM : idéalement **Prisma** (ou refactor de l’ORM actuel vers Prisma si pertinent)
- Style : Tailwind CSS ou équivalent moderne

Ton travail inclura :

- vérifier ce qui existe déjà dans le repo,
- proposer une nouvelle structure,
- **refactorer progressivement** vers cette structure,
- gérer la **migration des données**.

---

# 1. Arborescence du site (routes cibles)

Le site est organisé autour de **3 grandes portes** (3 “hubs”) sur la page d’accueil :

1. **Peuples & Pays**
2. **Histoire des Noms**
3. **Liens & Dynamiques**

Merci de structurer (ou refactorer) le dossier `app/` de Next.js en conséquence.

---

## 1.1. Page d’accueil

**Route :** `/`

Contenu / sections :

- Hero avec :
  - Titre : _Comprendre l’Afrique par ses peuples, ses noms et ses histoires._
  - Sous-titre expliquant le concept.
- 3 grandes cartes / boutons menant aux hubs :
  1. **Peuples & Pays**

     > Comprendre qui est qui. Peuples, ethnies, pays, langues, familles linguistiques.  
     > Lien : `/peuples-et-pays`

  2. **Histoire des Noms**

     > Comprendre pourquoi ils s’appellent ainsi. Étymologie, auto-appellations, exonymes, noms coloniaux.  
     > Lien : `/histoire-des-noms`

  3. **Liens & Dynamiques**
     > Comprendre comment tout est connecté. Migrations, influences, connexions historiques, cartes, quiz.  
     > Lien : `/liens-et-dynamiques`

- Bloc “à quoi ça sert ?” avec 2–3 paragraphes pédagogiques.
- Quelques blocs “contenu mis en avant” (ex: derniers peuples ajoutés, exemples de noms problématiques, exemples de cartes).

---

## 1.2. Hub 1 : Peuples & Pays

**Route hub :** `/peuples-et-pays`

Cette page doit proposer des cartes / liens vers :

- `/pays`
- `/peuples`
- `/ethnies`
- `/langues`
- `/familles-linguistiques`
- `/demographie`
- `/recherche`

### Pages détaillées cibles :

- `/pays` : liste des pays africains (cartes + filtre par région).
- `/pays/[id]` : fiche pays (métadonnées + texte long + peuples/ethnies principaux).
- `/peuples` : liste des peuples (PPL_xxxx).
- `/peuples/[id]` : fiche peuple (lien vers ethnies, langues, pays, contenu long).
- `/ethnies` : liste des ethnies.
- `/ethnies/[id]` : fiche ethnie.
- `/langues` : liste des langues.
- `/langues/[id]` : fiche langue.
- `/familles-linguistiques` : liste des familles linguistiques.
- `/familles-linguistiques/[id]` : fiche famille linguistique.
- `/demographie` : vue synthétique des données démographiques.
- `/recherche` : recherche globale (pays, peuples, ethnies, langues, noms).

Si des pages existantes chevauchent ces routes sous d’autres noms, les **adapter ou rediriger** au lieu de tout casser brutalement.

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

- `/noms` : “Atlas des noms” (tous les noms connus, triables/filtrables).
- `/noms/[id]` : fiche d’un nom (origine, sens, type, connotation, entités liées).
- `/etymologies` : vue plus graphique / timeline des étymologies.
- `/auto-appellations` : focus sur les auto-appellations.
- `/exonymes` : focus sur les exonymes.
- `/noms-coloniaux` : focus sur les noms imposés pendant la colonisation.

Si une partie de ces fonctionnalités existe déjà sous des formes différentes, tu peux **réutiliser le code** mais en l’adaptant à la nouvelle structure.

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

# 2. Schéma de données (nouveau modèle conceptuel)

L’ancien schéma **doit être repensé**.  
Les modèles existants peuvent être :

- migrés vers les nouveaux modèles,
- enrichis,
- ou supprimés si obsolètes.

Merci de définir un schéma **Prisma** (ou, si déjà présent, de le refactorer complètement) basé sur les entités suivantes.

**Identifiants Afrik :**

- Pays : code ISO 3166-1 alpha-3
- Famille linguistique : `FLG_xxxxx`
- Peuple : `PPL_xxxxx`
- Ethnie : `ETH_xxxxx`
- Sous-ethnie : `SUB_xxxxx`
- Clan : `CLN_xxxxx`
- Langue : ISO 639-3

---

## 2.1. Pays

```ts
interface Country {
  id: string; // ISO 3166-1 alpha-3 (ex: "DZA")
  nameFr: string;
  nameEn?: string;
  officialNameFr?: string;
  etymology: string;
  nameOriginActor?: string; // personne / peuple / administration
  region:
    | "Afrique du Nord"
    | "Afrique de l'Ouest"
    | "Afrique Centrale"
    | "Afrique de l'Est"
    | "Afrique Australe";

  contentSlug: string; // lien vers contenu long (markdown ou autre)
}
```

---

## 2.2. Famille linguistique

```ts
interface LanguageFamily {
  id: string; // FLG_xxxxx
  nameFr: string;
  nameEn?: string;
  historicalLabels: string[];
  problematicNotes?: string;
  areaDescription: string;
  estimatedLanguageCount: number;
  estimatedSpeakers: number;
}
```

---

## 2.3. Langue

```ts
interface Language {
  id: string; // ISO 639-3
  name: string;
  familyId: string; // FLG_xxxxx
  subfamily?: string; // ex: "Bantu Nguni"
  speakerCount?: number;
}
```

---

## 2.4. Peuple

```ts
interface People {
  id: string; // PPL_xxxxx
  nameMain: string;
  selfAppellation?: string;
  historicalLabels: string[];
  languageFamilyId: string; // FLG_xxxxx
  ethnoLinguisticGroup?: string; // ex: "Bantu"
  historicalRegion: string;
  currentCountries: string[]; // codes ISO

  contentSlug: string;
}
```

---

## 2.5. Ethnie / Sous-ethnie / Clan

```ts
interface EthnicGroup {
  id: string; // ETH_xxxxx
  peopleId: string; // PPL_xxxxx
  nameMain: string;
  selfAppellation?: string;
  exonyms: string[];
  colonialTerms: string[];
  languageId?: string; // ISO 639-3
  familyId?: string; // FLG_xxxxx

  contentSlug: string;
}

interface SubEthnicGroup {
  id: string; // SUB_xxxxx
  ethnicGroupId: string; // ETH_xxxxx
  name: string;
}

interface Clan {
  id: string; // CLN_xxxxx
  subEthnicGroupId?: string;
  ethnicGroupId?: string;
  name: string;
}
```

---

## 2.6. Démographie

```ts
interface CountryPopulation {
  id: string;
  countryId: string;
  year: number;
  population: number;
  source: string;
}

interface PeopleGlobalDemography {
  id: string;
  peopleId: string;
  year: number;
  totalPopulation: number;
  source: string;
}

interface EthnicGroupInCountry {
  id: string;
  ethnicGroupId: string;
  countryId: string;
  year: number;
  regionWithinCountry?: string;
  population: number;
  percentageInCountry: number;
  percentageInAfrica: number;
  source: string;
}

interface LanguageFamilyStats {
  id: string;
  familyId: string;
  year: number;
  totalSpeakers: number;
  source: string;
}
```

---

## 2.7. Table transversale des Noms (cœur du site)

```ts
type NamedEntityType =
  | "country"
  | "people"
  | "ethnic_group"
  | "language"
  | "family";
type NameType =
  | "auto_appellation"
  | "exonym"
  | "colonial"
  | "administrative"
  | "academic";

interface NameRecord {
  id: string;
  entityType: NamedEntityType;
  entityId: string; // DZA, PPL_xxxxx, ETH_xxxxx, FLG_xxxxx, ISO 639-3
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
   - schéma actuel de la base (Prisma, Sequelize, raw SQL, etc.)
   - composants principaux
   - pages existantes et leurs routes
   - endpoints API existants

2. **Concevoir le nouveau schéma** (Prisma ou équivalent) basé sur les interfaces ci-dessus.

3. **Planifier une migration des données** :
   - mapping ancien modèle → nouveau modèle,
   - scripts de migration (ou notes de migration si manuel),
   - gestion des champs obsolètes (les supprimer proprement).

4. **Refactorer l’API** :
   - `/api/countries` + `/api/countries/[id]`
   - `/api/peoples` + `/api/peoples/[id]`
   - `/api/families` + `/api/families/[id]`
   - `/api/names` + `/api/names/[id]`
   - `/api/search`

5. **Refactorer / créer les pages de base du MVP** :
   - `/` (accueil avec 3 portes)
   - `/peuples-et-pays`
   - `/pays` + `/pays/[id]`
   - `/peuples` + `/peuples/[id]`
   - `/familles-linguistiques` + `/familles-linguistiques/[id]`
   - `/noms` + `/noms/[id]`

6. **Supprimer ou adapter le code inutile** :
   - anciens modèles ou tables qui ne correspondent plus à la vision,
   - anciennes routes ou pages redondantes,
   - composants non utilisés.

Documente dans le code (ou en README) ce que tu supprimes ou renommes.

---

# 4. Ce que j’attends concrètement de toi dans Cursor

1. Proposer une **structure de dossier Next.js** (`app/`, `lib/`, `components/`, `prisma/`) adaptée à ce plan.
2. Générer ou refactorer le **schéma Prisma** en fonction des interfaces ci-dessus.
3. Créer un plan de **migration des données** (scripts ou étapes).
4. Implémenter les **routes API** et les **pages principales** du MVP refondu.
5. Nettoyer l’existant (code, schémas, pages) qui n’est plus aligné avec cette vision.

Tu peux commencer par :

- Inspecter le schéma actuel.
- Proposer le nouveau schéma Prisma.
- Créer la migration.
- Mettre en place les premières pages (`/`, `/peuples-et-pays`, `/pays`, `/pays/[id]`, `/noms`, `/noms/[id]`).
