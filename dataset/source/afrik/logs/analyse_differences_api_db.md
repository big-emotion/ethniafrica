# Rapport d'analyse : Différences entre données Supabase et API v2

**Date** : 2026-01-27  
**Objet** : Analyse des différences entre les données stockées dans Supabase (`afrik_language_families`) et les données retournées par l'API v2 (`/api/v2/language-families/{id}`)

## 1. Résumé exécutif

Les données stockées dans Supabase contiennent **toutes les sections** parsées depuis les fichiers TXT, mais l'API retourne une version **incomplète** avec certaines sections manquantes ou mal formatées.

### Familles analysées

- **FLG_AFROASIATIQUE** : 8 peuples associés en DB, sections complètes
- **FLG_ATLANTIQUE** : 6 peuples associés en DB, sections complètes

## 2. Différences identifiées

### 2.1 Section `associatedPeoples`

**En base de données (Supabase)** :

```json
"associatedPeoples": [
  {"name": "Arabes", "peopleId": "PPL_ARABES_AFRIQUE"},
  {"name": "Amazighs", "peopleId": "PPL_AMAZIGH_MACRO"},
  ...
]
```

**Dans l'API** :

```json
"associatedPeoples": [
  {"name": "Wolof"},
  {"name": "Fulbe"},
  {"name": "Serer"}
]
// ❌ Pas d'IDs PPL
// ❌ Liste incomplète (3 au lieu de 6 pour ATLANTIQUE)
```

**Cause identifiée** :

- Le parser `languageFamilyParser.ts` (lignes 152-185) extrait correctement les IDs PPL depuis les fichiers TXT
- Les données sont bien stockées en base avec les IDs
- **Problème** : L'API retourne directement le JSONB sans transformation, mais les données en base semblent avoir été migrées avec une version antérieure du parser qui n'extrayait pas les IDs

**Hypothèse** : Les données en base ont été migrées **avant** que les corrections d'IDs PPL ne soient faites dans les fichiers TXT, ou avec une version du parser qui ne gérait pas correctement le format `- Peuple X : Nom (PPL_ID)`.

### 2.2 Section `linguisticCharacteristics`

**En base de données** : ✅ Présente avec tous les champs

```json
"linguisticCharacteristics": {
  "typology": "...",
  "phonologicalFeatures": "...",
  "relationsWithNeighbors": "...",
  "keyInnovations": "..."
}
```

**Dans l'API** : ❌ Absente complètement

**Cause identifiée** :

- Le parser `languageFamilyParser.ts` (lignes 187-200) parse correctement la section "3. Caractéristiques linguistiques"
- Les données sont présentes en base de données
- **Problème** : L'API retourne le JSONB tel quel, donc si la section est absente dans l'API, c'est qu'elle n'est pas dans la base

**Hypothèse** : Les données en base ont été migrées avec une version du parser qui ne gérait pas correctement les sections multilignes ou avec des formats de clés différents.

### 2.3 Section `historyAndOrigins`

**En base de données** : ✅ Présente avec tous les champs

```json
"historyAndOrigins": {
  "probableOrigin": "...",
  "emergencePeriod": "...",
  "diffusion": "...",
  "historicalBreaks": "...",
  "contactZones": "...",
  "majorEvents": "..."
}
```

**Dans l'API** : ❌ Absente complètement

**Cause identifiée** : Même problème que `linguisticCharacteristics`

### 2.4 Section `sources`

**En base de données** :

```json
"sources": [
  "Friedrich Müller...",
  "Théophile Obenga...",
  ...
]
```

**Dans l'API** :

```json
"7. Sources": {
  "Sapir, J. D. – *West Atlantic": "An Inventory..."
}
// ❌ Format différent (objet au lieu de tableau)
// ❌ Clé mal formatée
```

**Cause identifiée** :

- Le parser `languageFamilyParser.ts` (lignes 240-275) extrait les sources comme un tableau de strings
- En base, les sources sont stockées comme tableau
- **Problème** : L'API montre un format différent avec une clé "7. Sources" qui est un objet

**Hypothèse** : Le parser `parseSections` (lignes 304-409 de `parser.ts`) capture aussi les sections inconnues et les ajoute au content. La section "6. Sources" est parsée deux fois :

1. Une fois par le parser spécifique (ligne 241) → `sources: string[]`
2. Une fois par `parseSections` pour les sections inconnues → `"7. Sources": {...}`

## 3. Analyse technique détaillée

### 3.1 Flux de données

```
Fichier TXT → Parser → Loader → Migration Script → Supabase (JSONB) → API Query → API Response
```

**Points de contrôle** :

1. ✅ **Parser** (`languageFamilyParser.ts`) : Extrait correctement toutes les sections
2. ✅ **Loader** (`languageFamilyLoader.ts`) : Charge correctement depuis les fichiers
3. ❓ **Migration Script** (`migrateAfrikToDatabase.ts`) : Utilise `upsert` qui écrase les données
4. ✅ **Supabase Query** (`languageFamilies.ts`) : Retourne le JSONB tel quel
5. ✅ **API Handler** (`languageFamilies.ts`) : Retourne les données sans transformation

