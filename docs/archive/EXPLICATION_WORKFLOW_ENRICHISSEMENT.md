# Explication du workflow d'enrichissement — Les 3 étapes

## Vue d'ensemble

Le processus d'enrichissement des ethnies se fait en **3 étapes distinctes** :

1. **Étape 1 : Collecte des données brutes** → Fichiers JSON dans `_cache_enrichissement/`
2. **Étape 2 : Consolidation** → Script `consolidateEthnieData.ts`
3. **Étape 3 : Mise à jour des fichiers** → Script `updateEthnieFiles.ts`

---

## Étape 1 : Collecte des données brutes (Cache JSON)

**Fichier créé :** `_cache_enrichissement/ETH_XXX.json`

**Contenu :** Données brutes collectées depuis les sources (Glottolog, Ethnologue, etc.)

**Exemple :**

```json
{
  "ETH_ID": "ETH_AARI_AARI_DU_NORD",
  "timestamp": "2025-01-25T22:00:00Z",
  "sources": {
    "glottolog": {
      "url": "https://glottolog.org/...",
      "data": {
        "langue": "Aari",
        "code_iso": "aiw",
        "famille": "Afro-Asiatic > Omotic > ...",
        "pays": ["Ethiopia"],
        "auto_appellation": "Aari"
      },
      "success": true
    },
    "ethnologue": {
      "url": "https://www.ethnologue.com/...",
      "data": {
        "langue": "Aari",
        "code_iso": "aiw",
        "famille": "Afro-Asiatic",
        "pays": ["Ethiopia"]
      },
      "success": true
    }
  }
}
```

**Caractéristiques :**

- ✅ Contient les données **brutes** de chaque source
- ✅ Chaque source peut avoir des formats différents
- ✅ Peut contenir des données contradictoires
- ❌ **PAS encore de section `consolidated`**

---

## Étape 2 : Consolidation des données

**Script :** `npx tsx scripts/consolidateEthnieData.ts`

**Action :** Lit tous les fichiers JSON du cache et ajoute une section `consolidated`

**Résultat :** Le même fichier JSON, mais avec une section `consolidated` ajoutée :

```json
{
  "ETH_ID": "ETH_AARI_AARI_DU_NORD",
  "timestamp": "2025-01-25T22:00:00Z",
  "sources": {
    "glottolog": { ... },
    "ethnologue": { ... }
  },
  "consolidated": {                    // ← AJOUTÉ PAR LE SCRIPT
    "sources_utilisees": [
      "Glottolog",
      "Ethnologue (SIL)"
    ],
    "code_iso": "aiw",
    "langue_principale": "Aari",
    "famille_linguistique": "Afro-Asiatic > Omotic > North Omotic > Dizoid",
    "pays_principaux": ["Ethiopia"],
    "region_generale": "Southwestern Ethiopia",
    "auto_appellation": "Aari"
  }
}
```

**Ce que fait le script :**

- ✅ Compare les données de plusieurs sources
- ✅ Applique des règles de validation (ex: code ISO confirmé par 2 sources minimum)
- ✅ Priorise certaines sources (Glottolog > Ethnologue)
- ✅ Normalise les formats (pays, régions, etc.)
- ✅ Crée un objet `consolidated` avec les données finales

**Règles appliquées :**

- Code ISO 639-3 : doit être confirmé par au moins 2 sources
- Langue principale : priorité Glottolog > Ethnologue
- Famille linguistique : prend la version la plus détaillée
- Pays : fusionne les listes de toutes les sources

---

## Étape 3 : Mise à jour des fichiers TXT

**Script :** `npx tsx scripts/updateEthnieFiles.ts`

**Action :** Lit les données `consolidated` et met à jour les fichiers `ETH_*.txt`

**Résultat :** Le fichier `ETH_AARI_AARI_DU_NORD.txt` est modifié :

**AVANT :**

