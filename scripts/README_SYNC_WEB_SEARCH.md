# Script de synchronisation peuples avec recherche web

## Description

Ce script synchronise les peuples réels trouvés sur internet avec les peuples documentés dans les fiches pays. Il utilise **web_search** pour trouver tous les peuples d'un pays, compare avec les peuples déjà documentés, affiche un résumé, et crée uniquement les fiches manquantes.

## Architecture

Le script est composé de deux fichiers :

1. **`syncPeuplesWithWebSearch.ts`** : Script principal avec toute la logique
2. **`syncPeuplesWithWebSearchAgent.ts`** : Wrapper pour exécution par l'agent avec accès à web_search

## Utilisation par l'agent

L'agent doit exécuter le script de cette manière :

### Pour un pays spécifique

```typescript
// 1. Lire le CSV de suivi
const countries = readTrackingCSV();
const country = countries.find((c) => c.code === "COD");

// 2. Appeler web_search pour chaque requête
const searchQueries = [
  `liste complète groupes ethniques peuples ${country.nom}`,
  `ethnic groups ${country.nom} complete list`,
  // ... autres requêtes
];

const allResults: string[] = [];
for (const query of searchQueries) {
  const result = await web_search(query);
  allResults.push(result.content || result);
}

// 3. Sauvegarder les résultats
import { setSearchResults } from "./syncPeuplesWithWebSearch";
setSearchResults(country.code, country.nom, allResults);

// 4. Exécuter le script principal
// Le script utilisera les résultats en cache
```

### Workflow complet

1. **Lire CSV de suivi** : `readTrackingCSV()`
2. **Pour chaque pays** :
   - Appeler `web_search` avec les requêtes
   - Parser les résultats avec `parseWebSearchResults()`
   - Sauvegarder avec `setSearchResults()`
   - Exécuter `syncCountry()` qui utilisera le cache
3. **Pour chaque peuple manquant** :
   - Appeler `web_search` pour enrichir
   - Sauvegarder avec `setEnrichmentResults()`
   - Créer la fiche

## Fonctionnalités

- ✅ Recherche web exhaustive des peuples réels
- ✅ Comparaison avec peuples documentés
- ✅ Résumé simple avant création
- ✅ Création uniquement des fiches manquantes (ne jamais écraser)
- ✅ Gestion des hiérarchies parent/enfant
- ✅ Mise à jour automatique du CSV de suivi

## Options CLI

```bash
# Un pays
npx tsx scripts/syncPeuplesWithWebSearch.ts --country COD

# Tous les pays
npx tsx scripts/syncPeuplesWithWebSearch.ts --all

# Par priorité
npx tsx scripts/syncPeuplesWithWebSearch.ts --priority CRITIQUE

# Mode dry-run (afficher sans créer)
npx tsx scripts/syncPeuplesWithWebSearch.ts --country COD --dry-run

# Mode interactif (demander validation)
npx tsx scripts/syncPeuplesWithWebSearch.ts --country COD --interactive
```

## Gestion des hiérarchies

Le script détecte automatiquement les relations parent/enfant :

- "X est un sous-groupe de Y"
- "X appartient à Y"
- "clan de Y"

Lors de la création :

- Fiche enfant : mentionne le parent
- Fiche parent : ajoute l'enfant dans "Ethnies incluses"

## Fichiers générés

- Cache : `dataset/source/afrik/logs/_cache_web_search/[CODE].json`
- Fiches créées : `dataset/source/afrik/peuples/FLG_[FAMILLE]/PPL_[ID].txt`
- CSV mis à jour : `dataset/source/afrik/logs/peuples_reels_par_pays.csv`
