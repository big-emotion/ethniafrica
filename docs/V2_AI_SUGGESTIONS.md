# V2 - Système de suggestions IA

**Version** : 2.0  
**Date** : 2025-01-26  
**Statut** : Documentation

---

## 🎯 Objectif

Le système de suggestions IA permet d'enrichir automatiquement les fiches incomplètes en générant du contenu à la volée depuis des sources fiables, puis en le proposant aux utilisateurs pour validation.

---

## 🔄 Fonctionnement du chargement à la volée

### Principe

1. **Détection de données manquantes** : Lorsqu'un utilisateur consulte une fiche, le système détecte les sections vides ou incomplètes
2. **CTA affiché** : Un bouton "Charger avec IA" apparaît pour les sections manquantes
3. **Première requête** : Au clic, l'IA génère le contenu depuis des sources autorisées
4. **Stockage en base** : La suggestion est immédiatement stockée dans `ai_suggestions` pour tous les utilisateurs
5. **Affichage** : La suggestion apparaît avec un badge clair "💡 Suggestion IA"

### Avantages

- ✅ Pas de génération inutile : On génère uniquement ce qui est demandé
- ✅ Partage immédiat : La première requête enrichit la base pour tous
- ✅ Performance : Les utilisateurs suivants voient la suggestion instantanément
- ✅ Traçabilité : Chaque suggestion est tracée avec ses sources

---

## 📋 Processus de génération IA

### 1. Déclenchement

```typescript
// Pseudo-code
async function generateSuggestion(
  entityType: "people" | "country" | "language_family",
  entityId: string,
  sectionName: string
) {
  // 1. Vérifier si suggestion existe déjà
  const existing = await getExistingSuggestion(
    entityType,
    entityId,
    sectionName
  );
  if (existing) {
    return existing;
  }

  // 2. Récupérer les données officielles existantes
  const officialData = await getOfficialData(entityType, entityId);

  // 3. Identifier les champs manquants
  const missingFields = identifyMissingFields(sectionName, officialData);

  // 4. Générer avec IA
  const suggestion = await callAI({
    entityType,
    entityId,
    sectionName,
    missingFields,
    existingData: officialData,
    sources: getAuthorizedSources(),
  });

  // 5. Stocker en base
  return await saveSuggestion(suggestion);
}
```

### 2. Prompt IA

Le prompt envoyé à l'IA doit :

- **Contextualiser** : Expliquer le projet AFRIK et sa méthodologie
- **Spécifier** : Indiquer exactement quelle section/champ générer
- **Contraindre** : Lister les sources autorisées uniquement
- **Formater** : Demander un format JSON structuré
- **Sourcer** : Exiger la citation des sources utilisées

**Exemple de prompt** :

```
Tu es un assistant spécialisé dans l'ethnographie africaine pour le projet AFRIK.

Contexte :
- Projet AFRIK : Documentation décoloniale des peuples d'Afrique
- Méthodologie : Classification par famille linguistique, approche décoloniale
- Peuple concerné : {entityId} ({nameMain})

Tâche :
Génère le contenu pour la section "{sectionName}" en respectant strictement :
1. Utiliser UNIQUEMENT les sources autorisées : {authorizedSources}
2. Respecter le format du modèle AFRIK : {modelStructure}
3. Contextualiser les termes coloniaux (expliquer origine, problème, auto-appellation)
4. Citer toutes les sources utilisées

Données existantes (ne pas dupliquer) :
{existingData}

Champs à générer :
{missingFields}

Format de réponse (JSON) :
{
  "content": {...},
  "sources": [
    {"url": "...", "title": "...", "date": "..."}
  ]
}
```

### 3. Sources autorisées

L'IA doit utiliser **uniquement** ces sources :

#### Démographie

- ONU / UNFPA (populations 2025)
- CIA World Factbook
- Banque Mondiale

#### Langues

- Ethnologue (SIL) - Codes ISO 639-3
- Glottolog
- UNESCO
- African Language Atlas

