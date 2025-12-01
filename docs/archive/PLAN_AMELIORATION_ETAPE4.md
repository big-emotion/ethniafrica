# Plan d'amélioration de l'étape 4 — Enrichissement des ethnies

**Date** : 2025-01-25  
**État actuel** : 34/1361 ethnies enrichies (2.5%)  
**Sources actuelles** : Glottolog + Ethnologue uniquement

---

## 🎯 Objectifs d'amélioration

Avec la documentation API complète (`API_AFRIK_REFERENCE.md`), nous pouvons maintenant :

1. **Enrichir les données historiques et culturelles** (actuellement vides)
2. **Ajouter des sources supplémentaires** pour validation croisée
3. **Remplir les sections manquantes** (organisation sociale, économie, interactions historiques)
4. **Automatiser la collecte** avec les APIs documentées

---

## 📊 État actuel vs État cible

### Actuellement rempli (34 ethnies)

- ✅ Métadonnées linguistiques (langue, ISO, famille)
- ✅ Aire géographique de base (pays, régions)
- ✅ Auto-appellation

### Actuellement vide (toutes les ethnies)

- ❌ Exonymes et termes coloniaux contextualisés
- ❌ Origines et histoire (section 2 complète)
- ❌ Zones historiques, diaspora
- ❌ Organisation sociale et culturelle (section 4)
- ❌ Économie traditionnelle (section 5)
- ❌ Interactions historiques (section 7)
- ❌ URLs complètes dans les sources

---

## 🚀 Améliorations possibles avec les APIs documentées

### 1. Wikidata SPARQL & REST API

**Ce que ça apporte :**

- Relations entre ethnies, peuples, pays
- Données historiques structurées
- QIDs pour recherche approfondie
- Liens vers autres sources

**Champs à enrichir :**

- Relations avec peuples voisins
- Rôle dans les royaumes/empires
- Figures majeures du groupe
- Zones historiques

**Exemple d'utilisation :**

```sparql
SELECT ?ethnie ?ethnieLabel ?pays ?paysLabel ?langue ?langueLabel WHERE {
  ?ethnie wdt:P31 wd:Q41710 .  # Groupe ethnique
  ?ethnie wdt:P17 ?pays .      # Pays
  ?ethnie wdt:P103 ?langue .   # Langue
  ?pays wdt:P30 wd:Q15 .       # Continent: Afrique
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en" . }
  FILTER(CONTAINS(LCASE(?ethnieLabel), "aari"))
} LIMIT 10
```

**Action :** Créer un script `scripts/enrichWithWikidata.ts` qui :

- Recherche chaque ethnie dans Wikidata
- Extrait les relations, données historiques
- Ajoute au cache JSON

---

### 2. UNESCO (endpoint interne)

**Ce que ça apporte :**

- Classification linguistique complémentaire
- Statut des langues (en danger, etc.)
- Données sur patrimoine culturel

**Champs à enrichir :**

- Statut de la langue
- Patrimoine culturel associé
- Zones historiques

**Action :** Tester l'endpoint `/languages-atlas/api/language/<ID>` avec précaution (non officiel)

---

### 3. CIA World Factbook (scraping HTML)

**Ce que ça apporte :**

- Données démographiques par pays
- Groupes ethniques par pays
- Statistiques officielles

**⚠️ Important :** Pas d'API JSON, scraping HTML uniquement

**Champs à enrichir :**

