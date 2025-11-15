# Dictionnaire des Ethnies d'Afrique

Une application web open source pour explorer les peuples d'Afrique par région, pays et groupe ethnique, avec des statistiques de population claires et une interface pensée pour desktop et mobile.

**Version actuelle : v1.1.0**

Page "À propos" disponible sur `/about` ou `/{lang}/about` (ex. `/fr/about`, `/en/about`).

## Liens utiles

- À propos / Contexte: `/{lang}/about` (ex. `/fr/about`, `/en/about`)
- Contribuer: `/{lang}/contribute` - Documentation API, téléchargement de données, contribution GitHub
- Signaler une erreur: `/{lang}/report-error` - Formulaire pour signaler des erreurs dans les données
- Dépôt GitHub: https://github.com/big-emotion/ethniafrica

## Fonctionnalités

### Navigation et structure

- **Pages dédiées** : Régions, Pays et Ethnies ont chacune leur propre page avec URL localisée (ex. `/fr/regions`, `/en/countries`)
- **Navigation desktop** : Barre de menu fixe en haut avec accès direct à toutes les sections (Accueil, Régions, Pays, Ethnies, À propos, Contribuer, Signaler une erreur)
- **Navigation mobile** : Menu burger avec accès rapide à toutes les pages et à la recherche
- **URLs localisées** : Chaque langue a ses propres URLs (ex. `/fr/regions`, `/en/regions`, `/es/regiones`, `/pt/regioes`)

### Page d'accueil

- **Statistiques** : Affichage de 4 cartes statistiques (Population totale, Total Régions, Total Pays, Total Groupes ethniques) récupérées depuis l'API
- **Synthèse** : Message de présentation du projet et de son contenu
- **Recherche** : Barre de recherche intégrée sur la page d'accueil
- **Accès direct** : 3 boutons CTA (Ethnies, Pays, Régions) positionnés sous les statistiques pour accéder rapidement aux pages principales

### Exploration des données

- **Vue détaillée** : Résumé synthétique, populations et pourcentages pour chaque région, pays ou ethnie
- **Tri des tableaux** : Toutes les colonnes sont triables (nom, population, pourcentages) pour faciliter l'analyse
- **Pagination intelligente** : La pagination des tableaux se réinitialise automatiquement lors du changement de pays, région ou ethnie
- **Recherche** : Recherche globale (desktop et mobile) + navigation alphabétique
- **Partage social** : Bouton de partage pour les pages détaillées (Facebook, Twitter, LinkedIn, copie de lien, Web Share API)

### Expérience utilisateur

- **Bouton retour** : Disponible en desktop et mobile pour revenir à la liste après consultation d'un détail
- **Recherche mobile** : Accessible depuis le menu burger
- **Logo** : Intégré dans la navigation et sur la page d'accueil
- **Responsive** : Interface optimisée pour mobile et desktop

### Multilingue

- **4 langues** : français, anglais, espagnol, portugais
- **Page "À propos"** : Contenu complet avec section "Sources" (bibliographie exhaustive) dans toutes les langues
- **Page "Contribuer"** : Documentation API, téléchargement de données (CSV/Excel), formulaire de contact, lien GitHub
- **Page "Signaler une erreur"** : Formulaire dédié pour signaler des erreurs dans les données
- **Traductions** : Toutes les interfaces et contenus sont traduits

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (React Query)
- Swagger/OpenAPI pour la documentation API
- Supabase (PostgreSQL) pour le backend et les contributions

## Démarrer en local

Prérequis: Node.js 18+ et npm.

```bash
npm install
# Copier le fichier d'environnement
cp env.dist .env.local
# Configurer les variables d'environnement dans .env.local
# (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.)

# Lancer le serveur de développement
npm run dev
```

L'application démarre sur http://localhost:3000.

### Variables d'environnement

Copiez `env.dist` vers `.env.local` et configurez :

- `NEXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service Supabase (pour les opérations admin)
- `ADMIN_USERNAME` : Nom d'utilisateur pour l'interface admin
- `ADMIN_PASSWORD` : Mot de passe pour l'interface admin

## API publique

L'application expose une API REST publique pour accéder aux données démographiques et ethniques de l'Afrique.

### Documentation interactive

- **Swagger UI** : `/docs/api` - Interface interactive pour explorer et tester l'API
- **OpenAPI Spec** : `/api/docs` (JSON) - Spécification OpenAPI au format JSON

### Navigation localisée (frontend)

`{lang}` ∈ `{en, fr, es, pt}`

- Listes : `/{lang}/regions`, `/{lang}/pays|countries|paises`, `/{lang}/ethnies|ethnicities|etnias`
- Détails pays : `/{lang}/{slugPays}/{nom_du_pays}` &rarr; ex. `/fr/pays/Rwanda`
- Détails régions : `/{lang}/{slugRegions}/{cle_de_region}` &rarr; ex. `/fr/regions/afrique_centrale`
- Détails ethnies : `/{lang}/{slugEthnies}/{nom_de_l_ethnie}` &rarr; ex. `/pt/etnias/Yoruba`

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

- `GET /api/download?format=csv` - Télécharge toutes les données en format CSV (ZIP) avec **tous les champs enrichis**
- `GET /api/download?format=excel` - Télécharge toutes les données en format Excel (XLSX) avec **tous les champs enrichis**

Les exports incluent désormais tous les champs enrichis :

- Colonnes de base : `Group`, `Sub_group`, `Population_2025`, `Percentage_in_country`, `Percentage_in_Africa`
- Colonnes enrichies : `Language`, `Region`, `Sources`, `Ancient_Name`, `Description`, `Type_de_societe`, `Religion`, `Famille_linguistique`, `Statut_historique`, `Presence_regionale`

> Documentation détaillée : `docs/API_ROUTES.md`

### Exemples d'utilisation

```bash
# Statistiques globales
curl http://localhost:3000/api/stats

