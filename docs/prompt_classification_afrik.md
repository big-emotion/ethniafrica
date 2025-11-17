# Prompt de Vérification et Harmonisation des Classifications – Projet Afrik

Ce fichier contient le prompt complet destiné à l’agent Cursor pour vérifier, corriger et harmoniser toutes les classifications linguistiques des peuples du projet Afrik, y compris la logique de classification du peuple Sérère.

---

## 🎯 Objectif global

Le projet Afrik contient de nombreuses données (peuples, ethnies, langues, familles linguistiques).  
Certaines classifications linguistiques sont incohérentes ou contradictoires.  
Ce prompt a pour objectif de permettre à l’agent Cursor de **réviser, corriger et harmoniser l’ensemble des classifications**, tout en respectant les principes pédagogiques du site.

---

# 1. Règles de classification à respecter

### ✔️ 1.1. Suivre la classification linguistique moderne (SIL / Ethnologue / Glottolog)

La hiérarchie correcte :

- **Famille**
- **Sous-famille**
- **Branche**
- **Groupe**
- **Sous-groupe**
- **Langue**
- **Peuple**

Exemple correct pour les Sérères :

```
Niger-Congo
  → Atlantique-Congo
    → Atlantique
      → Nord-Atlantique
        → Sérère (langue)
          → Peuple Sérère
```

### ✔️ 1.2. Ne jamais afficher la classification complète en premier niveau

- La classification complète doit rester **interne**, pour analyses et cohérence des données.
- Le site doit afficher **une version simplifiée** :
  - Famille linguistique principale
  - Langue principale
  - Mention simple : “branche atlantique”, “branche nilo-saharienne”, etc.
- La classification détaillée doit être disponible dans :
  - une page dédiée “Classification complète”,
  - ou un mode avancé.

### ✔️ 1.3. Corriger les ambiguïtés courantes

- Atlantique → **n’est pas** une famille indépendante → fait partie du Niger-Congo.
- Bantou → **n’est pas** une ethnie mais un ensemble linguistique.
- Tchadique → appartient à Afro-asiatique.
- Variantes coloniales → doivent être marquées comme historiques (jamais classification active).

### ✔️ 1.4. Harmoniser les identifiants AFRIK

- Famille linguistique : `FLG_xxxxx`
- Peuple : `PPL_xxxxx`
- Ethnie : `ETH_xxxxx`
- Sous-ethnie : `SUB_xxxxx`
- Clan : `CLN_xxxxx`
- Langue : ISO 639-3

Tous les peuples doivent avoir une classification cohérente, complète, sans contradiction.

---

# 2. Travail demandé à l’agent Cursor

## ✔️ 2.1. Vérifier l’ensemble des peuples existants

Pour chaque peuple, l’agent doit :

- vérifier la famille linguistique correcte,
- vérifier toutes les sous-branches,
- vérifier la langue associée,
- corriger les incohérences,
- supprimer les anciennes classifications erronées,
- documenter les ambiguïtés éventuelles.

Le travail doit couvrir TOUS les peuples (Peuls, Wolofs, Sérères, Akan, Yoruba, Bantu, Nilotiques, etc.).

---

## ✔️ 2.2. Cas Sérère (exemple concret)

L’agent doit corriger explicitement :

- Sérère **ne doit PAS apparaître** comme “Famille Atlantique”.
- Il doit apparaître comme :

```
Famille : Niger-Congo
Sous-famille : Atlantique-Congo
Branche : Atlantique
Sous-groupe : Nord-Atlantique
Langue : sérère (ISO 639-3)
Peuple : Sérère
```

L’affichage public :  
→ “Famille linguistique : Niger-Congo (branche atlantique)”

---

## ✔️ 2.3. Appliquer cette logique à tous les peuples

- Aucun peuple ne doit apparaître dans deux familles différentes.
- Aucun peuple ne doit reposer sur des classifications coloniales obsolètes.
- Les branches doivent être validées selon SIL / Glottolog.
- Les ambiguïtés doivent être enregistrées dans un champ `notes`.

---

# 3. Nouveau modèle interne pour les classifications

La classification interne doit suivre ce modèle :

```ts
interface Classification {
  familyId: string; // FLG_xxxxx
  familyName: string;
  branch?: string;
  subBranch?: string;
  subgroup?: string;
  languageId?: string; // ISO 639-3
  canonical: boolean;
  notes?: string; // ambiguïtés, variantes historiques
}
```

---

# 4. Résultats attendus

L’agent doit produire :

### ✔️ 4.1. La liste complète des incohérences identifiées

Pour chaque peuple, selon :

- famille incorrecte
- branche incorrecte
- anomalies identifiants
- classifications obsolètes
- duplications

### ✔️ 4.2. Une version normalisée de la classification pour chaque peuple

→ Prête à intégrer dans Prisma ou dans les fichiers du projet.

### ✔️ 4.3. Un plan de migration

- mapping ancien schéma → nouveau schéma,
- champs à supprimer,
- données à déplacer,
- champs `notes` pour documenter les variations historiques.

---

# 5. Contraintes UI / UX

L’interface ne doit pas afficher la classification complète en premier niveau.

Pour chaque peuple, afficher seulement :

- **Famille principale**
- **Langue principale**
- **Branche simplifiée** (optionnelle)

Les détails complets vont dans :

- `/classifications`
- ou une sous-section dédiée de la fiche du peuple.

---

# 6. Instructions finales pour l’agent Cursor

Tu peux maintenant commencer par :

1. Charger la liste complète des peuples.
2. Vérifier toutes les classifications.
3. Identifier les incohérences.
4. Produire une première proposition normalisée pour chaque peuple.
5. Préparer les migrations nécessaires pour harmoniser toute la base.

Merci de bien respecter :

- les identifiants Afrik,
- les hiérarchies linguistiques modernes,
- les exigences pédagogiques,
- la cohérence interne du projet Afrik.
