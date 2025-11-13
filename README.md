# Dictionnaire des Ethnies d’Afrique

Une application web open source pour explorer les peuples d’Afrique par région, pays et groupe ethnique, avec des statistiques de population claires et une interface pensée pour desktop et mobile.

Page "À propos" disponible sur `/about` ou `/{lang}/about` (ex. `/fr/about`, `/en/about`).

## Liens utiles

- À propos / Contexte / Participation: `/about`
- Dépôt GitHub: https://github.com/big-emotion/ethniafrique-atlas

## Fonctionnalités

### Navigation et structure

- **Pages dédiées** : Régions, Pays et Ethnies ont chacune leur propre page avec URL localisée (ex. `/fr/regions`, `/en/countries`)
- **Navigation desktop** : Barre de menu fixe en haut avec accès direct à toutes les sections (Accueil, Régions, Pays, Ethnies, À propos)
- **Navigation mobile** : Menu burger avec accès rapide à toutes les pages et à la recherche
- **URLs localisées** : Chaque langue a ses propres URLs (ex. `/fr/regions`, `/en/regions`, `/es/regiones`, `/pt/regioes`)

### Page d'accueil

- **Statistiques** : Affichage de la population totale de l'Afrique (calculée depuis les données)
- **Synthèse** : Message de présentation du projet et de son contenu
- **Accès direct** : 3 boutons CTA pour accéder rapidement aux pages principales
- **Recherche desktop** : Barre de recherche intégrée sur la page d'accueil

### Exploration des données

- **Vue détaillée** : Résumé synthétique, populations et pourcentages pour chaque région, pays ou ethnie
- **Tri des tableaux** : Toutes les colonnes sont triables (nom, population, pourcentages) pour faciliter l'analyse
- **Recherche** : Recherche globale (desktop et mobile) + navigation alphabétique
- **Partage social** : Bouton de partage pour les pages détaillées (Facebook, Twitter, LinkedIn, copie de lien, Web Share API)

### Expérience utilisateur

- **Bouton retour** : Disponible en desktop et mobile pour revenir à la liste après consultation d'un détail
- **Recherche mobile** : Accessible depuis le menu burger
- **Logo** : Intégré dans la navigation et sur la page d'accueil
- **Responsive** : Interface optimisée pour mobile et desktop

### Multilingue

- **4 langues** : français, anglais, espagnol, portugais
- **Page "À propos"** : Contenu complet avec formulaire de contact dans toutes les langues
- **Traductions** : Toutes les interfaces et contenus sont traduits

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (React Query)

## Démarrer en local

Prérequis: Node.js 18+ et npm.

```bash
npm install
# Générer les données à partir des CSV sources
npm run parse-dataset
# Lancer le serveur de développement
npm run dev
```

L’application démarre sur http://localhost:3000.

## Contact

Vous pouvez me contacter via le formulaire présent sur la page `/about` ou `/{lang}/about` (Typeform intégré).

## Données et pipeline

- CSV sources: `dataset/source/*.csv`
- Script de parsing: `scripts/parseDataset.ts`
  - Agrège et calcule les totaux et pourcentages (pays, régions, continent)
  - Produit `dataset/result/**` et `dataset/result/index.json`
  - Copie automatiquement la sortie dans `public/dataset/**` pour l’application
- Chargement côté app: `src/lib/datasetLoader.ts`

Sortie (extrait):

```
public/dataset/
  index.json
  afrique_du_nord/Maroc/groupes_ethniques.csv
  ...
```

## Contribuer

Les contributions sont bienvenues: fichiers CSV, corrections, nouvelles sources, UI/UX, refacto, etc.

- Dépôt: https://github.com/big-emotion/ethniafrique-atlas
- Contexte & liens: `/about`

Merci de:

- Respecter la structure des CSV et l’encodage (guillemets, apostrophes)
- Lancer `npm run parse-dataset` après modification des sources

## Roadmap (extraits)

- Carte interactive des zones de présence
- Fiches enrichies: sous‑ethnies, histoire, culture, religions et croyances, royaumes et personnalités, langues, sciences et arts
- Ajout progressif de contenus en langues africaines

## Licence

Open source — voir le dépôt GitHub.
