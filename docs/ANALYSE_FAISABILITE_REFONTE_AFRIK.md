# Analyse de faisabilité : Refonte du projet selon la méthodologie AFRIK

Ce document analyse la correspondance entre le prompt de refonte et l'architecture actuelle du projet AFRIK, ainsi que les fonctionnalités possibles et impossibles avec les données disponibles.

---

## 1. Correspondance avec l'architecture AFRIK actuelle

### 1.1. Ce qui correspond parfaitement

**Hiérarchie AFRIK respectée :**

- ✅ Famille linguistique (FLG_xxxxx) → Langue (ISO 639-3) → Peuple (PPL_xxxxx) → Pays (ISO 3166-1 alpha-3)
- ✅ Structure de données cohérente : 55 pays, 24 familles linguistiques, ~929 peuples
- ✅ Identifiants uniques présents dans tous les fichiers TXT

**Structure des fichiers :**

- ✅ Pays : `/dataset/source/afrik/pays/[ISO].txt` (ex: `ZWE.txt`)
- ✅ Peuples : `/dataset/source/afrik/peuples/FLG_*/PPL_*.txt` (organisés par famille linguistique)
- ✅ Familles linguistiques : `/dataset/source/afrik/famille_linguistique/FLG_*.txt`

**Données démographiques :**

- ✅ CSV disponibles : `famille_linguistique.csv`, `peuple_demographie_globale.csv`, `pays_demographie.csv`
- ✅ Données pour 2025 (ONU/UNFPA)

**Contenu structuré :**

- ✅ Étymologie des noms (pays et peuples)
- ✅ Auto-appellations vs exonymes
- ✅ Notes décoloniales sur les termes problématiques
- ✅ Sections sur les origines, migrations, royaumes historiques

### 1.2. Ce qui ne correspond pas (à corriger)

**Références obsolètes dans le prompt original :**

- ❌ Mention des "ethnies" alors que AFRIK utilise uniquement "peuples"
- ❌ Identifiants ETH_xxxxx, SUB_xxxxx, CLN_xxxxx qui n'existent pas dans AFRIK
- ❌ Routes `/ethnies` et `/ethnies/[id]` qui ne correspondent pas à la méthodologie
- ❌ API `/api/ethnicities` à remplacer par `/api/peoples`

**Structure actuelle du code :**

- ⚠️ L'API actuelle utilise `/api/ethnicities` au lieu de `/api/peoples`
- ⚠️ Les pages peuvent référencer des "ethnies" au lieu de "peuples"
- ⚠️ Le schéma de base de données actuel peut inclure des tables pour les ethnies

**Note importante :** La section "Ethnies incluses dans le peuple" existe dans les fichiers peuples, mais elle est en texte libre et non structurée. Elle ne doit pas être transformée en entités séparées dans la base de données.

---

## 2. Fonctionnalités possibles avec les données AFRIK

### 2.1. Consultation des données

**✅ Liste et fiches pays :**

- 55 pays avec identifiants ISO 3166-1 alpha-3
- Étymologie, appellations historiques, royaumes documentés
- Peuples majeurs avec identifiants PPL\_
- Données démographiques 2025

**✅ Liste et fiches peuples :**

- ~929 peuples avec identifiants PPL_xxxxx
- Auto-appellations, exonymes, notes décoloniales
- Relations avec familles linguistiques (FLG\_)
- Relations avec pays (codes ISO)
- Contenu long sur origines, migrations, culture

**✅ Liste et fiches familles linguistiques :**

- 24 familles linguistiques avec identifiants FLG_xxxxx
- Notes décoloniales sur les termes historiques
- Peuples associés avec identifiants PPL\_
- Caractéristiques linguistiques, histoire, répartition

**✅ Liste et fiches langues :**

- Codes ISO 639-3 présents dans les fichiers
- Relations avec familles linguistiques
- Relations avec peuples (via fichiers peuples)
- Nombre de locuteurs (quand disponible)

**✅ Démographie :**

- Population par pays (2025)
- Population globale par peuple
- Pourcentages par pays et en Afrique
- Sources documentées (ONU, UNFPA, CIA, SIL)

### 2.2. Histoire des noms

**✅ Étymologie des noms de pays :**

- Section "Étymologie du nom" dans chaque fichier pays
- Origine du nom (personne/peuple/administration)
- Évolution historique du nom

