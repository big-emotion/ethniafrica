# AFRIK API v2 - Référence des Endpoints

## Base URL

```
https://your-domain.com/api/v2
```

## Format des réponses

### Réponse paginée

```json
{
  "data": [...],
  "meta": {
    "total": 54,
    "page": 1,
    "perPage": 20,
    "totalPages": 3
  }
}
```

### Réponse simple

```json
{
  "data": { ... }
}
```

### Erreur

```json
{
  "error": "Country not found"
}
```

## Codes de statut HTTP

- `200 OK` : Requête réussie
- `400 Bad Request` : Paramètres invalides
- `404 Not Found` : Ressource non trouvée
- `500 Internal Server Error` : Erreur serveur

---

## Pays (Countries)

### Liste des pays

**Endpoint** : `GET /api/v2/countries`

**Paramètres de query** :

- `page` (optionnel) : Numéro de page (défaut: 1)
- `perPage` (optionnel) : Nombre d'éléments par page (défaut: 20, max: 100)

**Exemple de requête** :

```bash
GET /api/v2/countries?page=1&perPage=10
```

**Exemple de réponse** :

```json
{
  "data": [
    {
      "id": "ZWE",
      "nameFr": "Zimbabwe",
      "content": {
        "etymology": "...",
        "geography": {...},
        "history": {...}
      }
    },
    ...
  ],
  "meta": {
    "total": 54,
    "page": 1,
    "perPage": 10,
    "totalPages": 6
  }
}
```

### Détails d'un pays

**Endpoint** : `GET /api/v2/countries/[iso]`

**Paramètres d'URL** :

- `iso` (requis) : Code ISO 3166-1 alpha-3 (3 lettres majuscules)

**Exemple de requête** :

```bash
GET /api/v2/countries/ZWE
```

**Exemple de réponse** :

```json
{
  "data": {
    "id": "ZWE",
    "nameFr": "Zimbabwe",
    "etymology": "Le nom 'Zimbabwe' vient du shona...",
    "nameOriginActor": "Auto-appellation",
    "content": {
      "geography": {
        "capital": "Harare",
        "area": 390757,
        "borders": ["ZMB", "MOZ", "ZAF", "BWA"]
      },
      "history": {...},
      "demography": {...}
    }
  }
}
```

**Erreurs possibles** :

- `400` : Format ISO invalide (doit être 3 lettres majuscules)
- `404` : Pays non trouvé

---

## Peuples (Peoples)

### Liste des peuples

**Endpoint** : `GET /api/v2/peoples`

**Paramètres de query** :

- `page` (optionnel) : Numéro de page (défaut: 1)
- `perPage` (optionnel) : Nombre d'éléments par page (défaut: 20, max: 100)

**Exemple de requête** :

```bash
GET /api/v2/peoples?page=1&perPage=20
```

**Exemple de réponse** :

```json
{
  "data": [
    {
      "id": "PPL_SHONA",
      "nameMain": "Shona",
      "languageFamilyId": "FLG_BANTU",
      "content": {
        "selfAppellation": "Shona",
        "distribution": {...},
        "history": {...}
      }
    },
    ...
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "perPage": 20,
    "totalPages": 8
  }
}
```

### Détails d'un peuple

**Endpoint** : `GET /api/v2/peoples/[id]`

**Paramètres d'URL** :

- `id` (requis) : Identifiant PPL\_ (format: `PPL_XXXXX`)

**Exemple de requête** :

```bash
GET /api/v2/peoples/PPL_SHONA
```

**Exemple de réponse** :

```json
{
  "data": {
    "id": "PPL_SHONA",
    "nameMain": "Shona",
    "languageFamilyId": "FLG_BANTU",
    "content": {
      "selfAppellation": "Shona",
      "exonyms": [...],
      "distribution": {
        "byCountry": [
          {
            "countryId": "ZWE",
            "population": 12000000,
            "percentageInCountry": 80
          }
        ]
      },
      "history": {...},
      "culture": {...}
    }
  }
}
```

**Erreurs possibles** :

- `400` : Format ID invalide (doit commencer par `PPL_`)
- `404` : Peuple non trouvé

---

## Familles linguistiques (Language Families)

### Liste des familles linguistiques

**Endpoint** : `GET /api/v2/language-families`

**Paramètres de query** :

- `page` (optionnel) : Numéro de page (défaut: 1)
- `perPage` (optionnel) : Nombre d'éléments par page (défaut: 20, max: 100)

**Exemple de requête** :

```bash
GET /api/v2/language-families?page=1&perPage=10
```

**Exemple de réponse** :

```json
{
  "data": [
    {
      "id": "FLG_BANTU",
      "nameFr": "Bantou",
      "nameEn": "Bantu",
      "content": {
        "decolonialHeader": {...},
        "generalInfo": {
          "branches": [...],
          "geographicArea": "Afrique centrale et australe",
          "numberOfLanguages": 500,
          "totalSpeakers": 350000000
        },
        "associatedPeoples": [...],
        "linguisticCharacteristics": {...}
      }
    },
    ...
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "perPage": 10,
    "totalPages": 3
  }
}
```

### Détails d'une famille linguistique

**Endpoint** : `GET /api/v2/language-families/[id]`

**Paramètres d'URL** :

- `id` (requis) : Identifiant FLG\_ (format: `FLG_XXXXX`)

**Exemple de requête** :

```bash
GET /api/v2/language-families/FLG_BANTU
```

**Exemple de réponse** :