- Contexte démographique (qualitatif, pas chiffré à l'étape 4)
- Relations entre groupes ethniques dans un pays

**Action :** Créer un script `scripts/scrapeCIAFactbook.ts` qui :

- Scrape les pages HTML par pays
- Extrait les informations sur groupes ethniques
- Ajoute au cache JSON

---

### 4. ASCL Leiden OAI-PMH

**Ce que ça apporte :**

- Publications académiques sur les ethnies
- Données historiques et anthropologiques
- Sources fiables pour contextualisation

**Champs à enrichir :**

- Origines anciennes
- Migrations majeures
- Formation du groupe
- Organisation sociale
- Économie traditionnelle
- Interactions historiques

**Action :** Créer un script `scripts/enrichWithASCL.ts` qui :

- Interroge l'OAI-PMH avec requêtes ciblées
- Extrait les métadonnées pertinentes
- Ajoute les références académiques au cache

---

### 5. IWGIA (scraping HTML)

**Ce que ça apporte :**

- Contextualisation décoloniale
- Droits des peuples autochtones
- Contexte politique et historique
- Exonymes et termes coloniaux contextualisés

**Champs à enrichir :**

- Exonymes et termes coloniaux (avec contextualisation)
- Rôle dans la période coloniale
- Mouvements modernes
- Contexte politique

**Action :** Créer un script `scripts/scrapeIWGIA.ts` qui :

- Scrape les pages HTML par peuple/pays
- Extrait les informations décoloniales
- Ajoute au cache avec mention explicite de la source

---

## 📝 Plan d'implémentation par priorité

### Phase 1 : Améliorer les sources existantes (Priorité HAUTE)

**Objectif :** Enrichir les données déjà collectées

1. **Wikidata SPARQL**
   - Créer `scripts/enrichWithWikidata.ts`
   - Rechercher chaque ethnie dans Wikidata
   - Extraire : relations, données historiques, QIDs
   - Ajouter au cache JSON

2. **Améliorer la section Sources**
   - Modifier `scripts/updateEthnieFiles.ts` pour ajouter les URLs complètes
   - Au lieu de `- Glottolog – [URL]`, mettre `- Glottolog – https://glottolog.org/resource/languoid/id/aari1241`

**Résultat attendu :**

- Données historiques de base pour toutes les ethnies
- Sources avec URLs complètes
- Relations entre entités

---

### Phase 2 : Ajouter sources académiques (Priorité MOYENNE)

**Objectif :** Remplir les sections historiques et culturelles

3. **ASCL Leiden OAI-PMH**
   - Créer `scripts/enrichWithASCL.ts`
   - Rechercher publications par ethnie/langue
   - Extraire métadonnées pertinentes
   - Ajouter références au cache

4. **IWGIA (scraping)**
   - Créer `scripts/scrapeIWGIA.ts`
   - Scraper pages par peuple/pays
   - Extraire contextualisation décoloniale
   - Ajouter exonymes contextualisés

**Résultat attendu :**

- Section 2 (Origines et histoire) partiellement remplie
- Exonymes contextualisés
- Références académiques

---

### Phase 3 : Sources complémentaires (Priorité BASSE)

**Objectif :** Compléter avec sources supplémentaires

5. **UNESCO (endpoint interne)**
   - Tester avec précaution
   - Ajouter données linguistiques complémentaires

6. **CIA World Factbook (scraping)**
   - Scraper pages HTML par pays
   - Extraire contexte démographique qualitatif

**Résultat attendu :**

- Données complémentaires
- Validation croisée

---

## 🔧 Scripts à créer/modifier

### Scripts à créer

1. **`scripts/enrichWithWikidata.ts`**
   - Utilise Wikidata SPARQL + REST API
   - Recherche chaque ethnie
   - Extrait données historiques, relations
   - Ajoute au cache JSON

2. **`scripts/enrichWithASCL.ts`**
   - Utilise OAI-PMH ASCL Leiden
   - Recherche publications académiques
   - Extrait métadonnées pertinentes
   - Ajoute références au cache

3. **`scripts/scrapeIWGIA.ts`**
   - Scrape pages HTML IWGIA
   - Extrait contextualisation décoloniale
   - Ajoute exonymes contextualisés

4. **`scripts/scrapeCIAFactbook.ts`**
   - Scrape pages HTML CIA
   - Extrait contexte démographique
   - Ajoute au cache

### Scripts à modifier

1. **`scripts/consolidateEthnieData.ts`**
   - Ajouter traitement des nouvelles sources (Wikidata, ASCL, IWGIA, CIA)
   - Améliorer consolidation des données historiques
   - Gérer les exonymes contextualisés

2. **`scripts/updateEthnieFiles.ts`**
   - Remplir plus de sections (2, 4, 5, 7)
   - Ajouter URLs complètes dans Sources
   - Gérer les données historiques/culturelles

---

## 📈 Résultats attendus après amélioration

### Avant (actuel)

- 34 ethnies enrichies (2.5%)
- ~8 champs remplis par ethnie (16% du modèle)
- Seulement métadonnées linguistiques

### Après amélioration (cible)

- 1361 ethnies enrichies (100%)
- ~25-30 champs remplis par ethnie (50-60% du modèle)
- Métadonnées linguistiques ✅
- Données historiques ✅
- Organisation sociale ✅
- Exonymes contextualisés ✅
- Sources complètes avec URLs ✅

---

## 🎯 Actions immédiates recommandées

### Option 1 : Amélioration rapide (1-2 jours)

1. Créer `scripts/enrichWithWikidata.ts` pour ajouter données historiques
2. Modifier `scripts/updateEthnieFiles.ts` pour remplir plus de sections
3. Tester sur 10-20 ethnies supplémentaires

### Option 2 : Amélioration complète (1 semaine)

1. Créer tous les scripts de collecte (Wikidata, ASCL, IWGIA)
2. Améliorer consolidation et mise à jour
3. Traiter toutes les ethnies par batch
4. Générer rapport final

### Option 3 : Approche progressive

1. Commencer par Wikidata (le plus structuré)
2. Ajouter ASCL Leiden (sources académiques)
3. Ajouter IWGIA (contextualisation décoloniale)
4. Compléter avec CIA si nécessaire

---

## ⚠️ Points d'attention

1. **Wikidata** : Nécessite connaissance des propriétés (P31, P17, etc.)
2. **UNESCO** : Endpoint interne, peut cesser de fonctionner
3. **CIA** : Scraping HTML uniquement, structure peut changer
4. **IWGIA** : Scraping HTML, fragile aux changements
5. **ASCL** : Format XML, nécessite parsing

---

## 📋 Checklist de mise en œuvre

- [ ] Créer `scripts/enrichWithWikidata.ts`
- [ ] Créer `scripts/enrichWithASCL.ts`
- [ ] Créer `scripts/scrapeIWGIA.ts`
- [ ] Créer `scripts/scrapeCIAFactbook.ts`
- [ ] Modifier `scripts/consolidateEthnieData.ts` pour nouvelles sources
- [ ] Modifier `scripts/updateEthnieFiles.ts` pour plus de sections
- [ ] Tester sur batch de 10-20 ethnies
- [ ] Valider la qualité des données enrichies
- [ ] Générer rapport d'amélioration
- [ ] Mettre à jour `WORKFLOW_AFRIK_STATUS.md`

---

## 🚦 Recommandation

**Commencer par l'Option 1 (amélioration rapide)** :

1. Wikidata est la source la plus structurée et fiable
2. Permet d'ajouter rapidement des données historiques
3. Peut être testé et validé rapidement
4. Ensuite, ajouter progressivement les autres sources

**Ordre recommandé :**

1. Wikidata (1-2 jours)
2. ASCL Leiden (2-3 jours)
3. IWGIA (2-3 jours)
4. CIA (optionnel, si nécessaire)

---

## 📚 Références

- Documentation API : `API_AFRIK_REFERENCE.md`
- Guide enrichissement : `docs/GUIDE_ENRICHISSEMENT_BROWSERBASE.md`
- Workflow actuel : `docs/EXPLICATION_WORKFLOW_ENRICHISSEMENT.md`
- Rapport actuel : `docs/RAPPORT_ETHNIES_ENRICHIES_ETAPE4.md`
