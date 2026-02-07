# V2 - Système de proverbes africains

**Version** : 2.0  
**Date** : 2025-01-26  
**Statut** : Documentation

---

## 🎯 Objectif

Afficher des proverbes africains pendant le chargement des pages pour améliorer l'expérience utilisateur et faire patienter de manière agréable et éducative.

---

## 📚 Structure de données

### Table `proverbs`

Voir [V2_ARCHITECTURE.md](./V2_ARCHITECTURE.md) pour le schéma complet.

### Exemple de données

```json
{
  "id": "uuid",
  "text": "Àgbà kì í jẹ́ kí ọmọ rẹ̀ kú",
  "translationFr": "Un aîné ne laisse pas son enfant mourir",
  "translationEn": "An elder does not let their child die",
  "meaning": "Les aînés ont la responsabilité de protéger et guider les plus jeunes",
  "peopleId": "PPL_YORUBA",
  "languageId": "yor",
  "countryId": "NGA",
  "source": "Collection de proverbes yoruba, 2020",
  "region": "Afrique de l'Ouest"
}
```

---

## 🎨 Affichage pendant le chargement

### Composant de chargement avec proverbe

```tsx
function LoadingWithProverb({
  entityType,
  entityId,
}: {
  entityType?: string;
  entityId?: string;
}) {
  const [proverb, setProverb] = useState<Proverb | null>(null);

  useEffect(() => {
    // Charger un proverbe pertinent
    loadProverb(entityType, entityId).then(setProverb);
  }, [entityType, entityId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      {/* Spinner */}
      <Loader2 className="h-8 w-8 animate-spin text-primary" />

      {/* Proverbe */}
      {proverb && (
        <Card className="max-w-md p-6 text-center">
          <Quote className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-lg font-medium italic mb-2">"{proverb.text}"</p>
          {proverb.translationFr && (
            <p className="text-sm text-muted-foreground mb-2">
              {proverb.translationFr}
            </p>
          )}
          {proverb.meaning && (
            <p className="text-xs text-muted-foreground">{proverb.meaning}</p>
          )}
          {proverb.peopleId && (
            <Badge variant="outline" className="mt-2">
              {getPeopleName(proverb.peopleId)}
            </Badge>
          )}
        </Card>
      )}

      {/* Message de chargement */}
      <p className="text-sm text-muted-foreground">Chargement des données...</p>
    </div>
  );
}
```

### Intégration dans les pages

```tsx
function PeopleDetailPage({ peopleId }: Props) {
  const { data: people, isLoading } = usePeople(peopleId);

  if (isLoading) {
    return <LoadingWithProverb entityType="people" entityId={peopleId} />;
  }

  return <PeopleDetailView people={people} />;
}
```

---

## 🔍 Sélection intelligente des proverbes

### Priorité de sélection

1. **Proverbe du peuple consulté** : Si `peopleId` correspond
2. **Proverbe de la langue** : Si `languageId` correspond
3. **Proverbe du pays** : Si `countryId` correspond
4. **Proverbe de la région** : Si région correspond
5. **Proverbe aléatoire** : Sinon

### Algorithme de sélection

```typescript
async function getRelevantProverb(
  entityType?: string,
  entityId?: string
): Promise<Proverb | null> {
  // 1. Récupérer l'entité pour obtenir ses associations
  let peopleId: string | null = null;
  let languageId: string | null = null;
  let countryId: string | null = null;

  if (entityType === "people" && entityId) {
    const people = await getPeople(entityId);
    peopleId = entityId;
    languageId = people.primaryLanguageId;
    countryId = people.currentCountries?.[0];
  } else if (entityType === "country" && entityId) {
    countryId = entityId;
  }

  // 2. Chercher proverbe pertinent (ordre de priorité)
  const queries = [
    // Priorité 1 : Peuple exact
    peopleId ? { peopleId } : null,
    // Priorité 2 : Langue
    languageId ? { languageId } : null,
    // Priorité 3 : Pays
    countryId ? { countryId } : null,
    // Priorité 4 : Aléatoire
    {},
  ].filter(Boolean);

  for (const query of queries) {
    const proverb = await getRandomProverb(query);
    if (proverb) return proverb;
  }

  return null;
}
```