```json
{
  "data": {
    "id": "FLG_BANTU",
    "nameFr": "Bantou",
    "nameEn": "Bantu",
    "content": {
      "decolonialHeader": {
        "historicalAppellations": ["Bantou"],
        "originOfHistoricalTerm": "Terme créé par Wilhelm Bleek en 1862",
        "selfAppellation": "Varie selon les langues",
        "contemporaryUsage": "Utilisé en linguistique"
      },
      "generalInfo": {...},
      "associatedPeoples": [
        {
          "name": "Shona",
          "peopleId": "PPL_SHONA"
        },
        ...
      ],
      "linguisticCharacteristics": {...},
      "historyAndOrigins": {...}
    }
  }
}
```

**Erreurs possibles** :

- `400` : Format ID invalide (doit commencer par `FLG_`)
- `404` : Famille linguistique non trouvée

---

## Recherche (Search)

### Recherche multi-entités

**Endpoint** : `GET /api/v2/search`

**Paramètres de query** :

- `query` (optionnel) : Terme de recherche (recherche dans les noms)
- `type` (optionnel) : Type d'entité (`country`, `people`, `language`, `languageFamily`)
- `languageFamilyId` (optionnel) : Filtrer par famille linguistique (format: `FLG_XXXXX`)
- `countryId` (optionnel) : Filtrer par pays (format: `XXX` - code ISO)

**Exemple de requête** :

```bash
# Recherche simple
GET /api/v2/search?query=Bantu

# Recherche par type
GET /api/v2/search?query=Zimbabwe&type=country

# Recherche avec filtre
GET /api/v2/search?type=people&languageFamilyId=FLG_BANTU

# Recherche de peuples dans un pays
GET /api/v2/search?type=people&countryId=ZWE
```

**Exemple de réponse** :

```json
{
  "data": [
    {
      "type": "languageFamily",
      "id": "FLG_BANTU",
      "data": {
        "id": "FLG_BANTU",
        "nameFr": "Bantou",
        "nameEn": "Bantu",
        "content": {
          "decolonialHeader": {...},
          "generalInfo": {...},
          "associatedPeoples": [...]
        }
      }
    },
    {
      "type": "people",
      "id": "PPL_SHONA",
      "data": {
        "id": "PPL_SHONA",
        "nameMain": "Shona",
        "languageFamilyId": "FLG_BANTU",
        "content": {
          "selfAppellation": "Shona",
          "distribution": {...},
          "history": {...}
        }
      }
    }
  ]
}
```

**Notes** :

- La recherche est insensible à la casse
- La recherche dans les pays inclut : ID, nom français, étymologie
- La recherche dans les peuples inclut : ID, nom principal, auto-appellation
- La recherche dans les familles linguistiques inclut : ID, nom français, nom anglais
- Les filtres peuvent être combinés

---

## Exemples d'utilisation

### Exemple 1 : Lister les 10 premiers pays

```bash
curl "https://api.example.com/api/v2/countries?page=1&perPage=10"
```

### Exemple 2 : Obtenir les détails du Zimbabwe

```bash
curl "https://api.example.com/api/v2/countries/ZWE"
```

### Exemple 3 : Rechercher tous les peuples de la famille Bantou

```bash
curl "https://api.example.com/api/v2/search?type=people&languageFamilyId=FLG_BANTU"
```

### Exemple 4 : Rechercher "Shona" dans toutes les entités

```bash
curl "https://api.example.com/api/v2/search?query=Shona"
```

### Exemple 5 : Pagination - Page 2 des peuples

```bash
curl "https://api.example.com/api/v2/peoples?page=2&perPage=20"
```

---

## Validation des paramètres

### Codes ISO (pays)

- Format : 3 lettres majuscules
- Exemples valides : `ZWE`, `CMR`, `ZAF`
- Exemples invalides : `zwe`, `ZW`, `ZWE1`

### Identifiants PPL\_ (peuples)

- Format : `PPL_` suivi de lettres majuscules et underscores
- Exemples valides : `PPL_SHONA`, `PPL_BAMBARA`
- Exemples invalides : `ppl_shona`, `PPL-`, `SHONA`

### Identifiants FLG\_ (familles linguistiques)

- Format : `FLG_` suivi de lettres majuscules et underscores
- Exemples valides : `FLG_BANTU`, `FLG_NIGERCONGO`
- Exemples invalides : `flg_bantu`, `FLG-`, `BANTU`

### Paramètres de pagination

- `page` : Entier positif (défaut: 1)
- `perPage` : Entier entre 1 et 100 (défaut: 20)
- Les valeurs invalides sont remplacées par les valeurs par défaut

---

## Limites et contraintes

### Pagination

- Maximum `perPage` : 100 éléments
- Les valeurs supérieures sont automatiquement limitées à 100

### Recherche

- La recherche est actuellement en mémoire (tous les fichiers sont chargés)
- Performance : Optimale pour < 1000 entités par type
- Future amélioration : Recherche indexée en base de données (Step 9)

### Cache

- Les données sont mises en cache en mémoire au niveau des loaders
- Le cache est partagé entre toutes les requêtes
- Pas d'invalidation automatique (redémarrage du serveur nécessaire)

---

## Évolutions futures

### Step 9 : Migration vers base de données

- Les endpoints resteront identiques
- Performance améliorée avec indexes PostgreSQL
- Recherche full-text native
- Cache HTTP avec Next.js `unstable_cache`

### Améliorations prévues

- Filtres avancés dans les listes
- Tri personnalisé
- Champs sélectionnables (projection)
- Versioning des données

---

## Support

Pour plus d'informations :

- [README.md](./README.md) - Vue d'ensemble
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Détails techniques
- [../../docs/IMPLEMENTATION_PROGRESS.md](../../docs/IMPLEMENTATION_PROGRESS.md) - Progression