```
- Auto-appellation : N/A
- Langue parlée : N/A
- Code ISO 639-3 : aiw
- Pays : N/A
- Régions principales : N/A
```

**APRÈS :**

```
- Auto-appellation : Aari
- Langue parlée : Aari
- Code ISO 639-3 : aiw
- Pays : Ethiopia
- Régions principales : Southwestern Ethiopia
```

**Ce que fait le script :**

- ✅ Lit chaque fichier `ETH_*.txt`
- ✅ Extrait les données `consolidated` du cache JSON correspondant
- ✅ Remplace les `N/A` par les valeurs consolidées
- ✅ Met à jour la section "Sources" avec les sources utilisées
- ✅ Respecte strictement le format de `modele-ethnie.txt`

---

## Schéma du workflow complet

```
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : Collecte (Manuel ou Browserbase MCP)        │
│                                                          │
│  Créer : _cache_enrichissement/ETH_XXX.json             │
│  Contenu : Données brutes des sources                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : Consolidation (Script automatique)          │
│                                                          │
│  Exécuter : npx tsx scripts/consolidateEthnieData.ts  │
│  Action : Ajoute section "consolidated" au JSON         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 3 : Mise à jour (Script automatique)            │
│                                                          │
│  Exécuter : npx tsx scripts/updateEthnieFiles.ts        │
│  Action : Met à jour ETH_XXX.txt avec données consolidées│
└─────────────────────────────────────────────────────────┘
```

---

## Pourquoi 3 étapes séparées ?

1. **Séparation des responsabilités**
   - Étape 1 : Collecte (peut être manuelle ou automatisée)
   - Étape 2 : Traitement et validation
   - Étape 3 : Application aux fichiers finaux

2. **Réutilisabilité**
   - On peut re-consolider sans re-collecter
   - On peut re-appliquer sans re-consolider

3. **Débogage**
   - On peut vérifier les données brutes avant consolidation
   - On peut vérifier les données consolidées avant mise à jour

4. **Performance**
   - On peut collecter plusieurs ethnies, puis tout consolider d'un coup
   - On peut consolider plusieurs ethnies, puis tout mettre à jour d'un coup

---

## Exemple concret : ETH_AARI_AARI_DU_NORD

### Étape 1 : Cache JSON créé

```json
{
  "sources": {
    "glottolog": { "data": { "code_iso": "aiw", ... } },
    "ethnologue": { "data": { "code_iso": "aiw", ... } }
  }
  // PAS de "consolidated" encore
}
```

### Étape 2 : Après consolidation

```json
{
  "sources": { ... },
  "consolidated": {
    "code_iso": "aiw",  // Confirmé par 2 sources
    "langue_principale": "Aari",
    "auto_appellation": "Aari"
  }
}
```

### Étape 3 : Fichier TXT mis à jour

```
- Auto-appellation : Aari        ← Avant : N/A
- Langue parlée : Aari           ← Avant : N/A
- Code ISO 639-3 : aiw           ← Déjà présent
- Pays : Ethiopia                ← Avant : N/A
```

---

## Commandes à exécuter

```bash
# 1. Créer les fichiers cache JSON (manuel ou Browserbase)
# → Créer _cache_enrichissement/ETH_XXX.json

# 2. Consolider les données
npx tsx scripts/consolidateEthnieData.ts

# 3. Mettre à jour les fichiers TXT
npx tsx scripts/updateEthnieFiles.ts

# 4. Générer le rapport
npx tsx scripts/generateEnrichmentReport.ts
```

---

## Résumé

| Étape                | Fichier        | Contenu                    | Action                           |
| -------------------- | -------------- | -------------------------- | -------------------------------- |
| **1. Collecte**      | `ETH_XXX.json` | Données brutes des sources | Création manuelle ou Browserbase |
| **2. Consolidation** | `ETH_XXX.json` | Ajoute `consolidated`      | Script automatique               |
| **3. Mise à jour**   | `ETH_XXX.txt`  | Remplace `N/A` par valeurs | Script automatique               |
