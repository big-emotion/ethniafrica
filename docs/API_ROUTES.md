## API Publique – Ethniafrique Atlas

L’API REST permet d’accéder aux données démographiques et ethniques de l’Afrique. Toutes les réponses sont renvoyées au format JSON.

Base URL (développement) : `http://localhost:3000`

> En production, adaptez l’URL en fonction du domaine du site.

---

### 1. Statistiques globales

`GET /api/stats`

- **Description** : Population totale de l’Afrique.
- **Réponse 200**
  ```json
  {
    "totalPopulationAfrica": 1528273044
  }
  ```
- **Erreurs**
  - `500` : `{"error": "Failed to fetch statistics"}`

---

### 2. Régions

#### 2.1 Liste des régions

`GET /api/regions`

- **Description** : Retourne toutes les régions.
- **Réponse 200 (extrait)**
  ```json
  {
    "regions": [
      {
        "key": "afrique_du_nord",
        "data": {
          "name": "Afrique du Nord",
          "totalPopulation": 274113455,
          "countries": {
            "Algérie": { "...": "..." }
          },
          "ethnicities": { "...": "..." }
        }
      }
    ]
  }
  ```
- **Erreurs**
  - `500` : `{"error": "Failed to fetch regions"}`

#### 2.2 Détails d’une région

`GET /api/regions/{key}`

- **Paramètres path**
  - `key` : clé de la région (`afrique_du_nord`, `afrique_de_l_ouest`, `afrique_centrale`, `afrique_de_l_est`, `afrique_australe`)
- **Réponse 200**
  ```json
  {
    "name": "Afrique du Nord",
    "totalPopulation": 274113455,
    "countries": { "...": "..." },
    "ethnicities": { "...": "..." }
  }
  ```
- **Erreurs**
  - `404` : `{"error": "Region not found"}`
  - `500` : `{"error": "Failed to fetch region"}`

#### 2.3 Pays d’une région

`GET /api/regions/{key}/countries`

- **Description** : Liste les pays de la région.
- **Réponse 200**
  ```json
  {
    "countries": [
      {
        "name": "Maroc",
        "data": {
          "population": 38843577,
          "percentageInRegion": 14.17,
          "percentageInAfrica": 2.54
        }
      }
    ]
  }
  ```
- **Erreurs**
  - `404` : région inexistante
  - `500` : erreur serveur

---

### 3. Pays

#### 3.1 Liste des pays

`GET /api/countries`

- **Description** : Retourne tous les pays avec leur région et statistiques.
- **Réponse 200**
  ```json
  {
    "countries": [
      {
        "name": "Maroc",
        "region": "afrique_du_nord",
        "regionName": "Afrique du Nord",
        "data": {
          "population": 38843577,
          "percentageInRegion": 14.17,
          "percentageInAfrica": 2.54,
          "ethnicityCount": 2
        }
      }
    ]
  }
  ```
- **Erreurs**
  - `500` : `{"error": "Failed to fetch countries"}`

#### 3.2 Détails d’un pays

`GET /api/countries/{name}`

- **Paramètres path**
  - `name` : nom du pays (encoder les caractères spéciaux)
- **Réponse 200 (extrait)**
  ```json
  {
    "name": "Maroc",
    "population": 38843577,
    "percentageInRegion": 14.17,
    "percentageInAfrica": 2.54,
    "region": "Afrique du Nord",
    "ethnicities": [
      {
        "name": "Arabes",
        "population": 30000000,
        "percentageInCountry": 75,
        "percentageInRegion": 20.36,
        "percentageInAfrica": 1.96
      }
    ]
  }
  ```
- **Erreurs**
  - `404` : `{"error": "Country not found"}`
  - `500` : `{"error": "Failed to fetch country"}`

---

### 4. Ethnies

#### 4.1 Liste des ethnies

`GET /api/ethnicities`

- **Réponse 200**
  ```json
  {
    "ethnicities": [
      {
        "name": "Arabes",
        "totalPopulation": 78956975,
        "percentageInAfrica": 5.16,
        "countryCount": 15
      }
    ]
  }
  ```
- **Erreurs**
  - `500` : `{"error": "Failed to fetch ethnicities"}`

#### 4.2 Détails d’une ethnie

`GET /api/ethnicities/{name}`

- **Paramètres path**
  - `name` : nom de l’ethnie (encoder les caractères spéciaux)
- **Réponse 200 (extrait)**
  ```json
  {
    "name": "Arabes",
    "totalPopulation": 78956975,
    "percentageInAfrica": 5.16,
    "countries": [
      {
        "country": "Maroc",
        "region": "Afrique du Nord",
        "population": 25650000,
        "percentageInCountry": 66,
        "percentageInRegion": 9.36,
        "percentageInAfrica": 1.68
      }
    ]
  }
  ```
- **Erreurs**
  - `404` : `{"error": "Ethnicity not found"}`
  - `500` : `{"error": "Failed to fetch ethnicity"}`

---

### 5. Codes d’erreur génériques

| Code | Description                       |
| ---- | --------------------------------- |
| 200  | Requête réussie                   |
| 404  | Ressource non trouvée             |
| 500  | Erreur interne lors de la requête |

---

### 6. Exemples d’utilisation (curl)

```bash
# Statistiques globales
curl http://localhost:3000/api/stats

# Liste des régions
curl http://localhost:3000/api/regions

# Détails d'une région
curl http://localhost:3000/api/regions/afrique_du_nord

# Pays d'une région
curl http://localhost:3000/api/regions/afrique_du_nord/countries

# Liste des pays
curl http://localhost:3000/api/countries

# Détails d'un pays (encoder les caractères spéciaux)
curl http://localhost:3000/api/countries/Maroc
curl "http://localhost:3000/api/countries/Côte%20d'Ivoire"

# Liste des ethnies
curl http://localhost:3000/api/ethnicities

# Détails d'une ethnie
curl http://localhost:3000/api/ethnicities/Arabes
```

---

### 7. Documentation interactive

- Swagger UI : `http://localhost:3000/docs/api`
- Spécification JSON : `http://localhost:3000/api/docs` (même endpoint)

> Les annotations Swagger sont maintenues dans les fichiers Route Handlers (`src/app/api/**/route.ts`). La génération de la spec est centralisée dans `src/lib/api/openapi.ts`.

### 8. CORS

- `Access-Control-Allow-Origin` : `CORS_ALLOWED_ORIGIN` (si défini) sinon `*`
- `Access-Control-Allow-Methods` : `GET, OPTIONS`
- `Access-Control-Allow-Headers` : `Content-Type, Authorization`
- Réponse `OPTIONS` : statut `204` avec les mêmes en-têtes