**✅ Auto-appellations vs exonymes :**

- Auto-appellations présentes dans les fichiers peuples
- Exonymes et appellations historiques documentés
- Origine des exonymes expliquée

**✅ Noms coloniaux et termes problématiques :**

- Section décoloniale obligatoire dans les fichiers familles linguistiques
- Notes sur pourquoi certains termes posent problème
- Usage contemporain documenté

**✅ Variantes historiques :**

- Section "Appellations historiques" dans les fichiers pays
- Périodes : Antiquité, Moyen Âge, Précolonial, Colonial, Contemporain

### 2.3. Liens et dynamiques

**✅ Relations peuples ↔ pays :**

- Champs "Pays actuels" dans les fichiers peuples (codes ISO)
- Section "Peuples majeurs" dans les fichiers pays (avec PPL\_)
- Données démographiques par pays

**✅ Relations peuples ↔ familles linguistiques :**

- Champs "Famille linguistique principale" dans les fichiers peuples (FLG\_)
- Section "Peuples associés" dans les fichiers familles linguistiques (avec PPL\_)

**✅ Relations peuples ↔ langues :**

- Codes ISO 639-3 dans les fichiers peuples
- Section "Langues et sous-familles" dans les fichiers peuples

**✅ Migrations historiques :**

- Section "Origines, migrations et formation du peuple" dans les fichiers peuples
- Routes migratoires principales documentées
- Zones d'établissement historiques

**✅ Royaumes et entités politiques :**

- Section "Civilisations, royaumes et entités politiques historiques" dans les fichiers pays
- Périodes, peuples dominants, centres politiques, rôle historique

### 2.4. Recherche et navigation

**✅ Recherche globale :**

- Par nom (pays, peuples, familles linguistiques, langues)
- Par identifiant (ISO, PPL*, FLG*, ISO 639-3)
- Par pays (filtre)
- Par famille linguistique (filtre)
- Par région (filtre)

**✅ Navigation hiérarchique :**

- Famille linguistique → Langue → Peuple → Pays
- Liens bidirectionnels entre entités

**✅ Comparaisons :**

- Comparer deux peuples (démographie, langues, pays, familles linguistiques)
- Comparer deux pays (peuples, familles linguistiques)
- Comparer deux familles linguistiques (peuples, langues, répartition)

---

## 3. Fonctionnalités impossibles ou limitées

### 3.1. Graphes de relations complexes

**❌ Limitation :** Pas de données structurées sur les relations inter-peuples (alliances, conflits, influences culturelles directes).

**Solution partielle :** Extraire depuis les sections "Relations avec peuples voisins" dans les fichiers peuples (texte libre). Nécessite un parsing intelligent ou une extraction manuelle.

### 3.2. Cartes interactives détaillées

**❌ Limitation :** Pas de coordonnées géographiques précises. Les régions sont mentionnées en texte libre (ex: "Région principale : Toutes les régions du Zimbabwe, majoritaires dans les régions centrales").

**Solution partielle :**

- Utiliser les régions mentionnées pour créer des zones approximatives
- Utiliser les codes ISO des pays pour positionner les peuples
- Enrichir progressivement avec des coordonnées géographiques précises

### 3.3. Timeline des migrations

**❌ Limitation :** Dates précises souvent absentes. Les périodes sont mentionnées en texte libre (ex: "XIe siècle - XVe siècle", "Antiquité", "Moyen Âge").

**Solution partielle :**

- Extraire les périodes mentionnées et les convertir en intervalles approximatifs
- Créer une timeline avec des périodes floues (Antiquité, Moyen Âge, etc.)
- Enrichir progressivement avec des dates précises si disponibles dans les sources

### 3.4. Données démographiques historiques

**❌ Limitation :** Données principalement pour 2025. Pas de séries temporelles historiques dans les fichiers TXT.

**Solution :** Ajouter des données historiques si disponibles dans les sources (ONU, recensements nationaux, études historiques).

### 3.5. Relations ethnies/sous-groupes structurées

**❌ Limitation :** La méthodologie AFRIK simplifiée ne structure pas les sous-groupes. La section "Ethnies incluses dans le peuple" existe mais en texte libre.

**Note :** Cette limitation est intentionnelle dans la méthodologie AFRIK. Les sous-groupes ne doivent pas être transformés en entités séparées dans la base de données, mais peuvent être affichés comme texte libre dans les fiches peuples.

