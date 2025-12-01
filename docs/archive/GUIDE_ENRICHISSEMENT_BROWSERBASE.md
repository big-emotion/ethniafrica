# Guide d'enrichissement des ethnies avec Browserbase MCP

## Vue d'ensemble

Ce guide explique comment utiliser Browserbase MCP pour enrichir automatiquement les fiches ethnies (`ETH_*.txt`) en collectant des données depuis les sources autorisées.

## Workflow complet

### 1. Identifier les ethnies à enrichir

```bash
npx tsx scripts/enrichEthniesAutomated.ts
```

Ce script liste les ethnies qui n'ont pas encore de cache consolidé.

### 2. Enrichir avec Browserbase MCP

Pour chaque ethnie, utiliser Browserbase MCP pour :

1. **Glottolog** : Naviguer vers `https://glottolog.org/resource/languoid/id/[GLOTTOCODE]` ou rechercher par nom
2. **Ethnologue (SIL)** : Naviguer vers `https://www.ethnologue.com/language/[CODE_ISO]` ou rechercher par nom
3. **UNESCO** : Rechercher via `https://www.unesco.org/en/search?q=[NOM_ETHNIE]%20africa`
4. **CIA World Factbook** : Si disponible pour le pays concerné

### 3. Sauvegarder dans le cache

Créer un fichier JSON dans `dataset/source/afrik/ethnies/_cache_enrichissement/[ETH_ID].json` avec la structure :

```json
{
  "ETH_ID": "ETH_XXX",
  "timestamp": "2025-01-25T22:00:00Z",
  "sources": {
    "glottolog": {
      "url": "https://glottolog.org/...",
      "data": {
        "langue": "...",
        "code_iso": "...",
        "famille": "...",
        "pays": ["..."],
        "region": "...",
        "glottocode": "...",
        "auto_appellation": "..."
      },
      "timestamp": "2025-01-25T22:00:00Z",
      "success": true
    },
    "ethnologue": {
      "url": "https://www.ethnologue.com/...",
      "data": {
        "langue": "...",
        "code_iso": "...",
        "famille": "...",
        "pays": ["..."],
        "auto_appellation": "..."
      },
      "timestamp": "2025-01-25T22:00:00Z",
      "success": true
    }
  }
}
```

### 4. Consolider les données

```bash
npx tsx scripts/consolidateEthnieData.ts
```

Ce script :

- Lit tous les fichiers JSON du cache
- Applique les règles de consolidation (2 sources minimum pour données quantitatives)
- Génère les données consolidées dans chaque fichier cache

### 5. Mettre à jour les fichiers ETH\_\*.txt

```bash
npx tsx scripts/updateEthnieFiles.ts
```

Ce script :

- Lit les données consolidées du cache
- Met à jour les sections autorisées de chaque `ETH_*.txt`
- Respecte strictement `modele-ethnie.txt`
- Met à jour la section Sources

### 6. Générer le rapport

```bash
npx tsx scripts/generateEnrichmentReport.ts
```

Génère `docs/RAPPORT_ETHNIES_ENRICHIES_ETAPE4.md` avec :

- Nombre d'ethnies enrichies
- Statistiques par source
- Liste des ethnies enrichies
- Prochaines étapes

## Utilisation de Browserbase MCP

### Créer une session

Utiliser l'outil `browserbase_session_create` pour créer une session de navigateur cloud.

### Naviguer vers une source

Utiliser `browserbase_stagehand_navigate` avec l'URL de la source.

### Extraire des données

Utiliser `browserbase_stagehand_extract` avec une instruction claire décrivant les données à extraire.

**Exemple pour Glottolog** :

```
Extract from this Glottolog page: ISO 639-3 code, complete language family classification (full path from root), countries/regions where the language is spoken, auto-appellation (endonym), and glottocode. Return as structured JSON with fields: code_iso, famille, pays (array), region, auto_appellation, glottocode.
```

**Exemple pour Ethnologue** :

```
Extract from this Ethnologue page: language name, ISO 639-3 code, language family, countries where spoken, and auto-appellation. Return as structured JSON with fields: langue, code_iso, famille, pays (array), auto_appellation.
```

### Observer la page

Si nécessaire, utiliser `browserbase_stagehand_observe` pour identifier les éléments interactifs avant extraction.

### Interagir avec la page

Si une page nécessite une interaction (recherche, clic), utiliser `browserbase_stagehand_act`.

### Fermer la session

Toujours fermer la session avec `browserbase_session_close` après chaque batch ou ethnie.

## Traitement par batch

Pour traiter plusieurs ethnies efficacement :

1. Grouper les ethnies par famille linguistique (FLG_ID)
2. Créer une session Browserbase pour le batch
3. Traiter toutes les ethnies du batch en séquence
4. Sauvegarder les données brutes dans le cache
5. Fermer la session à la fin du batch

## Sources autorisées

- **Glottolog** : https://glottolog.org (priorité 1)
- **Ethnologue (SIL)** : https://www.ethnologue.com (priorité 2)
- **UNESCO** : https://www.unesco.org (priorité 3)
- **CIA World Factbook** : https://www.cia.gov/the-world-factbook/ (priorité 5)
- **Sources académiques** : Google Scholar, ASCL Leiden, IWGIA, etc.

## Champs à enrichir (Étape 4)

### Autorisés :

- Métadonnées linguistiques (langue, ISO, famille)
- Aire géographique générale (pays, régions)
- Résumé historique (2-4 phrases)
- Auto-appellation et exonymes contextualisés
- Sources utilisées

### Interdits :

- Toute donnée démographique chiffrée (réservée à l'étape 7)
- Populations, pourcentages, répartitions quantitatives

## Dépannage

### Erreur d'extraction Browserbase

Si `browserbase_stagehand_extract` échoue :

1. Vérifier que la page est bien chargée
2. Utiliser `browserbase_stagehand_observe` pour voir la structure
3. Simplifier l'instruction d'extraction
4. Essayer une autre source

### Données manquantes

Si une source ne fournit pas de données :

1. Passer à la source suivante dans l'ordre de priorité
2. Noter l'échec dans le cache (`success: false`)
3. Continuer avec les autres sources

### Validation des données

Avant de consolider :

- Vérifier que les codes ISO 639-3 sont valides (3 lettres)
- Vérifier que les pays mentionnés existent
- Vérifier que les FLG_ID mentionnés existent dans `famille_linguistique.csv`

## Exemple complet

1. Identifier une ethnie à enrichir : `ETH_AARI_AARI_DU_NORD`
2. Créer une session Browserbase
3. Naviguer vers Glottolog : `https://glottolog.org/resource/languoid/id/aari1241`
4. Extraire les données avec `browserbase_stagehand_extract`
5. Naviguer vers Ethnologue : `https://www.ethnologue.com/language/aiw`
6. Extraire les données
7. Sauvegarder dans `_cache_enrichissement/ETH_AARI_AARI_DU_NORD.json`
8. Fermer la session Browserbase
9. Exécuter `consolidateEthnieData.ts`
10. Exécuter `updateEthnieFiles.ts`
11. Vérifier le fichier `ETH_AARI_AARI_DU_NORD.txt` mis à jour

## Prochaines étapes

Après avoir enrichi un batch d'ethnies :

1. Consolider les données
2. Mettre à jour les fichiers
3. Générer le rapport
4. Vérifier la conformité avec `modele-ethnie.txt`
5. Mettre à jour `WORKFLOW_AFRIK_STATUS.md` si nécessaire
