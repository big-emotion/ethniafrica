# ETHNIAFRICA - Présentation fonctionnelle

## Parcours, décisions et évolutions (7 min)

---

## 1. Le projet en 30 secondes

**ETHNIAFRICA** est une application web open source qui documente les peuples d'Afrique selon une approche décoloniale.

**Méthodologie AFRIK** : Hiérarchie simplifiée

- Famille linguistique → Langue → Peuple → Pays

**État actuel** :

- ✅ 24 familles linguistiques
- ✅ 592 peuples
- ⏳ 13/55 pays
- ⏳ Validation en cours

**Note** : Le nom "Ethniafrica" changera car "ethnie" est un terme colonial.

---

## 2. Le parcours : pourquoi cette approche ?

### Problème initial

Les classifications traditionnelles par "ethnie" sont souvent :

- Héritées de la période coloniale
- Réductrices et simplistes
- Ne reflètent pas la complexité des identités

### Solution : Méthodologie AFRIK

**Choix 1 : Hiérarchie linguistique**

- Classification scientifique objective
- Focus sur les langues plutôt que les catégories ethniques
- Regroupement logique des peuples apparentés

**Choix 2 : Abandon de la classification par ethnie**

- 1716 fichiers "ethnies" archivés
- Focus sur les peuples (groupes culturels vivants)
- Évite les pièges de la catégorisation rigide

**Choix 3 : Approche décoloniale**

- Contextualisation systématique des termes coloniaux
- Mise en avant des auto-appellations (endonymes)
- Explication de l'origine des exonymes problématiques

---

## 3. Les décisions clés

### Décision structurelle : Organisation par famille linguistique

**Avant** : Organisation par région ou ethnie
**Après** : `/peuples/FLG_BANTU/PPL_*.txt`

**Pourquoi ?**

- Classification scientifique objective
- Regroupement logique des peuples apparentés
- Facilite la recherche et la navigation

### Décision méthodologique : Modèles stricts

Chaque fichier suit un modèle strict (`modele-pays.txt`, `modele-peuple.txt`, etc.)

**Règles absolues** :

- Toutes les sections doivent être présentes
- Ordre respecté à 100%
- Aucune section supprimée ou renommée
- Chaque ligne remplie (même si "N/A")

**Pourquoi ?**

- Cohérence des données
- Traitement automatisé possible
- Garantie que toutes les infos importantes sont présentes

### Décision éthique : Traitement des termes coloniaux

**Principe** : Aucun terme colonial ne doit être présenté comme neutre.

**Règles obligatoires** :

1. Conservation du terme historique (référence)
2. Explication de l'origine
3. Explication du problème
4. Mise en avant de l'auto-appellation
5. Contextualisation de l'usage contemporain

**Exemple** : "Bantou" = terme linguistique, pas catégorie ethnique

### Décision technique : Sources fiables uniquement

**Démographie** : ONU, UNFPA, CIA, Banque Mondiale
**Langues** : Ethnologue (SIL), Glottolog, UNESCO
**Académique** : Vansina, Ehret, Hiernaux, IWGIA

**Règle** : Recherche web obligatoire, aucune donnée inventée

---

## 4. L'évolution du projet

### Phase 1 : Simplification (fait)

- Abandon de la hiérarchie ethnie/sous-ethnie/clan
- Focus sur familles linguistiques, langues, peuples, pays
- Archive des données non essentielles (1716 fichiers)

### Phase 2 : Génération (en cours)

- ✅ 24 familles linguistiques
- ✅ 592 peuples
- ⏳ 13/55 pays
- ⏳ CSV démographiques

### Phase 3 : Validation (à venir)

- Cohérence TXT ↔ CSV
- Somme des peuples = 100% par pays
- Vérification des identifiants
- Validation des sources

### Phase 4 : Publication (à venir)

- Interface publique
- API REST documentée
- Données téléchargeables

---

## 5. Les évolutions à venir

### Court terme (3-6 mois)

- Compléter les 42 pays restants
- Finaliser les CSV démographiques
- Validation globale
- Publication initiale

### Moyen terme (6-12 mois)

- Enrichissement qualitatif des fiches
- Cartes interactives
- Amélioration UX/UI
- Traductions dans les langues africaines

### Long terme (12+ mois)

- **Atlas des noms** : Étymologie, évolution historique, usages coloniaux
- **Généalogie des classifications** : Explication des typologies linguistiques
- **Liens cachés entre peuples** : Visualisation des relations linguistiques, migratoires, culturelles
- **Colonisation & résistances** : Cartographie des impacts coloniaux
- **Frise des migrations africaines** : Visualisation interactive
- **Quiz intelligent** : Apprentissage interactif
- **Graphes relationnels** : Réseaux de relations entre peuples
- **Module "Les mots et la violence"** : Impact des noms coloniaux

### Vision pédagogique

Trois colonnes pédagogiques :

1. **Les noms** (étymologie, sens, origine)
2. **Les liens** (migrations, classifications, influences)
3. **Les regards** (colonialisme, contrefactualité)

Trois modes d'accès :

1. **Explorer** (atlas, cartes)
2. **Comprendre** (frises, analyses)
3. **Jouer** (quiz, comparateurs)

---

## 6. Impact et objectifs

### Public cible

- Chercheurs et étudiants (anthropologie, linguistique, études africaines)
- Éducateurs et enseignants
- Développeurs et contributeurs open source
- Toute personne intéressée par la diversité culturelle de l'Afrique

### Objectifs

1. **Documentation complète** : Informations détaillées et vérifiées
2. **Approche décoloniale** : Sensibilité et contextualisation
3. **Sources fiables** : Uniquement des sources reconnues
4. **Accessibilité** : Interface multilingue (FR, EN, ES, PT) et responsive
5. **Open source** : Données et code accessibles

### Vision à long terme

Devenir la référence open source pour les données ethnographiques et linguistiques de l'Afrique, avec :

- Une approche décoloniale respectueuse
- Des données fiables et vérifiées
- Une interface accessible et multilingue
- Une communauté active de contributeurs
- Un impact éducatif et scientifique positif

---

## Points clés à retenir

1. **Méthodologie AFRIK** : Hiérarchie linguistique plutôt qu'ethnique
2. **Approche décoloniale** : Contextualisation systématique des termes problématiques
3. **Sources fiables** : Recherche web obligatoire, aucune donnée inventée
4. **Modèles stricts** : Cohérence garantie par des modèles à respecter à 100%
5. **Évolution continue** : De la génération de données vers des fonctionnalités pédagogiques innovantes

---

**Durée estimée de présentation** : 7 minutes
**Public** : Général, non technique
**Focus** : Parcours, décisions, évolutions
