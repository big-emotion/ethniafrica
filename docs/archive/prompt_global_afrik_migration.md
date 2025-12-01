# Prompt global – Vérification & Migration des données Afrik (incohérences complètes)

Tu es mon assistant développeur / data engineer dans Cursor.

Le projet **Afrik / EthniAfrica** existe déjà (Next.js + base de données) et une **refonte complète** est en cours :

- nouvelle arborescence,
- nouveaux schémas de données,
- nettoyage et migration de l’existant.

Ce prompt te donne :

1. Les **règles de cohérence** à appliquer à l’ensemble des données (peuples, ethnies, langues, familles, noms, démographie, diaspora, rural/urbain/diaspora).
2. Un **plan de migration complet** pour amener la base existante vers un modèle propre, cohérent, stable.

---

## 🎯 Objectif global

Je veux que tu :

1. **Analyses** toutes les données existantes (schéma, tables, seeds, JSON, etc.).
2. **Détectes** toutes les incohérences possibles (linguistiques, ethniques, géographiques, démographiques, identifiants, noms, rural/urbain/diaspora).
3. **Proposes un nouveau schéma cohérent** (basé sur la vision Afrik).
4. **Prépares un plan de migration complet** (technique + logique).
5. **Nettoies / fusionnes / supprimes** ce qui doit l’être (en gardant une trace documentée).

---

# 1. Types d’incohérences à vérifier

## 1.1. Linguistiques

- Famille ≠ peuple
- Mauvais rattachement (Sérère, Wolof, Peul, Haoussa…)
- Code ISO incorrect ou manquant

## 1.2. Ethniques

- Sous-ethnies devenues peuples
- Catégories administratives (urbain/rural/diaspora)

## 1.3. Géographiques

- Peuples dans des pays incohérents
- Peuples transfrontaliers incomplets

## 1.4. Démographiques

- Pourcentages > 100 %
- Populations dupliquées ou mal agrégées

## 1.5. Historiques / Noms

- Noms coloniaux utilisés comme noms principaux
- Exonymes mal classés

## 1.6. Identifiants

- Doublons (`PPL_xxx` multiples pour même peuple)
- Mauvais niveaux (`ETH_` utilisé comme peuple, etc.)

---

# 2. Cas particulier : Rural / Urbain / Diaspora

> Ces catégories ne définissent **jamais** un peuple ou une ethnie.  
> Ce sont des **variations sociologiques** du même peuple.

Créer un modèle dédié :

```ts
interface PeopleDistribution {
  id: string;
  peopleId: string;
  type: "rural" | "urban" | "diaspora";
  locationCountryId?: string;
  label?: string;
  estimatedPopulation?: number;
  year?: number;
  notes?: string;
}
```

---

# 3. Modèles recommandés

- `Country`
- `LanguageFamily`
- `Language`
- `People`
- `EthnicGroup`
- `SubEthnicGroup`
- `Clan`
- `Classification`
- `NameRecord`
- `CountryPopulation`
- `PeopleGlobalDemography`
- `EthnicGroupInCountry`
- `LanguageFamilyStats`
- `PeopleDistribution`

---

# 4. Plan de migration complet

## 4.1. Étape 1 – Cartographie

Lister tables, modèles, relations, anomalies.

## 4.2. Étape 2 – Nouveau schéma

Créer ou refactorer Prisma.

## 4.3. Étape 3 – Scripts de détection

Détecter :

- suffixes urbain/rural/diaspora
- familles incohérentes
- langues mal classées
- doublons ID
- démographie incohérente

## 4.4. Étape 4 – Migrations

- Normaliser familles / langues / classifications
- Fusionner peuples “urbain/rural/diaspora”
- Corriger les noms via `NameRecord`
- Normaliser démographie

## 4.5. Étape 5 – Nettoyage

Supprimer tables obsolètes  
Ajouter contraintes et index

## 4.6. Étape 6 – Documentation

Documenter schéma, logique, décisions.

---

# 5. Ce que j’attends de toi dans Cursor

1. Afficher le schéma actuel.
2. Proposer le schéma refactorisé.
3. Générer scripts de détection.
4. Proposer scripts de migration.
5. Nettoyer progressivement la base.

Commence quand tu es prêt.
