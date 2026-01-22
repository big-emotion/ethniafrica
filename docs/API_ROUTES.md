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

#### 3.2 Détails d'un pays

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
    "description": "Description complète du pays...",
    "ancientNames": ["Royaume du Maroc", "Al-Maghrib"],
    "topEthnicities": [
      {
        "name": "Arabes",
        "languages": ["Arabe", "Darija"]
      }
    ],
    "ethnicities": [
      {
        "name": "Arabes",
        "population": 30000000,
        "percentageInCountry": 75,
        "percentageInRegion": 20.36,
        "percentageInAfrica": 1.96,
        "region": "Nord, Centre"
      }
    ]
  }
  ```
- **Champs enrichis** (si disponibles)
  - `description` : Description complète du pays
  - `ancientNames` : Tableau des anciens noms du pays (max 3)
  - `topEthnicities` : Tableau des 5 principales ethnies avec leurs langues
  - `ethnicities[].region` : Région géographique précise dans le pays
- **Erreurs**
  - `404` : `{"error": "Country not found"}`
  - `500` : `{"error": "Failed to fetch country"}`

---

### 4. Ethnies

#### 4.1 Liste des ethnies

`GET /api/ethnicities`

- **Description** : Retourne toutes les ethnies, incluant les groupes parent et les sous-groupes.
- **Réponse 200**
  ```json
  {
    "ethnicities": [
      {
        "name": "Arabes",
        "totalPopulation": 78956975,
        "percentageInAfrica": 5.16,
        "countryCount": 15,
        "isSubgroup": false,
        "parentId": null
      },
      {
        "name": "Arabes du Maghreb",
        "totalPopulation": 50000000,
        "percentageInAfrica": 3.27,
        "countryCount": 5,
        "isSubgroup": true,
        "parentId": "uuid-du-groupe-parent"
      }
    ]
  }
  ```
- **Champs enrichis**
  - `isSubgroup` : Booléen indiquant si c'est un sous-groupe
  - `parentId` : ID du groupe parent (si sous-groupe, `null` sinon)
- **Note** : Les sous-groupes apparaissent dans cette liste et sont comptés séparément dans les statistiques.
- **Erreurs**
  - `500` : `{"error": "Failed to fetch ethnicities"}`

#### 4.2 Détails d'une ethnie

`GET /api/ethnicities/{name}`

- **Paramètres path**
  - `name` : nom de l'ethnie (encoder les caractères spéciaux)
- **Réponse 200 (extrait)**
  ```json
  {
    "name": "Arabes",
    "totalPopulation": 78956975,
    "percentageInAfrica": 5.16,
    "description": "Description complète du groupe ethnique...",
    "ancientName": ["Arabes du Maghreb", "Maures"],
    "societyType": "Sédentaire urbaine & agricole",
    "religion": "Islam",
    "linguisticFamily": "Afro-asiatique",
    "historicalStatus": "Empires arabes",
    "regionalPresence": "Maroc, Algérie, Tunisie, Libye, Égypte",
    "topLanguages": ["Arabe", "Darija", "Tamazight"],
    "isSubgroup": false,
    "parentId": null,
    "subgroups": [
      {
        "name": "Arabes du Maghreb",
        "slug": "arabesDuMaghreb",
        "totalPopulation": 50000000
      }
    ],
    "countries": [
      {
        "country": "Maroc",
        "region": "Afrique du Nord",
        "population": 25650000,
        "percentageInCountry": 66,
        "percentageInRegion": 9.36,
        "percentageInAfrica": 1.68,
        "region": "Nord, Centre"
      }
    ]
  }
  ```
- **Champs enrichis** (si disponibles)
  - `description` : Description complète du groupe ethnique
  - `ancientName` : Tableau des anciens noms (max 3)
  - `societyType` : Type de société (ex. "Sédentaire urbaine & agricole")
  - `religion` : Religion(s) pratiquée(s)
  - `linguisticFamily` : Famille linguistique
  - `historicalStatus` : Statut historique (ex. "Royaume du Dahomey")
  - `regionalPresence` : Liste des pays où le groupe est présent
  - `topLanguages` : Tableau des 5 principales langues
  - `isSubgroup` : Booléen indiquant si c'est un sous-groupe
  - `parentId` : ID du groupe parent (si sous-groupe)
  - `subgroups` : Tableau des sous-groupes (si groupe parent)
  - `countries[].region` : Région géographique précise dans le pays
- **Erreurs**
  - `404` : `{"error": "Ethnicity not found"}`
  - `500` : `{"error": "Failed to fetch ethnicity"}`

---

### 5. Téléchargement de données

#### 5.1 Télécharger toutes les données (CSV)

`GET /api/download?format=csv`

- **Description** : Télécharge toutes les données du dataset en format CSV compressé dans un fichier ZIP. Les fichiers CSV incluent tous les champs enrichis (descriptions, anciens noms, informations culturelles, etc.).
- **Paramètres query**
  - `format` : `csv` (obligatoire)
- **Réponse 200**
  - **Content-Type** : `application/zip`
  - **Content-Disposition** : `attachment; filename="ethniafrique-atlas-data.zip"`
  - **Corps** : Fichier ZIP contenant tous les fichiers CSV du dataset organisés par région/pays
- **Format des CSV** : Chaque fichier CSV contient les colonnes suivantes :
  - **Colonnes de base** : `Group`, `Sub_group`, `Population_2025`, `Percentage_in_country`, `Percentage_in_Africa`
  - **Colonnes enrichies** : `Language`, `Region`, `Sources`, `Ancient_Name`, `Description`, `Type_de_societe`, `Religion`, `Famille_linguistique`, `Statut_historique`, `Presence_regionale`

  **Structure des données** :
  - Les groupes parents sont exportés avec `Sub_group` vide
  - Les sous-groupes sont exportés avec le nom du groupe parent dans `Group` et le nom du sous-groupe dans `Sub_group`
  - Les langues multiples sont séparées par `; `
  - Les sources multiples sont séparées par `; `
  - Les valeurs contenant des virgules, guillemets ou sauts de ligne sont correctement échappées

- **Erreurs**
  - `400` : `{"error": "Invalid format. Use 'csv' or 'excel'"}`
  - `500` : `{"error": "Failed to generate download"}`

#### 5.2 Télécharger toutes les données (Excel)

`GET /api/download?format=excel`

- **Description** : Télécharge toutes les données du dataset en format Excel (XLSX) avec plusieurs feuilles. Les données incluent tous les champs enrichis.
- **Paramètres query**
  - `format` : `excel` (obligatoire)
- **Réponse 200**
  - **Content-Type** : `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - **Content-Disposition** : `attachment; filename="ethniafrique-atlas-data.xlsx"`
  - **Corps** : Fichier Excel avec les feuilles suivantes :
    - **Summary** : Statistiques globales (population totale, nombre de régions, nombre de pays, nombre d'ethnies incluant sous-groupes)
    - **Feuilles par région** : Une feuille par région avec les pays et leurs statistiques, incluant les données enrichies
- **Données enrichies incluses** : Descriptions, anciens noms, informations culturelles, langues, sources, relations parent/sous-groupes
- **Erreurs**
  - `400` : `{"error": "Invalid format. Use 'csv' or 'excel'"}`
  - `500` : `{"error": "Failed to generate download"}`

---

### 6. Codes d'erreur génériques

| Code | Description                       |
| ---- | --------------------------------- |
| 200  | Requête réussie                   |
| 404  | Ressource non trouvée             |
| 500  | Erreur interne lors de la requête |

---

### 7. Exemples d'utilisation (curl)

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

# Télécharger toutes les données (CSV)
curl http://localhost:3000/api/download?format=csv -o data.zip

# Télécharger toutes les données (Excel)
curl http://localhost:3000/api/download?format=excel -o data.xlsx
```

---

### 8. Données enrichies et relations hiérarchiques

#### 8.1 Groupes parent/sous-groupes

Les groupes ethniques peuvent avoir une relation hiérarchique :

- **Groupe parent** : Groupe principal (ex. "Berbères")
- **Sous-groupe** : Groupe lié à un parent via `parent_id` (ex. "Amazigh" sous "Berbères")

Les sous-groupes :

- Apparaissent dans la liste des ethnies (`GET /api/ethnicities`)
- Sont comptés séparément dans les statistiques
- Ont leur propre page détaillée accessible via leur slug
- Peuvent avoir leurs propres sous-groupes (hiérarchie multi-niveaux)

#### 8.2 Champs enrichis disponibles

**Pour les pays** :

- `description` : Description complète du pays
- `ancientNames` : Anciens noms du pays (max 3)
- `topEthnicities` : Top 5 des ethnies principales avec leurs langues

**Pour les groupes ethniques** :

- `description` : Description complète du groupe
- `ancientName` : Anciens noms (max 3)
- `societyType` : Type de société
- `religion` : Religion(s) pratiquée(s)
- `linguisticFamily` : Famille linguistique
- `historicalStatus` : Statut historique
- `regionalPresence` : Liste des pays de présence
- `topLanguages` : Top 5 des langues principales
- `languages` : Toutes les langues avec indicateur primaire
- `sources` : Sources de données associées
- `isSubgroup` : Indicateur de sous-groupe
- `parentId` : ID du groupe parent (si applicable)
- `subgroups` : Liste des sous-groupes (si groupe parent)

**Pour les presences** :

- `region` : Région géographique précise dans le pays

---

### 9. Documentation interactive

#### 9.1 API v1

- **Swagger UI v1** : `http://localhost:3000/docs/api/v1`
- **Spécification JSON v1** : `http://localhost:3000/api/docs/v1`

#### 9.2 API v2 (AFRIK)

- **Swagger UI v2** : `http://localhost:3000/docs/api/v2`
- **Spécification JSON v2** : `http://localhost:3000/api/docs/v2`

#### 9.3 Page d'index

- **Page de sélection** : `http://localhost:3000/docs/api` (choix entre v1 et v2)

> Les annotations Swagger sont maintenues dans les fichiers Route Handlers (`src/app/api/**/route.ts`). La génération des specs est centralisée dans `src/lib/api/openapiV1.ts` (v1) et `src/lib/api/openapiV2.ts` (v2).

### 10. Contributions (API publique)

#### 10.1 Soumettre une contribution

`POST /api/contributions`

- **Description** : Permet aux utilisateurs de soumettre des contributions pour ajouter ou modifier des groupes ethniques.
- **Authentification** : Aucune (publique)
- **Body (JSON)**
  ```json
  {
    "type": "new_ethnicity" | "update_ethnicity",
    "proposed_payload": {
      "name_fr": "Nom en français",
      "name_en": "Name in English",
      "total_population": 1000000,
      "parent_id": "uuid-ou-null"
    },
    "contributor_name": "Nom du contributeur (optionnel)",
    "contributor_email": "email@example.com (optionnel)",
    "notes": "Notes additionnelles (optionnel)"
  }
  ```
- **Réponse 200**
  ```json
  {
    "success": true,
    "message": "Contribution submitted successfully",
    "id": "uuid-de-la-contribution"
  }
  ```
- **Erreurs**
  - `400` : `{"error": "Invalid input", "details": [...]}`
  - `500` : `{"error": "Failed to submit contribution"}`

#### 10.2 Récupérer les entités pour le formulaire

`GET /api/contributions/entities/regions`
`GET /api/contributions/entities/countries`
`GET /api/contributions/entities/ethnicities`

- **Description** : Récupère la liste des régions, pays ou ethnies pour les formulaires de contribution.
- **Authentification** : Aucune (publique)
- **Réponse 200** (exemple pour ethnicities)
  ```json
  {
    "ethnicities": [
      {
        "id": "uuid",
        "slug": "akan",
        "name_fr": "Akan",
        "parent_id": null
      }
    ]
  }
  ```

---

### 11. Interface Admin (API protégée)

> **Note** : Ces routes nécessitent une authentification admin. Voir la section "Interface Admin" du README.

#### 11.1 Login admin

`POST /api/admin/login`

- **Description** : Authentification admin avec username/password.
- **Body (JSON)**
  ```json
  {
    "username": "admin",
    "password": "password"
  }
  ```
- **Réponse 200**
  - Cookie de session `admin_session` défini (httpOnly, secure)
  ```json
  {
    "success": true,
    "message": "Login successful"
  }
  ```
- **Erreurs**
  - `400` : `{"error": "Username and password are required"}`
  - `401` : `{"error": "Invalid credentials"}`

#### 11.2 Logout admin

`POST /api/admin/logout`

- **Description** : Déconnexion admin (supprime le cookie de session).
- **Authentification** : Cookie de session requis
- **Réponse 200**
  ```json
  {
    "success": true,
    "message": "Logout successful"
  }
  ```

#### 11.3 Lister les contributions en attente

`GET /api/admin/contributions`

- **Description** : Récupère toutes les contributions avec le statut "pending".
- **Authentification** : Cookie de session admin requis
- **Réponse 200**
  ```json
  [
    {
      "id": "uuid",
      "type": "new_ethnicity",
      "proposed_payload": {...},
      "status": "pending",
      "created_at": "2025-01-XX...",
      "contributor_name": "...",
      "contributor_email": "...",
      "notes": "..."
    }
  ]
  ```
- **Erreurs**
  - `401` : `{"error": "Unauthorized"}`
  - `500` : `{"error": "Failed to fetch contributions"}`

#### 11.4 Modérer une contribution

`PATCH /api/admin/contributions/{id}`

- **Description** : Accepter ou rejeter une contribution.
- **Authentification** : Cookie de session admin requis
- **Body (JSON)**
  ```json
  {
    "action": "approve" | "reject",
    "moderator_notes": "Notes du modérateur (optionnel)"
  }
  ```
- **Réponse 200**
  ```json
  {
    "success": true,
    "message": "Contribution approved/rejected"
  }
  ```
- **Erreurs**
  - `400` : `{"error": "Invalid action. Must be 'approve' or 'reject'"}`
  - `401` : `{"error": "Unauthorized"}`
  - `404` : `{"error": "Contribution not found"}`
  - `500` : `{"error": "Failed to update contribution"}`

---

### 12. CORS

- `Access-Control-Allow-Origin` : `CORS_ALLOWED_ORIGIN` (si défini) sinon `*`
- `Access-Control-Allow-Methods` : `GET, OPTIONS, POST, PATCH` (selon la route)
- `Access-Control-Allow-Headers` : `Content-Type, Authorization`
- `Access-Control-Allow-Credentials` : `true` (pour les cookies de session admin)
- Réponse `OPTIONS` : statut `204` avec les mêmes en-têtes

---

## 13. API v2 - AFRIK

L'API v2 est une refonte basée sur les données AFRIK (méthodologie AFRIK). Elle utilise des identifiants stables et un format de réponse standardisé avec pagination.

### 13.1 Introduction

**Différences avec l'API v1** :

- Identifiants stables et immutables (FLG*\*, PPL*\*, codes ISO 3166-1 alpha-3)
- Format de réponse standardisé avec pagination
- Contenu évolutif stocké en JSONB (pas de migration de schéma nécessaire)
- Architecture basée sur les données AFRIK

**Identifiants** :

- **Pays** : Code ISO 3166-1 alpha-3 (ex: `ZWE`, `CMR`, `COM`)
- **Peuples** : Format `PPL_*` (ex: `PPL_SHONA`, `PPL_COMORIEN`)
- **Familles linguistiques** : Format `FLG_*` (ex: `FLG_BANTU`, `FLG_MANDE`)

**Format de réponse standardisé** :

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "perPage": 20,
    "totalPages": 5
  }
}
```

**Cache** : Toutes les réponses sont mises en cache pendant 24h (`Cache-Control: public, max-age=86400`)

---

### 13.2 Recherche

`GET /api/v2/search`

- **Description** : Recherche multi-entités dans les pays, peuples, langues et familles linguistiques
- **Paramètres de requête** (tous optionnels) :
  - `query` (string) : Terme de recherche
  - `type` (string) : Filtrer par type (`country`, `people`, `language`, `languageFamily`)
  - `languageFamilyId` (string) : Filtrer par famille linguistique (format `FLG_*`)
  - `countryId` (string) : Filtrer par pays (code ISO 3166-1 alpha-3)
- **Réponse 200**
  ```json
  {
    "data": [
      {
        "type": "people",
        "id": "PPL_SHONA",
        "name": "Shona",
        "snippet": "Peuple bantou du Zimbabwe...",
        "relevance": 0.95
      }
    ]
  }
  ```
- **Erreurs**
  - `500` : `{"error": "Internal server error"}`

**Exemple** :

```bash
curl "http://localhost:3000/api/v2/search?query=Bantu&type=people"
curl "http://localhost:3000/api/v2/search?query=Zimbabwe&type=country"
curl "http://localhost:3000/api/v2/search?languageFamilyId=FLG_BANTU&countryId=ZWE"
```

---

### 13.3 Pays

#### 13.3.1 Liste des pays

`GET /api/v2/countries`

- **Description** : Liste paginée de tous les pays d'Afrique
- **Paramètres de requête** :
  - `page` (integer, défaut: 1) : Numéro de page
  - `perPage` (integer, défaut: 20, max: 100) : Nombre d'éléments par page
- **Réponse 200**
  ```json
  {
    "data": [
      {
        "id": "ZWE",
        "nameFr": "Zimbabwe",
        "nameOfficial": "Republic of Zimbabwe",
        "etymology": "Nom dérivé de...",
        "content": {
          "historicalNames": {...},
          "kingdoms": [...],
          "majorPeoples": [...],
          "culture": {...},
          "sources": [...]
        }
      }
    ],
    "meta": {
      "total": 55,
      "page": 1,
      "perPage": 20,
      "totalPages": 3
    }
  }
  ```
- **Erreurs**
  - `500` : `{"error": "Internal server error"}`

**Exemple** :

```bash
curl "http://localhost:3000/api/v2/countries?page=1&perPage=20"
```

#### 13.3.2 Détails d'un pays

`GET /api/v2/countries/{iso}`

- **Description** : Détails complets d'un pays par son code ISO
- **Paramètres path** :
  - `iso` : Code ISO 3166-1 alpha-3 (3 lettres majuscules, ex: `ZWE`, `CMR`)
- **Réponse 200**
  ```json
  {
    "data": {
      "id": "ZWE",
      "nameFr": "Zimbabwe",
      "nameOfficial": "Republic of Zimbabwe",
      "etymology": "Nom dérivé de...",
      "content": {
        "historicalNames": {
          "antiquity": "...",
          "middleAges": "...",
          "precolonial": "...",
          "colonization": "...",
          "contemporary": "..."
        },
        "kingdoms": [
          {
            "name": "Royaume du Zimbabwe",
            "period": "XIe-XVe siècle",
            "dominantPeoples": ["Shona"],
            "politicalCenters": ["Grand Zimbabwe"]
          }
        ],
        "majorPeoples": [...],
        "culture": {...},
        "historicalFacts": {...},
        "sources": [...]
      }
    }
  }
  ```
- **Erreurs**
  - `400` : `{"error": "Invalid country ISO code format"}` (format invalide)
  - `404` : `{"error": "Country not found"}` (pays non trouvé)
  - `500` : `{"error": "Internal server error"}`

**Exemple** :

```bash
curl "http://localhost:3000/api/v2/countries/ZWE"
curl "http://localhost:3000/api/v2/countries/CMR"
```

---

### 13.4 Peuples

#### 13.4.1 Liste des peuples

`GET /api/v2/peoples`

- **Description** : Liste paginée de tous les peuples d'Afrique
- **Paramètres de requête** :
  - `page` (integer, défaut: 1) : Numéro de page
  - `perPage` (integer, défaut: 20, max: 100) : Nombre d'éléments par page
- **Réponse 200**
  ```json
  {
    "data": [
      {
        "id": "PPL_SHONA",
        "nameMain": "Shona",
        "languageFamilyId": "FLG_BANTU",
        "currentCountries": ["ZWE", "MOZ"],
        "content": {
          "appellations": {...},
          "origins": {...},
          "organization": {...},
          "languages": {...},
          "culture": {...},
          "historicalRole": {...},
          "demography": {...},
          "sources": [...]
        }
      }
    ],
    "meta": {
      "total": 592,
      "page": 1,
      "perPage": 20,
      "totalPages": 30
    }
  }
  ```
- **Erreurs**
  - `500` : `{"error": "Internal server error"}`

**Exemple** :

```bash
curl "http://localhost:3000/api/v2/peoples?page=1&perPage=20"
```

#### 13.4.2 Détails d'un peuple

`GET /api/v2/peoples/{id}`

- **Description** : Détails complets d'un peuple par son identifiant
- **Paramètres path** :
  - `id` : Identifiant du peuple (format `PPL_*`, ex: `PPL_SHONA`, `PPL_COMORIEN`)
- **Réponse 200**
  ```json
  {
    "data": {
      "id": "PPL_SHONA",
      "nameMain": "Shona",
      "languageFamilyId": "FLG_BANTU",
      "currentCountries": ["ZWE", "MOZ"],
      "content": {
        "appellations": {
          "selfAppellation": "Shona",
          "exonyms": ["Mashona"],
          "historicalNames": [...],
          "appellationRemarks": "..."
        },
        "origins": {
          "formation": "...",
          "migrations": [...],
          "historicalContext": "..."
        },
        "organization": {...},
        "languages": {
          "primary": "sna",
          "languages": [
            {
              "id": "sna",
              "name": "Shona",
              "isPrimary": true
            }
          ]
        },
        "culture": {...},
        "historicalRole": {...},
        "demography": {
          "totalPopulation": 15000000,
          "distribution": [...]
        },
        "sources": [...]
      }
    }
  }
  ```
- **Erreurs**
  - `400` : `{"error": "Invalid people ID format"}` (format invalide, doit être `PPL_*`)
  - `404` : `{"error": "People not found"}` (peuple non trouvé)
  - `500` : `{"error": "Internal server error"}`

**Exemple** :

```bash
curl "http://localhost:3000/api/v2/peoples/PPL_SHONA"
curl "http://localhost:3000/api/v2/peoples/PPL_COMORIEN"
```

---

### 13.5 Familles linguistiques

#### 13.5.1 Liste des familles linguistiques

`GET /api/v2/language-families`

- **Description** : Liste paginée de toutes les familles linguistiques d'Afrique
- **Paramètres de requête** :
  - `page` (integer, défaut: 1) : Numéro de page
  - `perPage` (integer, défaut: 20, max: 100) : Nombre d'éléments par page
- **Réponse 200**
  ```json
  {
    "data": [
      {
        "id": "FLG_BANTU",
        "nameFr": "Bantou",
        "nameEn": "Bantu",
        "content": {
          "geographicDistribution": "...",
          "subfamilies": [...],
          "languages": [...],
          "historicalContext": "...",
          "sources": [...]
        }
      }
    ],
    "meta": {
      "total": 24,
      "page": 1,
      "perPage": 20,
      "totalPages": 2
    }
  }
  ```
- **Erreurs**
  - `500` : `{"error": "Internal server error"}`

**Exemple** :

```bash
curl "http://localhost:3000/api/v2/language-families?page=1&perPage=20"
```

#### 13.5.2 Détails d'une famille linguistique

`GET /api/v2/language-families/{id}`

- **Description** : Détails complets d'une famille linguistique par son identifiant
- **Paramètres path** :
  - `id` : Identifiant de la famille linguistique (format `FLG_*`, ex: `FLG_BANTU`, `FLG_MANDE`)
- **Réponse 200**
  ```json
  {
    "data": {
      "id": "FLG_BANTU",
      "nameFr": "Bantou",
      "nameEn": "Bantu",
      "content": {
        "geographicDistribution": "Afrique centrale, orientale et australe",
        "subfamilies": [
          {
            "name": "Bantou central",
            "languages": [...]
          }
        ],
        "languages": [
          {
            "id": "sna",
            "name": "Shona",
            "speakers": 15000000
          }
        ],
        "historicalContext": "...",
        "sources": [...]
      }
    }
  }
  ```
- **Erreurs**
  - `400` : `{"error": "Invalid language family ID format"}` (format invalide, doit être `FLG_*`)
  - `404` : `{"error": "Language family not found"}` (famille linguistique non trouvée)
  - `500` : `{"error": "Internal server error"}`

**Exemple** :

```bash
curl "http://localhost:3000/api/v2/language-families/FLG_BANTU"
curl "http://localhost:3000/api/v2/language-families/FLG_MANDE"
```

---

### 13.6 Format des réponses

#### Structure standardisée

Toutes les réponses suivent le format `ApiResponse<T>` :

**Liste paginée** :

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "perPage": 20,
    "totalPages": 5
  }
}
```

