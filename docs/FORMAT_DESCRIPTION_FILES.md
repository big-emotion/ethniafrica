# Format des fichiers de description (.txt)

Ce document décrit le format attendu pour les fichiers de description des pays (`{pays}.txt`).

## Structure générale

```
Nom du pays

[Description générale du pays - optionnelle]

## PAYS

### Anciennes appellations

- Nom 1
- Nom 2
- Nom 3 (maximum 3)

### Description

[Description détaillée du pays]

## ETHNIES

### Nom de l'ethnie 1

**Ancien nom**: Ancien nom 1, Ancien nom 2

**Description**:
Description détaillée de l'ethnie...

### Nom de l'ethnie 2

**Ancien nom**: Ancien nom

**Description**:
Description détaillée...
```

## Format détaillé

### 1. En-tête

```
Nom du pays
```

Le nom du pays sur la première ligne.

### 2. Section PAYS

#### 2.1. Anciennes appellations (OBLIGATOIRE pour les pays)

```
## PAYS

### Anciennes appellations

- Union sud-africaine
- Colonie du Cap
- Transvaal
```

**Règles** :

- Section `## PAYS` (ou `# PAYS`)
- Sous-section `### Anciennes appellations` (ou `### Anciens noms`)
- Liste avec tirets `-` ou puces `•`
- Maximum 3 anciens noms (les autres seront ignorés)
- Format accepté :
  - `- Nom`
  - `- **Nom**` (avec markdown)
  - `• Nom`
  - `1. Nom`
  - `Nom : Description` (le nom sera extrait)

**Exemples acceptés** :

```
### Anciennes appellations

- Union sud-africaine
- Colonie du Cap
- Transvaal / South African Republic
```

```
### Anciens noms historiques

1. Numidie
2. Maurétanie
3. Algérie française
```

```
### Anciennes appellations

- **Cabo da Boa Esperança** (1488)
- **Terra dos Fumos**
- **Colonie du Cap**
```

#### 2.2. Description du pays (OPTIONNEL)

```
### Description

[Description détaillée du pays sur plusieurs lignes]
```

### 3. Section ETHNIES (OPTIONNEL)

```
## ETHNIES

### Nom de l'ethnie

**Ancien nom**: Ancien nom 1, Ancien nom 2

**Description**:
Description détaillée de l'ethnie sur plusieurs lignes.
Peut contenir plusieurs paragraphes.
```

**Règles** :

- Section `## ETHNIES` (ou `# ETHNIES`)
- Chaque ethnie commence par `### Nom de l'ethnie`
- **Ancien nom**: Maximum 3 noms, séparés par des virgules
- **Description**: Texte libre sur plusieurs lignes

## Exemples complets

### Exemple minimal (pays uniquement)

```
Afrique du Sud

## PAYS

### Anciennes appellations

- Union sud-africaine
- Colonie du Cap
- Transvaal

### Description

L'Afrique du Sud est un pays situé à l'extrémité australe du continent africain...
```

### Exemple complet (pays + ethnies)

```
Algérie

## PAYS

### Anciennes appellations

- Numidie
- Maurétanie
- Algérie française

### Description

L'Algérie est un pays d'Afrique du Nord...

## ETHNIES

### Arabes

**Ancien nom**: Arabes algériens, Maghrébins

**Description**:
Les Arabes représentent environ 85% de la population algérienne.
Ils sont le résultat d'une fusion arabo-berbère depuis le VIIe siècle...

### Berbères / Amazighs

**Ancien nom**: Imazighen, Berbères

**Description**:
Les Berbères sont les peuples autochtones de l'Algérie...
```

## Formats alternatifs acceptés

Le script de parsing est flexible et accepte plusieurs variantes :

### Variante 1 : Sans section PAYS explicite

```
Nom du pays

### Anciennes appellations

- Nom 1
- Nom 2
- Nom 3
```

### Variante 2 : Avec emojis et formatage

```
Nom du pays

🧭 Anciennes appellations

- **Nom 1**
- **Nom 2** (description)
- Nom 3
```

### Variante 3 : Format libre (moins recommandé)

```
Nom du pays

Résumé des anciens noms :

1. Nom 1
2. Nom 2
3. Nom 3
```

## Notes importantes

1. **Maximum 3 anciens noms** : Seuls les 3 premiers seront extraits
2. **Section PAYS** : Recommandée mais pas obligatoire si les anciennes appellations sont au début
3. **Section ETHNIES** : Optionnelle, seulement si vous voulez des descriptions détaillées par ethnie
4. **Encodage** : UTF-8
5. **Séparateurs** : Les sections peuvent être séparées par des lignes vides

## Détection automatique

Le script détecte automatiquement :

- Les sections "Anciennes appellations", "Anciens noms", "Anciens noms historiques"
- Les formats avec tirets, puces, numéros
- Les noms en gras `**Nom**`
- Les formats avec deux-points `Nom : Description`

## Exemple pour l'Afrique du Sud

Voici le format recommandé pour `afrique_du_sud.txt` :

```
Afrique du Sud

## PAYS

### Anciennes appellations

- Union sud-africaine (1910-1961)
- Colonie du Cap
- Transvaal / South African Republic

### Description

L'Afrique du Sud est un pays situé à l'extrémité australe du continent africain...

## ETHNIES

[Section optionnelle pour les descriptions d'ethnies]
```
