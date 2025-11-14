# Guide de migration des données

Ce guide explique comment mettre à jour les données de l'application Ethniafrique Atlas.

## Structure des fichiers

### Organisation

Les fichiers sources doivent être organisés par région puis par pays :

```
dataset/
  source/
    {region}/
      {country}/
        {country}_ethnies_complet.csv
        {country}.txt
```

Exemple :

```
dataset/
  source/
    afrique_de_l_ouest/
      benin/
        benin_ethnies_complet.csv
        benin.txt
      senegal/
        senegal_ethnies_complet.csv
        senegal.txt
```

### Format du CSV enrichi

Le fichier CSV doit contenir les colonnes suivantes :

- `Group` : Nom du groupe ethnique principal
- `Sub_group` : Sous-groupes séparés par des virgules (optionnel)
- `Population_2025` : Population en 2025
- `Percentage_in_country` : Pourcentage dans le pays
- `Percentage_in_Africa` : Pourcentage en Afrique
- `Language` : Langues parlées (séparées par des virgules)
- `Region` : Région géographique précise du pays
- `Sources` : Sources de données (séparées par des virgules)
- `Ancient_Name` : Ancien nom du groupe (max 3, séparés par des virgules)
- `Description` : Description du groupe ethnique
- `Type_de_societe` : Type de société
- `Religion` : Religion(s)
- `Famille_linguistique` : Famille linguistique
- `Statut_historique` : Statut historique
- `Presence_regionale` : Présence régionale (pays, séparés par des virgules)

### Format du fichier de description

Le fichier `.txt` doit suivre cette structure :

```markdown
# {NOM_DU_PAYS}

## PAYS

### Anciennes appellations

- Nom 1
- Nom 2
- Nom 3

### Description

Description complète du pays...

## ETHNIES

### {Nom de l'ethnie}

**Ancien nom**: Nom1, Nom2, Nom3
**Description**: Description de l'ethnie...
```

## Détection des sous-groupes

Le système détecte automatiquement les sous-groupes de deux manières :

1. **Pattern avec parenthèses** : `"Berbères (Amazigh, etc)"` → groupe "Berbères", sous-groupes ["Amazigh", "etc"]
2. **Pattern avec virgules dans Sub_group** : `Sub_group: "Fon, Gun, Maxi"` → sous-groupes séparés

Les populations des sous-groupes sont calculées automatiquement :

- Si des pourcentages sont disponibles, ils sont utilisés
- Sinon, la population est répartie équitablement entre les sous-groupes

## Processus de migration

### 1. Préparer les fichiers

1. Placer le fichier CSV enrichi dans `dataset/source/{region}/{country}/{country}_ethnies_complet.csv`
2. Placer le fichier de description dans `dataset/source/{region}/{country}/{country}.txt`

### 2. Parser les données CSV

```bash
tsx scripts/parseEnrichedCountryCSV.ts
```

Ce script :

- Parse tous les fichiers CSV enrichis
- Détecte les sous-groupes
- Calcule les populations
- Génère des fichiers JSON dans `dataset/parsed/`

### 3. Parser les descriptions

```bash
tsx scripts/parseCountryDescriptions.ts
```

Ce script :

- Parse tous les fichiers `.txt`
- Extrait les descriptions et anciens noms
- Génère des fichiers JSON dans `dataset/parsed/`

### 4. Matcher CSV et descriptions

```bash
tsx scripts/matchCSVAndDescriptions.ts
```

Ce script :

- Fait correspondre les données CSV avec les descriptions
- Utilise un matching flexible (normalisation, matching partiel)
- Génère des fichiers JSON fusionnés dans `dataset/matched/`

### 5. Migrer vers Supabase

```bash
tsx scripts/migrateEnrichedData.ts
```

Ce script :

- Charge les données fusionnées
- Crée/met à jour les régions
- Crée/met à jour les pays avec descriptions et anciens noms
- Crée/met à jour les ethnies (groupes parents d'abord, puis sous-groupes)
- Crée/met à jour les langues et relations
- Crée/met à jour les sources et relations
- Crée/met à jour les presences avec région géographique

## Ajouter un nouveau pays

1. Créer le dossier `dataset/source/{region}/{country}/`
2. Ajouter le fichier CSV enrichi : `{country}_ethnies_complet.csv`
3. Ajouter le fichier de description : `{country}.txt`
4. Exécuter les scripts de migration (étapes 2-5 ci-dessus)

## Mettre à jour un pays existant

1. Modifier le fichier CSV enrichi dans `dataset/source/{region}/{country}/`
2. Modifier le fichier de description si nécessaire
3. Exécuter les scripts de migration (étapes 2-5 ci-dessus)

Les scripts utilisent `ON CONFLICT` pour mettre à jour les données existantes.

## Notes importantes

- Les anciens noms sont limités à 3 maximum (pour les pays et les ethnies)
- Les sous-groupes apparaissent dans la liste des ethnies et sont accessibles individuellement
- Les groupes et sous-groupes sont comptés séparément dans les statistiques
- Les descriptions peuvent être en texte libre (markdown supporté)

## Structure de la base de données

### Tables principales

- `african_regions` : Régions africaines
- `countries` : Pays avec description et anciens noms
- `ethnic_groups` : Groupes ethniques avec toutes les informations enrichies
- `ethnic_group_presence` : Présence des ethnies dans les pays
- `languages` : Langues
- `ethnic_group_languages` : Relation entre ethnies et langues
- `sources` : Sources de données
- `ethnic_group_sources` : Relation entre ethnies et sources

### Relations hiérarchiques

Les sous-groupes sont liés aux groupes parents via `parent_id` dans la table `ethnic_groups`.

## Dépannage

### Erreurs de matching

Si certaines ethnies ne sont pas matchées avec leurs descriptions :

- Vérifier la normalisation des noms
- Vérifier les variations d'orthographe
- Ajouter des alias si nécessaire

### Erreurs de migration

- Vérifier les logs pour identifier les erreurs spécifiques
- Vérifier que la migration SQL `002_add_enriched_fields.sql` a été appliquée
- Vérifier les variables d'environnement Supabase
