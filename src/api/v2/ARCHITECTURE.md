# AFRIK API v2 - Architecture Technique

## Vue d'ensemble

L'API v2 est construite selon une architecture en couches claire, avec une séparation stricte des responsabilités. Chaque couche a un rôle précis et communique uniquement avec les couches adjacentes.

## Architecture en couches

### 1. Couche Routes (Next.js App Router)

**Localisation** : `src/app/api/v2/`

**Responsabilités** :

- Gestion des requêtes HTTP (GET, POST, etc.)
- Validation des paramètres d'URL et de query string
- Gestion des erreurs HTTP (400, 404, 500)
- Transformation des paramètres (string → number, etc.)

**Exemple** : `src/app/api/v2/countries/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = validatePage(searchParams.get("page"));
  const perPage = validatePerPage(searchParams.get("perPage"));

  const response = await listCountriesHandler(page, perPage);
  return NextResponse.json(response);
}
```

**Caractéristiques** :

- Utilise `NextRequest` et `NextResponse` de Next.js
- Valide les paramètres avec `utils/validation.ts`
- Appelle les handlers correspondants
- Gère les erreurs avec try/catch

### 2. Couche Handlers

**Localisation** : `src/api/v2/handlers/`

**Responsabilités** :

- Formatage des réponses selon le standard API v2
- Transformation des données brutes en format API
- Ajout des métadonnées de pagination
- Gestion des cas d'erreur (retourne `null` si non trouvé)

**Exemple** : `src/api/v2/handlers/countries.ts`

```typescript
export async function listCountriesHandler(
  page?: number,
  perPage?: number
): Promise<ApiResponse<Country[]>> {
  const { data, total } = await getCountries(page, perPage);
  return createPaginatedResponse(data, total, page, perPage);
}
```

**Caractéristiques** :

- Utilise `utils/response.ts` pour formater les réponses
- Appelle les services correspondants
- Retourne toujours un format standardisé `ApiResponse<T>`

### 3. Couche Services

**Localisation** : `src/api/v2/services/`

**Responsabilités** :

- Logique métier (pagination, filtres, recherche)
- Orchestration des appels aux loaders
- Transformation des données si nécessaire
- Gestion de la logique de recherche multi-entités

**Exemple** : `src/api/v2/services/countryService.ts`

```typescript
export async function getCountries(
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResult<Country>> {
  const all = await loadAllCountries();
  const start = (page - 1) * perPage;
  const data = all.slice(start, start + perPage);
  return { data, total: all.length };
}
```

**Caractéristiques** :

- Logique métier pure (pas de dépendance HTTP)
- Utilise les loaders pour accéder aux données
- Implémente la pagination, la recherche, les filtres
- Retourne des types TypeScript stricts

### 4. Couche Loaders

**Localisation** : `src/lib/afrik/loaders/`

**Responsabilités** :

- Chargement des fichiers depuis le filesystem
- Parsing des fichiers TXT avec les parsers
- Cache en mémoire pour les performances
- Gestion des erreurs de parsing

**Exemple** : `src/lib/afrik/loaders/countryLoader.ts`

```typescript
export async function loadCountry(
  isoCode: string
): Promise<ParsedFile<Country>> {
  if (countryCache.has(isoCode)) {
    return { success: true, data: countryCache.get(isoCode)! };
  }

  const content = readFileSync(filePath, "utf-8");
  const result = parseCountryFile(content);

  if (result.success && result.data) {
    countryCache.set(isoCode, result.data);
  }

  return result;
}
```

**Caractéristiques** :

- Cache en mémoire (`Map<string, T>`)
- Utilise les parsers pour transformer le texte en objets
- Retourne `ParsedFile<T>` avec gestion d'erreurs
- Gère les erreurs de fichiers manquants

## Flux de données

### Exemple : GET /api/v2/countries/ZWE

```
1. Route (route.ts)
   ↓ Reçoit la requête HTTP
   ↓ Valide le paramètre [iso]
   ↓ Appelle le handler

2. Handler (countries.ts)
   ↓ Appelle le service
   ↓ Formate la réponse

3. Service (countryService.ts)
   ↓ Appelle le loader
   ↓ Retourne Country | null

4. Loader (countryLoader.ts)
   ↓ Lit le fichier ZWE.txt
   ↓ Parse avec countryParser
   ↓ Retourne ParsedFile<Country>

5. Retour en arrière
   ↓ Service retourne Country
   ↓ Handler formate ApiResponse
   ↓ Route retourne NextResponse.json
```

## Utilitaires

### `utils/response.ts`

Fonctions pour créer des réponses standardisées :

- `createPaginatedResponse<T>` : Réponse avec pagination
- `createResponse<T>` : Réponse simple

**Exemple** :

```typescript
const response = createPaginatedResponse(countries, 54, 1, 20);
// {
//   data: [...],
//   meta: { total: 54, page: 1, perPage: 20, totalPages: 3 }
// }
```

### `utils/validation.ts`

Fonctions de validation des paramètres :