### 3.6. Données linguistiques détaillées

**⚠️ Limitation partielle :** Dialectes mentionnés en texte libre, pas structurés. La section "Langues et sous-familles" contient des informations mais en format texte.

**Solution partielle :** Extraire depuis la section "Langues et sous-familles" avec un parsing intelligent ou une extraction manuelle.

### 3.7. Routes commerciales historiques

**❌ Limitation :** Pas de données structurées sur les routes commerciales dans les fichiers TXT actuels.

**Solution :** Enrichir les données avec des informations sur les routes commerciales (transsahariennes, swahilies, atlantiques) depuis des sources historiques.

---

## 4. Recommandations

### 4.1. Migration progressive

**Approche recommandée :**

1. **Phase 1 :** Migrer les entités principales (pays, peuples, familles linguistiques)
2. **Phase 2 :** Créer les relations (peuples ↔ pays, peuples ↔ familles linguistiques)
3. **Phase 3 :** Migrer les données démographiques
4. **Phase 4 :** Implémenter la table des noms (NameRecord)
5. **Phase 5 :** Fonctionnalités avancées (recherche, comparaisons, cartes)

### 4.2. Extraction de texte structuré

**Stratégie :**

- Parser les sections texte libre pour extraire des données structurées quand possible
- Utiliser des expressions régulières pour identifier les identifiants (PPL*, FLG*, codes ISO)
- Créer des champs JSONB pour stocker du contenu structuré variable
- Conserver le texte original pour référence

**Exemples d'extraction :**

- Extraire les identifiants PPL\_ depuis "Peuples associés : Kongo (PPL_KONGO), Luba (PPL_LUBA)"
- Extraire les codes ISO depuis "Pays actuels : ZWE, MOZ"
- Extraire les codes ISO 639-3 depuis "Langues parlées : Shona (sna)"

### 4.3. Enrichissement progressif des données

**Priorités :**

1. **Coordonnées géographiques :** Ajouter des coordonnées précises pour les peuples et pays
2. **Dates précises :** Enrichir les périodes historiques avec des dates précises
3. **Relations inter-peuples :** Structurer les relations mentionnées en texte libre
4. **Données démographiques historiques :** Ajouter des séries temporelles si disponibles
5. **Routes commerciales :** Enrichir avec des données historiques

### 4.4. API flexible avec champs JSONB

**Recommandation technique :**

- Utiliser des champs JSONB dans PostgreSQL pour stocker du contenu structuré variable
- Permettre l'évolution du schéma sans migrations complexes
- Faciliter l'extraction progressive de données depuis le texte libre

**Exemple :**

```sql
CREATE TABLE people (
  id VARCHAR(50) PRIMARY KEY, -- PPL_xxxxx
  name_main TEXT NOT NULL,
  content JSONB, -- Contenu structuré variable
  -- ...
);
```

### 4.5. Gestion des données manquantes

**Stratégie :**

- Marquer les champs optionnels comme `nullable` dans le schéma
- Afficher "Non disponible" ou "À compléter" dans l'interface
- Permettre l'enrichissement progressif via un système de contributions

### 4.6. Migration depuis l'ancien schéma

**Actions à prévoir :**

- Supprimer les tables/colonnes liées aux ethnies/sous-ethnies/clans
- Remplacer `/api/ethnicities` par `/api/peoples`
- Adapter les pages qui référencent des "ethnies" pour utiliser "peuples"
- Documenter les changements dans un fichier MIGRATION.md

---

## 5. Conclusion

Le prompt de refonte adapté à la méthodologie AFRIK est **largement faisable** avec les données disponibles. Les principales fonctionnalités (consultation, recherche, comparaisons, histoire des noms) peuvent être implémentées immédiatement.

Les limitations identifiées concernent principalement :

- Les données géographiques précises (coordonnées)
- Les dates précises pour les timelines
- Les relations inter-peuples structurées
- Les données démographiques historiques

Ces limitations peuvent être partiellement résolues par :

- L'extraction intelligente depuis le texte libre
- L'enrichissement progressif des données
- L'utilisation de champs JSONB pour la flexibilité

La migration doit être progressive et documentée, en commençant par les entités principales avant les fonctionnalités avancées.
