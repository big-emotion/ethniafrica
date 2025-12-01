# Instructions pour l'enrichissement des ethnies avec Browserbase

## Workflow complet

### 1. Préparation

```bash
# Générer la liste des ethnies à enrichir
npx tsx scripts/selectEthniesToEnrich.ts

# Préparer les batches
npx tsx scripts/enrichEthniesWithBrowserbase.ts
```

### 2. Enrichissement avec Browserbase (à faire manuellement pour chaque ethnie ou batch)

Pour chaque ethnie, utiliser les outils Browserbase MCP :

1. **Créer une session Browserbase**

   ```
   browserbase_session_create
   ```

2. **Naviguer vers Glottolog**

   ```
   browserbase_stagehand_navigate https://glottolog.org/resource/languoid/id/[GLOTTOCODE]
   ```

   Ou rechercher : `https://glottolog.org/resource/languoid/id/luba1250` (exemple pour Luba)

3. **Extraire les données Glottolog**

   ```
   browserbase_stagehand_extract
   Instruction: "Extract language information: ISO 639-3 code, language family classification, geographic location (countries/regions), auto-appellation, and any historical information about the ethnic group"
   ```

4. **Naviguer vers Ethnologue (SIL)**

   ```
   browserbase_stagehand_navigate https://www.ethnologue.com/language/[ISO_CODE]
   ```

5. **Extraire les données Ethnologue**

   ```
   browserbase_stagehand_extract
   Instruction: "Extract language information: ISO 639-3 code, language family, geographic distribution, auto-appellation, and speaker population information (qualitative only, no exact numbers)"
   ```

6. **Naviguer vers UNESCO (si nécessaire)**

   ```
   browserbase_stagehand_navigate https://www.unesco.org/en/search?q=[ETHNIE_NAME] africa
   ```

7. **Extraire les données UNESCO**

   ```
   browserbase_stagehand_extract
   Instruction: "Extract any cultural, linguistic, or historical information about this ethnic group"
   ```

8. **Sauvegarder les données dans le cache**
   Créer un fichier JSON dans `dataset/source/afrik/ethnies/_cache_enrichissement/[ETH_ID].json` avec la structure :

   ```json
   {
     "ETH_ID": "ETH_XXX",
     "timestamp": "2025-01-XX",
     "sources": {
       "glottolog": {
         "url": "...",
         "data": { ... },
         "timestamp": "...",
         "success": true
       },
       "ethnologue": { ... },
       "unesco": { ... }
     }
   }
   ```

9. **Fermer la session Browserbase**
   ```
   browserbase_session_close
   ```

### 3. Consolidation des données

```bash
npx tsx scripts/consolidateEthnieData.ts
```

Ce script :

- Lit tous les fichiers JSON du cache
- Applique les règles de consolidation (2 sources minimum pour codes ISO, pays, etc.)
- Génère les données consolidées
- Met à jour les fichiers JSON du cache

### 4. Mise à jour des fichiers ETH\_\*.txt

```bash
npx tsx scripts/updateEthnieFiles.ts
```

Ce script :

- Lit les données consolidées du cache
- Met à jour les fichiers ETH\_\*.txt avec les nouvelles informations
- Respecte strictement le modèle `modele-ethnie.txt`
- Ne remplit QUE les champs autorisés à l'étape 4 (pas de démographie)

### 5. Vérification et logs

Vérifier les logs dans `dataset/source/afrik/ethnies/_logs_enrichissement/` pour chaque batch.

## Règles de consolidation

- **Codes ISO 639-3** : nécessitent au moins 2 sources concordantes
- **Famille linguistique** : priorité Glottolog > Ethnologue > UNESCO
- **Pays principaux** : nécessitent au moins 2 sources concordantes
- **Résumé historique** : une source académique forte suffit
- **Auto-appellation** : priorité Glottolog > Ethnologue
- **Exonymes** : une source académique suffit, mais doit être contextualisée

## Champs autorisés à l'étape 4

✅ **Autorisés** :

- Langue principale, code ISO 639-3, famille linguistique
- Aire géographique (qualitative, sans chiffres)
- Résumé historique (2-4 phrases)
- Origine du nom, auto-appellation, exonymes contextualisés
- Relation au peuple-mère

❌ **Interdits** (étape 7 uniquement) :

- Populations totales
- Répartitions par pays (chiffrées)
- Pourcentages
- Données démographiques CSV

## Sources autorisées

- Glottolog (https://glottolog.org)
- Ethnologue (SIL) (https://www.ethnologue.com)
- UNESCO (https://www.unesco.org)
- CIA World Factbook (https://www.cia.gov/the-world-factbook/) - limité
- IWGIA, ASCL Leiden, Google Scholar (sources académiques)

**Note** : Joshua Project n'est PAS une source valide.