### Rotation des proverbes

Pour éviter la répétition, utiliser un système de rotation :

```typescript
async function getRandomProverb(
  filters: ProverbFilters
): Promise<Proverb | null> {
  // Récupérer tous les proverbes correspondants
  const allProverbs = await getProverbs(filters);

  if (allProverbs.length === 0) return null;

  // Utiliser sessionStorage pour éviter répétition dans la même session
  const viewedProverbs = getViewedProverbsFromSession();
  const availableProverbs = allProverbs.filter(
    (p) => !viewedProverbs.includes(p.id)
  );

  // Si tous ont été vus, réinitialiser
  const proverbsToChoose =
    availableProverbs.length > 0 ? availableProverbs : allProverbs;

  // Sélectionner aléatoirement
  const randomIndex = Math.floor(Math.random() * proverbsToChoose.length);
  const selectedProverb = proverbsToChoose[randomIndex];

  // Enregistrer comme vu
  markProverbAsViewed(selectedProverb.id);

  return selectedProverb;
}
```

---

## 🔌 API Endpoints

### `GET /api/v2/proverbs/random`

Récupère un proverbe aléatoire avec filtres optionnels.

**Query parameters** :

- `peopleId` (optionnel) : Filtrer par peuple (PPL_xxxxx)
- `languageId` (optionnel) : Filtrer par langue (ISO 639-3)
- `countryId` (optionnel) : Filtrer par pays (ISO 3166-1 alpha-3)
- `region` (optionnel) : Filtrer par région

**Réponse** :

```json
{
  "proverb": {
    "id": "uuid",
    "text": "Àgbà kì í jẹ́ kí ọmọ rẹ̀ kú",
    "translationFr": "Un aîné ne laisse pas son enfant mourir",
    "translationEn": "An elder does not let their child die",
    "meaning": "Les aînés ont la responsabilité de protéger et guider les plus jeunes",
    "peopleId": "PPL_YORUBA",
    "languageId": "yor",
    "countryId": "NGA",
    "source": "Collection de proverbes yoruba, 2020",
    "region": "Afrique de l'Ouest"
  }
}
```

### `GET /api/v2/proverbs/:proverbId`

Récupère un proverbe spécifique.

### `GET /api/v2/proverbs`

Liste des proverbes avec pagination et filtres.

**Query parameters** :

- `peopleId`, `languageId`, `countryId`, `region` : Filtres
- `page` : Numéro de page
- `limit` : Nombre de résultats par page

---

## 📝 Gestion de la base de données

### Import initial

Créer un script d'import pour peupler la base :

```typescript
// scripts/importProverbs.ts
async function importProverbsFromCSV(filePath: string) {
  const proverbs = await parseCSV(filePath);

  for (const proverb of proverbs) {
    await createProverb({
      text: proverb.text,
      translationFr: proverb.translation_fr,
      translationEn: proverb.translation_en,
      meaning: proverb.meaning,
      peopleId: proverb.people_id,
      languageId: proverb.language_id,
      countryId: proverb.country_id,
      source: proverb.source,
      region: proverb.region,
    });
  }
}
```

### Format CSV

```csv
text,translation_fr,translation_en,meaning,people_id,language_id,country_id,source,region
"Àgbà kì í jẹ́ kí ọmọ rẹ̀ kú","Un aîné ne laisse pas son enfant mourir","An elder does not let their child die","Les aînés ont la responsabilité de protéger et guider les plus jeunes",PPL_YORUBA,yor,NGA,"Collection de proverbes yoruba, 2020","Afrique de l'Ouest"
```

### Sources de proverbes

- Collections académiques
- Livres de proverbes africains
- Contributions communautaires
- Sources en ligne vérifiées

**Important** : Toujours citer la source et vérifier l'authenticité.

---

## 🎨 Variantes d'affichage

### Style minimaliste