# Liste des régions
curl http://localhost:3000/api/regions

# Détails d'une région
curl http://localhost:3000/api/regions/afrique_du_nord

# Pays d'une région
curl http://localhost:3000/api/regions/afrique_du_nord/countries

# Liste des pays
curl http://localhost:3000/api/countries

# Détails d'un pays (encoder les caractères spéciaux)
curl http://localhost:3000/api/countries/Maroc
curl "http://localhost:3000/api/countries/Côte%20d'Ivoire"

# Liste des ethnies
curl http://localhost:3000/api/ethnicities

# Détails d'une ethnie
curl http://localhost:3000/api/ethnicities/Arabes

# Télécharger toutes les données (CSV)
curl http://localhost:3000/api/download?format=csv -o data.zip

# Télécharger toutes les données (Excel)
curl http://localhost:3000/api/download?format=excel -o data.xlsx
```

### Format des réponses

Toutes les réponses sont au format JSON avec les codes HTTP standards :

- `200` - Succès
- `404` - Ressource non trouvée
- `500` - Erreur serveur

### Encodage des paramètres

Les noms de pays et d'ethnies avec caractères spéciaux doivent être encodés en URL :

- `Côte d'Ivoire` → `Côte%20d'Ivoire`
- `São Tomé-et-Principe` → `São%20Tomé-et-Principe`

## Pages supplémentaires

### Page "Contribuer" (`/{lang}/contribute`)

Page dédiée à la contribution au projet avec :

- **Documentation API** : Lien vers la documentation interactive Swagger UI
- **Téléchargement de données** : Boutons pour télécharger toutes les données en CSV (ZIP) ou Excel
- **Contribution GitHub** : Lien vers le dépôt pour contribuer au code
- **Formulaire de contribution** : Formulaire pour ajouter ou modifier des groupes ethniques (JSON ou formulaire direct)

### Page "Signaler une erreur" (`/{lang}/report-error`)

Page dédiée au signalement d'erreurs dans les données avec :

- **Explication** : Information sur la provenance des données et l'importance des corrections
- **Formulaire Typeform** : Formulaire dédié pour signaler des erreurs, informations manquantes ou douteuses

### Page "À propos" (`/{lang}/about`)

Page d'information sur le projet avec :

- **À propos du projet** : Présentation du dictionnaire et de ses objectifs
- **Sources** : Bibliographie complète organisée par type (Sources internationales, Sources par région, Sources académiques, Sources complémentaires)

## Contact

Vous pouvez nous contacter via :

- **Formulaire de contribution** : Page `/{lang}/contribute`
- **Signalement d'erreur** : Page `/{lang}/report-error`

## Structure des données

Les données sont stockées dans Supabase (PostgreSQL) et chargées dynamiquement par l'application. **L'application ne charge plus de données depuis des fichiers CSV statiques** - toutes les données proviennent de la base de données Supabase.

### Organisation des fichiers sources

Les fichiers sources CSV (format enrichi ou legacy) et les fichiers de description sont organisés par région puis par pays pour la migration des données :

```
dataset/
  source/
    afrique_de_l_ouest/
      benin/
        benin_ethnies_complet.csv
        benin.txt
      senegal/
        senegal_ethnies_complet.csv
        senegal.txt
      ...
    afrique_centrale/
      cameroun/
        cameroun_ethnies_complet.csv
        cameroun.txt
      ...
    [autres régions...]