#### Académique

- Vansina, Ehret, Hiernaux
- IWGIA (peuples autochtones)
- ASCL Leiden (publications)
- Encyclopaedia Africana

#### Bases de données

- Wikidata (SPARQL)
- Joshua Project (⚠️ dernier recours uniquement, avec mention du biais)

**Règle absolue** : Aucune donnée inventée. Tout doit être sourcé.

---

## 💾 Stockage en base

### Structure `suggested_content` (JSONB)

Le format varie selon la section, mais suit toujours la structure du modèle AFRIK :

```json
{
  "sectionName": "appellations",
  "suggestedContent": {
    "selfAppellation": "Yorùbá",
    "historicalExonyms": [
      {
        "term": "Yoruba",
        "origin": "Terme utilisé par les colons britanniques",
        "problematic": "Simplification de l'auto-appellation",
        "contemporaryUsage": "Toujours utilisé dans les sources académiques"
      }
    ],
    "variants": ["Yorubá", "Yoruba"]
  },
  "sources": [
    {
      "url": "https://...",
      "title": "Source title",
      "date": "2025-01-01",
      "type": "academic"
    }
  ]
}
```

### Métadonnées stockées

- `generated_at` : Timestamp de génération
- `generated_by` : 'ai' (ou 'user' si suggestion manuelle)
- `ai_model` : Modèle utilisé (gpt-4, claude, etc.)
- `ai_prompt` : Prompt complet utilisé (pour traçabilité)
- `sources` : Liste des sources utilisées par l'IA

---

## 🎨 Affichage dans l'interface

### Badge de suggestion

```tsx
<Badge variant="outline" className="gap-1">
  <Sparkles className="h-3 w-3" />
  Suggestion IA
</Badge>
```

### Section avec suggestion

```tsx
<div className="space-y-2">
  {/* Contenu officiel (si existe) */}
  {officialContent && (
    <div className="p-4 border rounded-lg">{officialContent}</div>
  )}

  {/* Suggestion IA */}
  {suggestion && (
    <div className="p-4 border-2 border-dashed border-primary/50 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Suggestion IA
        </Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => vote("upvote")}>
            👍 {suggestion.upvotesCount}
          </Button>
          <Button size="sm" variant="outline" onClick={() => vote("downvote")}>
            👎 {suggestion.downvotesCount}
          </Button>
        </div>
      </div>

      {/* Contenu suggéré */}
      <div>{renderSuggestionContent(suggestion.suggestedContent)}</div>

      {/* Sources */}
      {suggestion.sources && (
        <div className="mt-2 text-xs text-muted-foreground">
          <strong>Sources :</strong>
          <ul className="list-disc list-inside">
            {suggestion.sources.map((source, i) => (
              <li key={i}>
                <a href={source.url} target="_blank" rel="noopener">
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )}
</div>
```

### CTA pour génération

```tsx
{
  !suggestion && !officialContent && (
    <Card className="p-4 border-dashed">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Cette section est vide. Voulez-vous charger des suggestions générées
          par IA ?
        </p>
        <Button onClick={handleGenerateSuggestion} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Charger avec IA
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
```

---

## ⚠️ Gestion des erreurs

### Erreurs de génération IA

```typescript
try {
  const suggestion = await generateSuggestion(...);
} catch (error) {
  if (error.type === 'AI_ERROR') {
    // Erreur de l'API IA (rate limit, timeout, etc.)
    showError('Erreur lors de la génération. Veuillez réessayer plus tard.');
  } else if (error.type === 'NO_SOURCES') {
    // Aucune source trouvée
    showError('Aucune source fiable trouvée pour cette information.');
  } else if (error.type === 'VALIDATION_ERROR') {
    // Contenu généré invalide
    showError('Le contenu généré ne respecte pas le format attendu.');
  } else {
    // Erreur inconnue
    showError('Une erreur est survenue. Veuillez réessayer.');
  }
}
```

### Fallbacks