### 3.2 Problème identifié : Migration avec données obsolètes

**Scénario probable** :

1. Les fichiers TXT ont été créés/modifiés récemment avec les IDs PPL complets
2. La base de données contient des données migrées **avant** ces modifications
3. Le script de migration utilise `upsert` qui devrait mettre à jour, mais :
   - Soit la migration n'a pas été relancée après les modifications des fichiers
   - Soit le parser utilisé lors de la migration était différent

### 3.3 Analyse du parser `parseSection`

Le parser `parseSection` (lignes 65-99 de `parser.ts`) :

- Cherche les sections avec le pattern `^#+\s*${sectionTitle}\s*$`
- Extrait le contenu jusqu'à la prochaine section
- Parse le contenu avec `parseSectionContent`

**Problème potentiel** :

- Pour les sections avec des sous-sections (comme "3. Caractéristiques linguistiques" avec plusieurs champs), le parser doit gérer les lignes qui ne commencent pas par `-`
- Le parser `parseSectionContent` (lignes 104-162) gère les key-value pairs, mais peut avoir des problèmes avec :
  - Les valeurs multilignes
  - Les champs qui ne suivent pas le format `- Clé : Valeur`

### 3.4 Analyse du parser `parsePeoplesSection`

Le parser `parsePeoplesSection` (lignes 227-298 de `parser.ts`) :

- Cherche le pattern `- Peuple \d+\s*:`
- Extrait les IDs PPL avec le pattern `PPL_[A-Z_]+`
- Gère le format simple `- Peuple 1 : Nom (PPL_ID)`

**Fonctionnement correct** : Le parser devrait extraire les IDs PPL correctement.

## 4. Causes racines identifiées

### Cause 1 : Données en base obsolètes

**Probabilité** : 🔴 Élevée

Les données en base ont été migrées **avant** les corrections récentes des IDs PPL dans les fichiers TXT. La migration n'a pas été relancée depuis.

**Preuve** :

- Les données en base montrent des IDs PPL complets (ex: `PPL_ARABES_AFRIQUE`)
- Mais l'API retourne des données sans IDs ou incomplètes
- Cela suggère que les données en base sont **plus récentes** que celles retournées par l'API, ce qui est contradictoire

**Hypothèse révisée** : Les données en base sont **plus récentes** et correctes. Le problème est que l'API retourne des données **cachées** ou **transformées** quelque part.

### Cause 2 : Cache ou transformation dans l'API

**Probabilité** : 🟡 Moyenne

Le service `languageFamilyService.ts` utilise `unstable_cache` avec une revalidation de 24h. Si les données ont été mises à jour en base mais que le cache n'a pas été invalidé, l'API retourne des données obsolètes.

**Preuve** :

- Le service utilise `unstable_cache` (ligne 14-18 de `languageFamilyService.ts`)
- Cache key : `["afrik-language-family-${id}"]`
- Revalidation : 86400 secondes (24h)

### Cause 3 : Parser différent entre migration et API

**Probabilité** : 🟢 Faible

Le script de migration et l'API utilisent le même parser (`languageFamilyParser.ts`), donc cette cause est peu probable.

## 5. Recommandations

### 5.1 Action immédiate : Relancer la migration

```bash
tsx scripts/migrateAfrikToDatabase.ts
```

Cela mettra à jour toutes les données en base avec les dernières versions des fichiers TXT, incluant :

- Les IDs PPL complets dans `associatedPeoples`
- Toutes les sections (`linguisticCharacteristics`, `historyAndOrigins`, etc.)

### 5.2 Vérification du cache

Après la migration, vérifier si le cache Next.js doit être invalidé :

- Le cache `unstable_cache` se revalide automatiquement après 24h
- Pour forcer une revalidation immédiate, redémarrer le serveur Next.js

### 5.3 Amélioration du parser

**Problème identifié** : Le parser `parseSectionContent` peut avoir des difficultés avec les sections qui ont des formats non-standard.

**Recommandation** : Ajouter des tests pour vérifier que toutes les sections sont correctement parsées, notamment :

- Sections avec valeurs multilignes
- Sections avec sous-sections
- Sections avec formats de clés variés

### 5.4 Validation des données

Créer un script de validation qui compare :

- Les données en base avec les fichiers TXT
- Les données retournées par l'API avec les données en base

## 6. Conclusion

**Problème principal** : Les données en base de données sont **plus complètes** que celles retournées par l'API, ce qui suggère un problème de **cache** ou de **transformation** dans la couche API/service.

**Action recommandée** :

1. ✅ Relancer la migration pour s'assurer que les données en base sont à jour
2. ✅ Vérifier/invalider le cache Next.js
3. ✅ Comparer les données avant/après migration
4. ✅ Ajouter des logs pour tracer le flux de données

**Hypothèse finale** : Le cache Next.js (`unstable_cache`) retourne des données obsolètes qui ont été parsées avant les corrections des IDs PPL dans les fichiers TXT.