```

### Données enrichies

L'application supporte deux formats de fichiers CSV :

- **Format enrichi (recommandé)** : `{country}_ethnies_complet.csv` avec 15 colonnes incluant langues, descriptions, informations culturelles, etc.
- **Format legacy** : `groupes_ethniques.csv` avec 4 colonnes de base (compatibilité avec les anciens fichiers)

Le script de parsing détecte automatiquement le format et normalise les données vers la même structure. Le format legacy est supporté pour la compatibilité, mais le format enrichi est recommandé pour bénéficier de toutes les fonctionnalités.

L'application supporte désormais des données enrichies pour les pays et les groupes ethniques :

- **Pays** : descriptions, anciens noms (max 3)
- **Groupes ethniques** : descriptions, anciens noms (max 3), type de société, religion, famille linguistique, statut historique, présence régionale
- **Relations hiérarchiques** : support des groupes parent/sous-groupes ethniques
- **Langues** : association des langues aux groupes ethniques avec indicateur de langue primaire
- **Sources** : association des sources de données aux groupes ethniques

### Migration des données

Pour mettre à jour les données dans la base de données :

1. Placer les fichiers CSV dans `dataset/source/{region}/{country}/` :
   - Format enrichi : `{country}_ethnies_complet.csv` (recommandé)
   - Format legacy : `groupes_ethniques.csv` (compatibilité)
2. Placer les fichiers de description (`.txt`) dans le même dossier
3. Exécuter les scripts de parsing et migration :
   ```bash
   tsx scripts/parseEnrichedCountryCSV.ts
   tsx scripts/parseCountryDescriptions.ts
   tsx scripts/matchCSVAndDescriptions.ts
   tsx scripts/migrateEnrichedData.ts
   ```

> Documentation complète : `docs/DATA_MIGRATION.md`

### Déploiement

Pour déployer la nouvelle version avec les données enrichies :

> Guide complet : `docs/DEPLOYMENT.md`

**Résumé rapide** :

1. Appliquer les migrations SQL (`001_initial_schema.sql` puis `002_add_enriched_fields.sql`)
2. Configurer les variables d'environnement Supabase
3. Exécuter les scripts de migration des données
4. Déployer l'application

## Contribuer

Les contributions sont bienvenues: fichiers CSV, corrections, nouvelles sources, UI/UX, refacto, etc.

- **Page dédiée** : `/{lang}/contribute` - Toutes les informations pour contribuer
- **Dépôt GitHub** : https://github.com/big-emotion/ethniafrica
- **Documentation API** : `/docs/api` - Pour utiliser les données programmatiquement
- **Téléchargement de données** : `/api/download?format=csv` ou `/api/download?format=excel`

Merci de:

- Respecter la structure des CSV enrichis et l'encodage (guillemets, apostrophes)
- Suivre le guide de migration des données dans `docs/DATA_MIGRATION.md`
- Signaler les erreurs via la page `/{lang}/report-error`

## Roadmap (extraits)

- Carte interactive des zones de présence
- Fiches enrichies: sous‑ethnies, histoire, culture, religions et croyances, royaumes et personnalités, langues, sciences et arts
- Ajout progressif de contenus en langues africaines

## Interface Admin

L'application dispose d'une interface d'administration pour modérer les contributions :

- **Page de login** : `/admin/login` - Authentification par username/password
- **Gestion des contributions** : `/admin/contributions` - Liste et modération des contributions en attente
- **Sécurité** : Authentification par session avec cookies httpOnly et sécurisés

### Configuration admin

Configurez les variables d'environnement dans `.env.local` :

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
```

## Changelog

### v1.3.0 (2025-01-XX)

- **Données enrichies** : Ajout de descriptions, anciens noms, informations culturelles (religion, type de société, famille linguistique, statut historique) pour les pays et groupes ethniques
- **Groupes hiérarchiques** : Support des groupes parent/sous-groupes ethniques avec relations `parent_id`
- **Vues détaillées enrichies** : Affichage des top 5 ethnies/langues, anciens noms, descriptions complètes avec CTAs "Voir plus"
- **Migration par pays** : Passage d'une structure par région à une structure par pays pour les fichiers sources CSV
- **Suppression du chargement CSV** : L'application charge désormais toutes les données depuis Supabase uniquement
- **Export enrichi** : Les exports CSV/Excel incluent tous les nouveaux champs enrichis

### v1.2.0 (2025-01-XX)

- **Backend Supabase** : Intégration complète de Supabase pour le stockage des données
- **Système de contributions** : Formulaire de contribution pour ajouter/modifier des groupes ethniques
- **Interface admin** : Page d'administration sécurisée pour modérer les contributions
- **Authentification admin** : Système d'authentification par username/password avec sessions sécurisées
- **Cache optimisé** : Mise en cache côté client (localStorage) et serveur pour améliorer les performances
- **Navigation hiérarchique** : Navigation améliorée avec sélection et surbrillance des éléments
- **Traductions** : Système de traduction pour les noms d'entités (régions, pays, ethnies)
- **Clés normalisées** : URLs utilisant des clés normalisées pour une meilleure compatibilité

### v1.1.0 (2025-01-XX)

- **Documentation API améliorée** : Interface Swagger UI plus ergonomique avec liens rapides, introduction et design cohérent
- **Configuration OpenAPI dynamique** : Support automatique des URLs de production (Vercel) et développement
- **Optimisation Typeform** : Amélioration du temps de chargement avec preconnect et stratégie afterInteractive
- **Améliorations UX** : Meilleure organisation de la page de documentation API

### v1.0.0

- Version initiale avec toutes les fonctionnalités de base

## Licence

Open source — voir le dépôt GitHub.
