# Prompt Cursor – Nettoyage des déclinaisons "rural / urbain / diaspora" – Projet Afrik

Tu es mon assistant développeur dans Cursor.

Le projet **Afrik / EthniAfrica** existe déjà (Next.js + base de données), et une **refonte complète** est en cours :

- nouvelle arborescence,
- nouveaux schémas de données,
- migration et nettoyage de l’existant.

Dans ce cadre, je veux que tu traites **un point très spécifique et critique** :  
👉 les déclinaisons de peuples de type **“rural / urbain / diaspora 1/2/3/4”**.

---

## 🎯 Objectif de cette tâche

Plusieurs jeux de données historiques / démographiques ont introduit des “sous-entités” comme :

- Peuple X (rural)
- Peuple X (urbain)
- Peuple X diaspora 1
- Peuple X diaspora 2, etc.

Ces catégories :

- **ne représentent pas des peuples ou ethnies différents**,
- mais des **variations de localisation / contexte socio-économique** du même peuple.

L’objectif est de :

1. **Identifier** toutes les entrées de ce type dans les données existantes.
2. **Les fusionner logiquement** avec leur peuple principal.
3. **Supprimer** ces pseudo-sous-peuples en tant qu’entités autonomes.
4. Si besoin, créer une **modélisation propre** de la distribution (rural, urbain, diaspora) sans polluer les entités ethniques.

---

## 1. Principes Afrik à respecter

### 1.1. Ce qu’est un peuple / une ethnie

Dans Afrik, un **peuple** ou une **ethnie** est défini par :

- une continuité historique,
- une langue ou un ensemble de langues,
- une mémoire partagée,
- des structures sociales / culturelles.

Les catégories “rural / urbain / diaspora” ne définissent pas de nouveaux peuples, mais des **situations** du même peuple.

---

### 1.2. Ce que signifient “rural / urbain / diaspora”

Les déclinaisons :

- “rural” / “urbain” → découpages socio-administratifs (colonial ou moderne),
- “diaspora 1/2/3/4” → segmentations par pays d’accueil, vague migratoire, ou configuration statistique.

Ces distinctions peuvent avoir une **valeur analytique** (comprendre comment un peuple se répartit),  
mais il ne faut **jamais** les représenter comme :

- de nouveaux peuples (`PPL_...`),
- de nouvelles ethnies (`ETH_...`),
- de nouvelles familles.

---

### 1.3. Règle absolue Afrik

> Un même peuple ne peut PAS être dupliqué en “rural / urbain / diaspora” comme si c’étaient des identités différentes.

Les suffixes du type :

- `PeupleName (rural)`
- `PeupleName (urbain)`
- `PeupleName (diaspora)`
- `PeupleName diaspora 1`, `2`, `3`…

doivent être **rattachés** au même `PPL_xxxxx` (et éventuellement au même `ETH_xxxxx`).

---

## 2. Travail demandé dans le code et la base

### 2.1. Analyse de l’existant

Tu dois :

1. Scanner toutes les tables / collections / fichiers où apparaissent des peuples / ethnies / groupes :
   - table `Peoples`, `EthnicGroups`, `Groups`, etc.
   - éventuels JSON / seeds / fixtures.

2. Identifier toutes les entrées dont le nom suit un pattern du type :
   - contient `"rural"` ou `"urbain"` (insensible à la casse),
   - contient `"diaspora"` + éventuellement un numéro ou un suffixe,
   - ou autres variantes comme `"ville"`, `"campagne"`, `"urban"`, `"rural"`, `"diaspora X"`.

3. Lister ces entrées avec :
   - leur identifiant (`id` actuel),
   - leur nom,
   - leur peuple “racine” (si identifiable par le nom),
   - les relations liées (démographie, pays, etc.).

---

### 2.2. Décision de fusion

Pour chaque entrée de ce type, tu dois :

- retrouver le **peuple principal** correspondant (ex : “Yoruba (urbain)” → “Yoruba”),
- si un peuple principal n’existe pas, **en créer un** propre (sans suffixe) et y rattacher les données.

Règles :

- **Un seul `PPL_xxxxx` par peuple réel.**
- Les variations “rural / urbain / diaspora” ne doivent pas générer plusieurs `PPL_`.

---

### 2.3. Nouveau modèle pour les variations (optionnel mais recommandé)

```ts
interface PeopleDistribution {
  id: string;
  peopleId: string; // PPL_xxxxx
  type: "rural" | "urban" | "diaspora";
  locationCountryId?: string; // ISO 3166-1 alpha-3 pour la diaspora
  label?: string; // ex: "diaspora Europe", "diaspora USA"
  estimatedPopulation?: number;
  year?: number;
  notes?: string; // explication sur ce segment
}
```

Ces entités doivent être migrées vers cette nouvelle structure.

---

## 3. Migration : étapes concrètes

### 3.1. Étape 1 – Détection

Créer un rapport listant :

- les entités “rural / urbain / diaspora”,
- leurs relations,
- leur peuple racine supposé.

### 3.2. Étape 2 – Mise à jour du schéma

Ajouter / mettre à jour :

- `People`
- `PeopleDistribution`

### 3.3. Étape 3 – Fusion

Pour chaque entité à suffixe :

1. Identifier / créer le `PPL_xxxxx` principal.
2. Générer une entrée `PeopleDistribution`.
3. Rebasculer démographies et relations.
4. Supprimer l’entité obsolète.

---

## 4. UI/UX – Rappel

### Ce que l’utilisateur doit voir

- Nom du peuple
- Langue
- Famille linguistique
- Distribution simple (ex : “diaspora majeure : USA, France”).

### Ce qui NE doit jamais apparaître

- “Peul (rural)”, “Peul (urbain)”
- “Yoruba diaspora 2”, etc.

---

## 5. Ce que j’attends maintenant dans Cursor

1. Analyse de la base existante.
2. Détection des peuples à suffixe.
3. Proposition du nouveau schéma Prisma.
4. Plan de migration.
5. Nettoyage progressif.

Travaille proprement, en gardant la cohérence globale du projet Afrik.