**Détail unique** :

```json
{
  "data": {...}
}
```

**Erreur** :

```json
{
  "error": "Message d'erreur"
}
```

#### Codes HTTP

- `200` : Succès
- `400` : Requête invalide (format d'identifiant incorrect)
- `404` : Ressource non trouvée
- `500` : Erreur serveur

#### Cache-Control

Toutes les réponses incluent l'en-tête :

```
Cache-Control: public, max-age=86400, s-maxage=86400
```

Le cache est valide pendant 24 heures.

---

### 13.7 Exemples d'utilisation

#### Recherche simple

```bash
# Rechercher "Bantu" dans tous les types
curl "http://localhost:3000/api/v2/search?query=Bantu"

# Rechercher uniquement dans les peuples
curl "http://localhost:3000/api/v2/search?query=Shona&type=people"

# Rechercher avec filtres
curl "http://localhost:3000/api/v2/search?query=Zimbabwe&type=country&languageFamilyId=FLG_BANTU"
```

#### Navigation paginée

```bash
# Première page (20 éléments)
curl "http://localhost:3000/api/v2/peoples?page=1&perPage=20"

# Deuxième page
curl "http://localhost:3000/api/v2/peoples?page=2&perPage=20"

# Plus d'éléments par page (max 100)
curl "http://localhost:3000/api/v2/peoples?page=1&perPage=100"
```

#### Accès aux détails

```bash
# Détails d'un pays
curl "http://localhost:3000/api/v2/countries/ZWE"

# Détails d'un peuple
curl "http://localhost:3000/api/v2/peoples/PPL_SHONA"

# Détails d'une famille linguistique
curl "http://localhost:3000/api/v2/language-families/FLG_BANTU"
```

#### Cas d'usage courants

**1. Lister tous les peuples d'une famille linguistique** :

```bash
# Étape 1 : Obtenir les détails de la famille linguistique
curl "http://localhost:3000/api/v2/language-families/FLG_BANTU"

# Étape 2 : Filtrer les peuples par famille linguistique
curl "http://localhost:3000/api/v2/search?type=people&languageFamilyId=FLG_BANTU"
```

**2. Trouver tous les peuples d'un pays** :

```bash
curl "http://localhost:3000/api/v2/search?type=people&countryId=ZWE"
```

**3. Recherche multi-critères** :

```bash
curl "http://localhost:3000/api/v2/search?query=Shona&type=people&languageFamilyId=FLG_BANTU&countryId=ZWE"
```

---

### 13.8 Documentation interactive

L'API v2 est documentée dans l'interface Swagger UI dédiée :

- **Swagger UI v2** : `http://localhost:3000/docs/api/v2`
- **Spécification OpenAPI JSON v2** : `http://localhost:3000/api/docs/v2`

Les routes v2 apparaissent dans les sections :

- `API v2 - Search`
- `API v2 - Countries`
- `API v2 - Peoples`
- `API v2 - Language Families`

> Note : L'API v2 a sa propre documentation séparée de l'API v1. Consultez la section 9 pour plus d'informations sur l'accès aux documentations.