1. **Suggestion existante** : Si une suggestion existe déjà, la retourner
2. **Cache** : Mettre en cache les suggestions fréquemment demandées
3. **Retry** : Retry automatique en cas d'erreur temporaire (rate limit)
4. **Message utilisateur** : Message clair expliquant l'erreur

### Validation du contenu généré

```typescript
function validateSuggestionContent(
  sectionName: string,
  content: any
): ValidationResult {
  // Vérifier la structure selon le modèle AFRIK
  const model = getModelForSection(sectionName);
  const validation = validateAgainstModel(content, model);

  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
    };
  }

  // Vérifier la présence de sources
  if (!content.sources || content.sources.length === 0) {
    return {
      valid: false,
      errors: ["Aucune source fournie"],
    };
  }

  return { valid: true };
}
```

---

## 🔍 Détection des données manquantes

### Par section AFRIK

Chaque section du modèle AFRIK a des champs obligatoires :

- **Appellations** : `selfAppellation`, `historicalExonyms`
- **Origines** : `originDescription`, `migrationHistory`
- **Migrations** : `migrationRoutes`, `settlementAreas`
- **Royaumes** : `historicalKingdoms`, `dynasties`
- **Langues** : `primaryLanguage`, `dialects`
- **Démographie** : `totalPopulation`, `distribution`
- **Sources** : Toujours requis

### Algorithme de détection

```typescript
function detectMissingSections(
  entityType: string,
  entityId: string,
  officialData: any
): string[] {
  const model = getModelForEntity(entityType);
  const missingSections: string[] = [];

  for (const section of model.sections) {
    const sectionData = officialData.content[section.name];

    if (!sectionData || isEmpty(sectionData)) {
      missingSections.push(section.name);
    } else {
      // Vérifier les champs obligatoires
      const missingFields = section.requiredFields.filter(
        (field) => !sectionData[field] || sectionData[field] === "N/A"
      );

      if (missingFields.length > 0) {
        missingSections.push(section.name);
      }
    }
  }

  return missingSections;
}
```

---

## 📊 Métriques et monitoring

### Métriques à suivre

- **Taux de génération** : Nombre de suggestions générées par jour
- **Taux de réutilisation** : % de suggestions réutilisées (vs nouvelles)
- **Temps de génération** : Temps moyen de génération IA
- **Taux d'erreur** : % d'erreurs lors de la génération
- **Qualité** : Score moyen des votes (upvotes / total votes)

### Logs

Chaque génération doit être loggée :

```typescript
logger.info("AI suggestion generated", {
  entityType,
  entityId,
  sectionName,
  suggestionId,
  generationTime: duration,
  model: aiModel,
  sourcesCount: sources.length,
  contentSize: JSON.stringify(content).length,
});
```

---

## 🔐 Sécurité

### Rate limiting

- **Par IP** : Max 10 générations par heure
- **Par session** : Max 5 générations par session
- **Global** : Max 100 générations par jour (à ajuster selon coûts IA)

### Validation des entrées

- Vérifier que `entityId` existe dans les tables AFRIK
- Valider `sectionName` contre la liste des sections autorisées
- Sanitizer le contenu généré avant stockage

### Coûts IA

- Monitorer les coûts d'API IA
- Alerter si dépassement de budget
- Cache agressif pour éviter régénérations

---

## 🔗 Intégration avec le système de vote

Voir [V2_VOTING_SYSTEM.md](./V2_VOTING_SYSTEM.md) pour les détails sur :

- Comment les votes affectent les suggestions
- Promotion automatique si seuil atteint
- Historique des votes

---

## 📚 Références

- [Modèles AFRIK](../../public/modele-*.txt)
- [Sources autorisées](../API_AFRIK_REFERENCE.md)
- [Architecture V2](./V2_ARCHITECTURE.md)

---

**Prochaine étape** : Consulter [V2_VOTING_SYSTEM.md](./V2_VOTING_SYSTEM.md) pour le système de vote.