```tsx
function MinimalProverb({ proverb }: { proverb: Proverb }) {
  return (
    <div className="text-center p-4">
      <p className="text-sm italic text-muted-foreground">"{proverb.text}"</p>
      {proverb.translationFr && (
        <p className="text-xs text-muted-foreground mt-1">
          {proverb.translationFr}
        </p>
      )}
    </div>
  );
}
```

### Style enrichi

```tsx
function EnrichedProverb({ proverb }: { proverb: Proverb }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <Quote className="h-8 w-8 text-primary flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-lg font-medium italic">"{proverb.text}"</p>
          {proverb.translationFr && (
            <p className="text-base text-muted-foreground">
              {proverb.translationFr}
            </p>
          )}
          {proverb.meaning && (
            <p className="text-sm text-muted-foreground">{proverb.meaning}</p>
          )}
          <div className="flex gap-2 mt-4">
            {proverb.peopleId && (
              <Badge variant="outline">{getPeopleName(proverb.peopleId)}</Badge>
            )}
            {proverb.countryId && (
              <Badge variant="outline">
                {getCountryName(proverb.countryId)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
```

### Animation de transition

```tsx
function AnimatedProverb({ proverb }: { proverb: Proverb }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <ProverbCard proverb={proverb} />
    </motion.div>
  );
}
```

---

## 🔄 Rotation automatique

Pour les chargements longs, faire tourner les proverbes :

```tsx
function RotatingProverbs({ interval = 5000, entityType, entityId }: Props) {
  const [currentProverb, setCurrentProverb] = useState<Proverb | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    loadProverbs(entityType, entityId).then((proverbs) => {
      if (proverbs.length > 0) {
        setCurrentProverb(proverbs[0]);
      }
    });
  }, [entityType, entityId]);

  useEffect(() => {
    if (!currentProverb) return;

    const timer = setInterval(async () => {
      const proverbs = await loadProverbs(entityType, entityId);
      if (proverbs.length > 0) {
        const nextIndex = (index + 1) % proverbs.length;
        setCurrentProverb(proverbs[nextIndex]);
        setIndex(nextIndex);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [currentProverb, index, interval, entityType, entityId]);

  return currentProverb ? <AnimatedProverb proverb={currentProverb} /> : null;
}
```

---

## 📊 Statistiques d'utilisation

### Métriques à suivre

- **Proverbes les plus affichés** : Quels proverbes sont vus le plus souvent
- **Taux d'affichage** : % de pages avec proverbe affiché
- **Temps d'affichage moyen** : Durée moyenne d'affichage
- **Proverbes par peuple/langue** : Distribution

### Analytics

```typescript
async function trackProverbView(
  proverbId: string,
  context: {
    entityType?: string;
    entityId?: string;
    displayDuration: number;
  }
) {
  await logEvent("proverb_viewed", {
    proverbId,
    ...context,
    timestamp: new Date(),
  });
}
```

---

## 🎯 Cas d'usage

### 1. Chargement de fiche peuple

```tsx
function PeoplePage({ peopleId }: Props) {
  const { data, isLoading } = usePeople(peopleId);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingWithProverb entityType="people" entityId={peopleId} />
      </div>
    );
  }

  return <PeopleDetailView people={data} />;
}
```

### 2. Chargement de liste

```tsx
function PeoplesListPage() {
  const { data, isLoading } = usePeoples();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <RotatingProverbs interval={4000} />
      </div>
    );
  }

  return <PeoplesListView peoples={data} />;
}
```

### 3. Génération IA en cours

```tsx
function AIGenerationInProgress({ entityType, entityId }: Props) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2">Génération de suggestions en cours...</p>
      </div>
      <LoadingWithProverb entityType={entityType} entityId={entityId} />
    </div>
  );
}
```

---

## 📚 Références

- [Architecture V2](./V2_ARCHITECTURE.md) - Schéma de base de données
- [Système de suggestions IA](./V2_AI_SUGGESTIONS.md) - Intégration avec chargement IA

---

**Prochaine étape** : Consulter [V2_IMPLEMENTATION_GUIDE.md](./V2_IMPLEMENTATION_GUIDE.md) pour le guide d'implémentation complet.
