# AFRIK API v2 - Documentation

## Vue d'ensemble

L'API v2 est une refonte complète de l'API AFRIK, conçue avec une architecture en couches claire et des principes de conception solides. Elle fournit un accès structuré aux données ethnographiques et linguistiques de l'Afrique.

## Architecture

L'API v2 suit une architecture en **3 couches** :

```
┌─────────────────────────────────────────┐
│  Routes (Next.js)                        │
│  - Validation des paramètres             │
│  - Gestion des erreurs HTTP              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Handlers                                 │
│  - Formatage des réponses                │
│  - Transformation des données            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Services                                 │
│  - Logique métier                        │
│  - Pagination                            │
│  - Recherche et filtres                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Loaders (lib/afrik/loaders)             │
│  - Chargement depuis le filesystem       │
│  - Parsing des fichiers TXT              │
│  - Cache en mémoire                      │
└──────────────────────────────────────────┘
```

## Principes de conception

### 1. **Identifiants stables**

- **Pays** : Codes ISO 3166-1 alpha-3 (ex: `ZWE`, `CMR`)
- **Peuples** : Identifiants `PPL_xxxxx` (ex: `PPL_SHONA`)
- **Familles linguistiques** : Identifiants `FLG_xxxxx` (ex: `FLG_BANTU`)
- **Langues** : Codes ISO 639-3 (ex: `swa`, `lin`)

### 2. **Contenu évolutif (JSONB)**

Le contenu variable est stocké dans des champs JSONB, permettant d'ajouter de nouvelles sections sans migration de schéma.

### 3. **Test-Driven Development (TDD)**

Tous les composants sont développés avec des tests en premier (RED → GREEN → REFACTOR).

### 4. **Type Safety**

TypeScript strict avec types complets pour toutes les entités.

### 5. **Séparation des responsabilités**

- **Routes** : Gestion HTTP, validation des paramètres
- **Handlers** : Formatage des réponses API
- **Services** : Logique métier, pagination, recherche
- **Loaders** : Accès aux données

## Endpoints disponibles

### Pays (Countries)

- `GET /api/v2/countries` - Liste paginée des pays
- `GET /api/v2/countries/[iso]` - Détails d'un pays par code ISO

### Peuples (Peoples)

- `GET /api/v2/peoples` - Liste paginée des peuples
- `GET /api/v2/peoples/[id]` - Détails d'un peuple par ID

### Familles linguistiques (Language Families)

- `GET /api/v2/language-families` - Liste paginée des familles linguistiques
- `GET /api/v2/language-families/[id]` - Détails d'une famille par ID

### Recherche (Search)

- `GET /api/v2/search` - Recherche multi-entités avec filtres

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

## Exemples d'utilisation

### Lister les pays (page 1, 10 par page)

```bash
GET /api/v2/countries?page=1&perPage=10
```

### Obtenir un pays spécifique

```bash
GET /api/v2/countries/ZWE
```

### Rechercher "Bantu"

```bash
GET /api/v2/search?query=Bantu
```

### Rechercher des peuples d'une famille linguistique

```bash
GET /api/v2/search?type=people&languageFamilyId=FLG_BANTU
```

## Structure des fichiers

```
src/api/v2/
├── README.md                    # Cette documentation
├── ARCHITECTURE.md              # Détails techniques de l'architecture
├── API_REFERENCE.md             # Référence complète des endpoints
├── handlers/                    # Handlers API
│   ├── countries.ts
│   ├── peoples.ts
│   ├── languageFamilies.ts
│   └── search.ts
├── services/                    # Services métier
│   ├── countryService.ts
│   ├── peopleService.ts
│   ├── languageFamilyService.ts
│   └── searchService.ts
└── utils/                       # Utilitaires
    ├── response.ts              # Formatage des réponses
    └── validation.ts            # Validation des paramètres
```

## Tests

Tous les composants sont couverts par des tests unitaires :

- **Services** : 18 tests
- **Handlers** : 13 tests
- **Loaders** : 14 tests

Total : **97 tests** passant

### Exécuter les tests

```bash
# Tests unitaires (loaders)
npm run unit-tests

# Tests API v2
npx vitest run src/api/v2
```

## État actuel

✅ **Complété** (Steps 1-6) :

- Types TypeScript complets
- Parsers pour tous les formats de fichiers
- Loaders avec cache
- Services métier
- Handlers API
- Routes Next.js
- Schéma de base de données (non exécuté)

🚧 **En cours** (Steps 7-11) :

- Script de migration des données
- Requêtes Supabase
- Migration vers base de données
- Tests d'évolutivité
- Documentation finale

## Documentation complémentaire

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Détails techniques de l'architecture
- [API_REFERENCE.md](./API_REFERENCE.md) - Référence complète des endpoints
- [../../docs/IMPLEMENTATION_PROGRESS.md](../../docs/IMPLEMENTATION_PROGRESS.md) - Progression de l'implémentation

## Support

Pour toute question ou problème, consultez :

- La documentation technique dans `ARCHITECTURE.md`
- La référence des endpoints dans `API_REFERENCE.md`
- Le plan d'implémentation dans `docs/IMPLEMENTATION_PROGRESS.md`