- `validatePage(page?: string | null): number` - Valide et parse la page
- `validatePerPage(perPage?: string | null, max?: number): number` - Valide et parse perPage
- `validateCountryId(id: string): boolean` - Valide le format ISO (3 lettres)
- `validateLanguageFamilyId(id: string): boolean` - Valide le format FLG_xxxxx
- `validatePeopleId(id: string): boolean` - Valide le format PPL_xxxxx

**Exemple** :

```typescript
const page = validatePage(searchParams.get("page")); // "2" → 2, null → 1
const perPage = validatePerPage(searchParams.get("perPage"), 100); // "50" → 50, "200" → 100
```

## Patterns utilisés

### 1. Repository Pattern (via Loaders)

Les loaders agissent comme des repositories, abstraient l'accès aux données :

```typescript
// Interface abstraite
async function loadCountry(id: string): Promise<ParsedFile<Country>>;

// Implémentation actuelle : filesystem
// Future implémentation : base de données
```

### 2. Service Layer Pattern

Les services encapsulent la logique métier :

```typescript
// Service = logique métier pure
export async function getCountries(page: number, perPage: number);

// Pas de dépendance HTTP, facilement testable
```

### 3. Handler Pattern

Les handlers formatent les réponses API :

```typescript
// Handler = formatage API
export async function listCountriesHandler(page?: number, perPage?: number);

// Retourne toujours ApiResponse<T>
```

### 4. Cache Pattern

Cache en mémoire au niveau des loaders :

```typescript
const cache = new Map<string, T>();

// Premier appel : charge depuis le filesystem
// Appels suivants : retourne depuis le cache
```

## Gestion des erreurs

### Niveaux d'erreur

1. **Loader** : Retourne `ParsedFile<T>` avec `success: false` et `errors[]`
2. **Service** : Retourne `null` si non trouvé
3. **Handler** : Retourne `null` si non trouvé
4. **Route** : Retourne HTTP 404 si `null`, 500 si exception

### Exemple de flux d'erreur

```
Loader : Fichier non trouvé
  → ParsedFile { success: false, errors: [...] }

Service : Retourne null
  → getCountryById() → null

Handler : Retourne null
  → getCountryHandler() → null

Route : HTTP 404
  → NextResponse.json({ error: "Country not found" }, { status: 404 })
```

## Types TypeScript

### Types principaux

- `Country` : Pays avec identifiant ISO
- `People` : Peuple avec identifiant PPL\_
- `LanguageFamily` : Famille linguistique avec identifiant FLG\_
- `ApiResponse<T>` : Format standardisé des réponses
- `SearchFilters` : Filtres de recherche
- `SearchResult` : Résultat de recherche

### Types utilitaires

- `ParsedFile<T>` : Résultat de parsing avec gestion d'erreurs
- `ParseError` : Erreur de parsing
- `ParseWarning` : Avertissement de parsing
- `PaginationMeta` : Métadonnées de pagination

## Performance

### Optimisations actuelles

1. **Cache en mémoire** : Les loaders mettent en cache les fichiers parsés
2. **Pagination** : Limite la quantité de données retournées
3. **Lazy loading** : Les fichiers ne sont chargés que si nécessaire

### Optimisations futures (Step 9)

1. **Cache Next.js** : Utilisation de `unstable_cache` pour le cache HTTP
2. **Base de données** : Requêtes optimisées avec indexes
3. **Full-text search** : Recherche indexée dans PostgreSQL

## Évolutivité

### Ajout d'un nouvel endpoint

1. **Service** : Créer `newService.ts` avec la logique métier
2. **Handler** : Créer `newHandler.ts` pour formater les réponses
3. **Route** : Créer `app/api/v2/new/route.ts` pour l'endpoint HTTP
4. **Tests** : Créer les tests pour chaque couche

### Migration vers base de données (Step 9)

L'architecture permet une migration transparente :

1. Créer les requêtes Supabase dans `lib/supabase/queries/afrik/`
2. Modifier les services pour utiliser les requêtes au lieu des loaders
3. Les handlers et routes restent inchangés

## Tests

### Structure des tests

Chaque couche a ses propres tests :

- `services/__tests__/` : Tests des services (logique métier)
- `handlers/__tests__/` : Tests des handlers (formatage)
- `loaders/__tests__/` : Tests des loaders (chargement)

### Exemple de test

```typescript
describe("Country Service", () => {
  it("should return paginated countries", async () => {
    const result = await getCountries(1, 5);
    expect(result.data.length).toBeLessThanOrEqual(5);
    expect(result.total).toBeGreaterThan(0);
  });
});
```

## Principes de conception

1. **Single Responsibility** : Chaque couche a une seule responsabilité
2. **Dependency Inversion** : Les couches supérieures dépendent d'abstractions
3. **Open/Closed** : Ouvert à l'extension, fermé à la modification
4. **Testability** : Chaque couche est testable indépendamment

## Prochaines étapes

Voir `docs/IMPLEMENTATION_PROGRESS.md` pour les étapes restantes :

- Step 7 : Script de migration des données
- Step 8 : Requêtes Supabase
- Step 9 : Migration vers base de données
- Step 10 : Tests d'évolutivité
- Step 11 : Documentation finale
