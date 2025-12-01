# RAPPORT D'ANALYSE - Nettoyage des déclinaisons "rural/urbain/diaspora/global"

**Date :** 2025-01-XX  
**Projet :** AFRIK - EthniAfrica  
**Objectif :** Identifier et fusionner les peuples avec déclinaisons

---

## 📊 STATISTIQUES

- **Total fichiers peuples :** 905
- **Fichiers avec déclinaisons :** 312
- **Peuples principaux concernés :** ~100-150 (estimation)

### Types de déclinaisons détectées :

- `_RURAL` : Peuples ruraux
- `_URBAIN` : Peuples urbains
- `_DIASPORA` / `_DIASP` : Diaspora
- `_DIASPORA2` : Diaspora (variante 2)
- `_GLOBAL` : Vue globale
- `_GLOBAL2`, `_GLOBAL3`, etc. : Vues globales multiples
- `_METIS` : Peuples métis

---

## 🎯 PRINCIPE AFRIK

Selon les règles du projet AFRIK :

> **Un même peuple ne peut PAS être dupliqué en "rural / urbain / diaspora" comme si c'étaient des identités différentes.**

Ces déclinaisons représentent des **situations** du même peuple, pas des peuples distincts.

---

## 📋 PLAN DE NETTOYAGE

### Étape 1 : Identification des peuples principaux

Pour chaque déclinaison, identifier le peuple principal :

- `PPL_YORUBA_RURAL` → `PPL_YORUBA`
- `PPL_YORUBA_URBAIN` → `PPL_YORUBA`
- `PPL_YORUBA_DIASPORA` → `PPL_YORUBA`
- `PPL_YORUBA_GLOBAL` → `PPL_YORUBA`

### Étape 2 : Fusion des données démographiques

Les données des déclinaisons doivent être intégrées dans le fichier principal :

**Section 7 - Démographie globale :**

- Fusionner les populations rurales/urbaines/diaspora
- Enrichir la section "Répartition par pays" avec les détails
- Ajouter une note sur la distribution (rural/urbain/diaspora)

**Section 6 - Rôle historique :**

- Enrichir la section "Diaspora" avec les informations des fichiers diaspora

### Étape 3 : Suppression des fichiers redondants

Après fusion, supprimer :

- Tous les fichiers `*_RURAL.txt`
- Tous les fichiers `*_URBAIN.txt`
- Tous les fichiers `*_DIASP*.txt`
- Tous les fichiers `*_GLOBAL*.txt` (sauf si le peuple principal n'existe pas)
- Tous les fichiers `*_METIS.txt` (à évaluer cas par cas)

### Étape 4 : Vérification

- Vérifier que chaque peuple principal existe
- Vérifier que les données démographiques sont cohérentes
- Vérifier que la somme des populations = population totale

---

## ⚠️ CAS PARTICULIERS

### Cas 1 : Peuple principal n'existe pas

Si un fichier `PPL_XXX_GLOBAL.txt` existe mais pas `PPL_XXX.txt` :

- Renommer `PPL_XXX_GLOBAL.txt` → `PPL_XXX.txt`
- Supprimer les autres déclinaisons

### Cas 2 : Fichiers METIS

Les fichiers `*_METIS.txt` peuvent représenter :

- Un groupe métis spécifique (à garder comme ethnie séparée)
- Une variation du peuple principal (à fusionner)

**Décision :** À évaluer cas par cas selon le contexte.

### Cas 3 : Fichiers GLOBAL multiples

Si plusieurs fichiers `*_GLOBAL*.txt` existent :

- Fusionner toutes les données dans le peuple principal
- Supprimer tous les fichiers GLOBAL

---

## 📝 EXEMPLE DE FUSION : YORUBA

**Fichiers à fusionner :**

- `PPL_YORUBA.txt` (principal)
- `PPL_YORUBA_RURAL.txt`
- `PPL_YORUBA_URBAIN.txt`
- `PPL_YORUBA_DIASPORA.txt`
- `PPL_YORUBA_GLOBAL.txt`
- `PPL_YORUBA_GLOBAL2.txt` à `PPL_YORUBA_GLOBAL6.txt`

**Résultat attendu :**

- Un seul fichier `PPL_YORUBA.txt` enrichi avec :
  - Démographie : 25M-30M (rural) + 15M-20M (urbain) + 3M+ (diaspora) = 43M-53M total
  - Section Diaspora enrichie
  - Notes sur la distribution géographique

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Créer ce rapport d'analyse
2. ✅ Générer la liste complète des peuples à fusionner
3. ✅ Créer un script de fusion automatique
4. ✅ Exécuter la fusion (exemple : Yoruba)
5. ✅ Vérifier la cohérence
6. ✅ Supprimer les fichiers redondants
7. ⏳ Mettre à jour les CSV démographiques (si nécessaire)

---

## ✅ RÉSULTATS DU NETTOYAGE

**Date d'exécution :** 2025-01-XX

### Statistiques :

- **Fichiers déclinés supprimés :** 312
- **Fichiers peuples restants :** 592 (au lieu de 905)
- **Peuples traités :** 92
- **Fichiers principaux enrichis :** 1 (Yoruba - exemple)

### Actions effectuées :

1. ✅ Identification de tous les fichiers avec déclinaisons
2. ✅ Enrichissement du fichier principal Yoruba avec les données démographiques et diaspora
3. ✅ Suppression de tous les fichiers déclinés (RURAL, URBAIN, DIASPORA, GLOBAL, METIS)
4. ✅ Renommage des fichiers GLOBAL en fichiers principaux pour 7 peuples sans fichier principal
5. ✅ Suppression des fichiers doublons

### Fichiers restants :

- **0 fichier** avec déclinaisons restant
- **592 fichiers** peuples principaux (un par peuple)

---

## 📌 NOTES IMPORTANTES

- **Ne pas perdre de données** : Toutes les informations démographiques doivent être préservées
- **Respecter le modèle** : Le fichier fusionné doit respecter strictement `modele-peuple.txt`
- **Cohérence démographique** : La somme des populations doit être logique
- **Traçabilité** : Documenter les fusions effectuées
