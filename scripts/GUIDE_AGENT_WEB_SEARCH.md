# Guide pour l'agent : Utilisation du script avec web_search

## Workflow pour l'agent

Quand l'utilisateur demande de synchroniser les peuples d'un pays, l'agent doit :

### 1. Exécuter le script en mode dry-run pour voir les requêtes

```bash
npx tsx scripts/syncPeuplesWithWebSearch.ts --country COD --dry-run
```

Le script affichera les requêtes de recherche nécessaires.

### 2. Appeler web_search pour chaque requête

Pour chaque requête affichée, l'agent doit appeler `web_search` :

```typescript
// Exemple pour COD
const queries = [
  "liste complète groupes ethniques peuples République démocratique du Congo",
  "ethnic groups République démocratique du Congo complete list",
  "peuples autochtones République démocratique du Congo liste exhaustive",
  "tribus République démocratique du Congo clans ethnies",
  "indigenous peoples République démocratique du Congo list",
];

const allResults: string[] = [];
for (const query of queries) {
  const result = await web_search(query);
  allResults.push(result.content || JSON.stringify(result));
}
```

### 3. Sauvegarder les résultats dans le cache

L'agent doit utiliser la fonction `setSearchResults` du script :

```typescript
// Importer la fonction
const { setSearchResults } = require("./scripts/syncPeuplesWithWebSearch");

// Sauvegarder
setSearchResults("COD", "République démocratique du Congo", allResults);
```

### 4. Ré-exécuter le script (sans dry-run)

Maintenant que le cache est rempli, exécuter le script normalement :

```bash
npx tsx scripts/syncPeuplesWithWebSearch.ts --country COD --create-files
```

Le script utilisera les résultats en cache et créera les fiches manquantes.

### 5. Pour l'enrichissement des peuples

Quand le script demande l'enrichissement d'un peuple, l'agent doit :

```typescript
const queries = [
  "[nom peuple] origines migrations appellations [nom pays]",
  "[nom peuple] [nom pays] histoire culture",
  "[nom peuple] langue ISO 639-3",
];

const results = [];
for (const query of queries) {
  const result = await web_search(query);
  results.push(result.content || JSON.stringify(result));
}

// Sauvegarder
const { setEnrichmentResults } = require("./scripts/syncPeuplesWithWebSearch");
setEnrichmentResults("[nom peuple]", results);
```

## Exemple complet pour COD

```typescript
// 1. Dry-run pour voir les requêtes
// (exécuter via terminal)

// 2. Recherche web
const codQueries = [
  "liste complète groupes ethniques peuples République démocratique du Congo",
  "ethnic groups Democratic Republic of Congo complete list",
  "peuples autochtones RDC liste exhaustive",
  "tribus RDC clans ethnies",
  "indigenous peoples DRC list",
];

const codResults = [];
for (const query of codQueries) {
  const result = await web_search(query);
  codResults.push(result.content || JSON.stringify(result));
}

// 3. Sauvegarder
const { setSearchResults } = require("./scripts/syncPeuplesWithWebSearch");
setSearchResults("COD", "République démocratique du Congo", codResults);

// 4. Exécuter le script
// (exécuter via terminal: npx tsx scripts/syncPeuplesWithWebSearch.ts --country COD --create-files)
```

## Notes importantes

- Le script **ne jamais écraser** un fichier existant
- Les hiérarchies parent/enfant sont détectées automatiquement
- Le résumé est affiché avant création
- Le CSV de suivi est mis à jour automatiquement
