# V2 - Guide d'implémentation

**Version** : 2.0  
**Date** : 2025-01-26  
**Statut** : Documentation

---

## 📋 Vue d'ensemble

Ce guide détaille les étapes pour implémenter la V2 du système EthniAfrica, incluant les suggestions IA, le système de vote, l'amélioration des contributions et les proverbes africains.

---

## 🗂️ Étapes d'implémentation

### Phase 1 : Base de données

#### 1.1 Créer la migration

**Fichier** : `supabase/migrations/007_v2_suggestions.sql`

```sql
-- Migration 007: V2 Suggestions, Votes et Proverbes
-- Créer les tables pour le système V2

-- Table ai_suggestions
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  section_name VARCHAR(100) NOT NULL,
  suggested_content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by VARCHAR(50) DEFAULT 'ai',
  ai_model VARCHAR(50),
  ai_prompt TEXT,
  sources JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  vote_score INTEGER DEFAULT 0,
  upvotes_count INTEGER DEFAULT 0,
  downvotes_count INTEGER DEFAULT 0,
  promoted_at TIMESTAMPTZ,
  promoted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table suggestion_votes
CREATE TABLE suggestion_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES ai_suggestions(id) ON DELETE CASCADE,
  user_id UUID,
  session_id VARCHAR(255),
  fingerprint VARCHAR(255),
  vote_type VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  UNIQUE(suggestion_id, user_id, session_id)
);

-- Table proverbs
CREATE TABLE proverbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  translation_fr TEXT,
  translation_en TEXT,
  meaning TEXT,
  people_id VARCHAR(50) REFERENCES afrik_peoples(id),
  language_id VARCHAR(10) REFERENCES afrik_languages(id),
  country_id CHAR(3) REFERENCES afrik_countries(id),
  source TEXT,
  region VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_suggestions_entity ON ai_suggestions(entity_type, entity_id);
CREATE INDEX idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX idx_ai_suggestions_vote_score ON ai_suggestions(vote_score DESC);
CREATE INDEX idx_ai_suggestions_section ON ai_suggestions(entity_type, entity_id, section_name);
CREATE INDEX idx_suggestion_votes_suggestion ON suggestion_votes(suggestion_id);
CREATE INDEX idx_suggestion_votes_user ON suggestion_votes(user_id);
CREATE INDEX idx_suggestion_votes_session ON suggestion_votes(session_id);
CREATE INDEX idx_proverbs_people ON proverbs(people_id);
CREATE INDEX idx_proverbs_language ON proverbs(language_id);
CREATE INDEX idx_proverbs_country ON proverbs(country_id);
```

#### 1.2 Appliquer la migration

```bash
# Via Supabase CLI
supabase migration up

# Ou via SQL direct dans Supabase Dashboard
```

---

### Phase 2 : Types TypeScript

#### 2.1 Créer les types

**Fichier** : `src/types/v2.ts`

```typescript
export interface AISuggestion {
  id: string;
  entityType: "people" | "country" | "language_family";
  entityId: string;
  sectionName: string;
  suggestedContent: Record<string, unknown>;
  generatedAt: Date;
  generatedBy: string;
  aiModel?: string;
  aiPrompt?: string;
  sources?: Source[];
  status: "pending" | "approved" | "rejected" | "promoted";
  voteScore: number;
  upvotesCount: number;
  downvotesCount: number;
  promotedAt?: Date;
  promotedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuggestionVote {
  id: string;
  suggestionId: string;
  userId?: string;
  sessionId?: string;
  fingerprint?: string;
  voteType: "upvote" | "downvote";
  createdAt: Date;
  ipAddress?: string;
}

export interface Proverb {
  id: string;
  text: string;
  translationFr?: string;
  translationEn?: string;
  meaning?: string;
  peopleId?: string;
  languageId?: string;
  countryId?: string;
  source?: string;
  region?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Source {
  url: string;
  title: string;
  date?: string;
  type?: "academic" | "official" | "web";
}
```

---

### Phase 3 : Services backend

#### 3.1 Service de suggestions

**Fichier** : `src/lib/services/suggestionService.ts`

```typescript
import { createServerClient } from "@/lib/supabase/server";
import type { AISuggestion } from "@/types/v2";

export async function getSuggestions(
  entityType: string,
  entityId: string
): Promise<AISuggestion[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("ai_suggestions")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("vote_score", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSuggestion(
  suggestion: Omit<AISuggestion, "id" | "createdAt" | "updatedAt">
): Promise<AISuggestion> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("ai_suggestions")
    .insert(suggestion)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ... autres fonctions
```

#### 3.2 Service de votes

**Fichier** : `src/lib/services/voteService.ts`

```typescript
import { createServerClient } from "@/lib/supabase/server";

export async function voteOnSuggestion(
  suggestionId: string,
  voteType: "upvote" | "downvote",
  userId?: string,
  sessionId?: string
): Promise<void> {
  const supabase = createServerClient();

  // Vérifier vote existant
  const { data: existingVote } = await supabase
    .from("suggestion_votes")
    .select("*")
    .eq("suggestion_id", suggestionId)
    .or(`user_id.eq.${userId},session_id.eq.${sessionId}`)
    .single();

  if (existingVote) {
    // Mettre à jour vote existant
    await supabase
      .from("suggestion_votes")
      .update({ vote_type: voteType })
      .eq("id", existingVote.id);
  } else {
    // Créer nouveau vote
    await supabase.from("suggestion_votes").insert({
      suggestion_id: suggestionId,
      user_id: userId,
      session_id: sessionId,
      vote_type: voteType,
    });
  }

  // Recalculer compteurs
  await updateVoteCounters(suggestionId);
}

async function updateVoteCounters(suggestionId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: votes } = await supabase
    .from("suggestion_votes")
    .select("vote_type")
    .eq("suggestion_id", suggestionId);

  const upvotesCount =
    votes?.filter((v) => v.vote_type === "upvote").length || 0;
  const downvotesCount =
    votes?.filter((v) => v.vote_type === "downvote").length || 0;
  const voteScore = upvotesCount - downvotesCount;

  await supabase
    .from("ai_suggestions")
    .update({
      upvotes_count: upvotesCount,
      downvotes_count: downvotesCount,
      vote_score: voteScore,
    })
    .eq("id", suggestionId);
}
```

#### 3.3 Service de proverbes

**Fichier** : `src/lib/services/proverbService.ts`

```typescript
import { createServerClient } from "@/lib/supabase/server";
import type { Proverb } from "@/types/v2";

export async function getRandomProverb(filters?: {
  peopleId?: string;
  languageId?: string;
  countryId?: string;
}): Promise<Proverb | null> {
  const supabase = createServerClient();

  let query = supabase.from("proverbs").select("*");

  if (filters?.peopleId) {
    query = query.eq("people_id", filters.peopleId);
  }
  if (filters?.languageId) {
    query = query.eq("language_id", filters.languageId);
  }
  if (filters?.countryId) {
    query = query.eq("country_id", filters.countryId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) return null;

  // Sélectionner aléatoirement
  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}
```

---

### Phase 4 : API Routes

#### 4.1 Route suggestions

**Fichier** : `src/app/api/v2/suggestions/[entityType]/[entityId]/route.ts`

```typescript
import { NextRequest } from "next/server";
import { getSuggestions } from "@/lib/services/suggestionService";
import { jsonWithCors } from "@/lib/api/cors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  const { entityType, entityId } = await params;

  try {
    const suggestions = await getSuggestions(entityType, entityId);
    return jsonWithCors({
      entityType,
      entityId,
      suggestions,
    });
  } catch (error) {
    return jsonWithCors(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
```

#### 4.2 Route votes

**Fichier** : `src/app/api/v2/suggestions/[suggestionId]/vote/route.ts`

```typescript
import { NextRequest } from "next/server";
import { voteOnSuggestion } from "@/lib/services/voteService";
import { jsonWithCors } from "@/lib/api/cors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  const { suggestionId } = await params;
  const body = await request.json();
  const { voteType, sessionId } = body;

  try {
    await voteOnSuggestion(suggestionId, voteType, null, sessionId);
    return jsonWithCors({ success: true });
  } catch (error) {
    return jsonWithCors({ error: "Failed to vote" }, { status: 500 });
  }
}
```

#### 4.3 Route proverbes

**Fichier** : `src/app/api/v2/proverbs/random/route.ts`

```typescript
import { NextRequest } from "next/server";
import { getRandomProverb } from "@/lib/services/proverbService";
import { jsonWithCors } from "@/lib/api/cors";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const peopleId = searchParams.get("peopleId") || undefined;
  const languageId = searchParams.get("languageId") || undefined;
  const countryId = searchParams.get("countryId") || undefined;

  try {
    const proverb = await getRandomProverb({ peopleId, languageId, countryId });
    return jsonWithCors({ proverb });
  } catch (error) {
    return jsonWithCors({ error: "Failed to fetch proverb" }, { status: 500 });
  }
}
```

---

### Phase 5 : Composants React

#### 5.1 Composant de suggestion

**Fichier** : `src/components/v2/SuggestionCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface SuggestionCardProps {
  suggestion: AISuggestion;
  onVote: (voteType: 'upvote' | 'downvote') => void;
}

export function SuggestionCard({ suggestion, onVote }: SuggestionCardProps) {
  return (
    <div className="p-4 border-2 border-dashed border-primary/50 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Suggestion IA
        </Badge>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onVote('upvote')}
          >
            👍 {suggestion.upvotesCount}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onVote('downvote')}
          >
            👎 {suggestion.downvotesCount}
          </Button>
        </div>
      </div>

      {/* Contenu suggéré */}
      <div>{/* Rendre le contenu selon sectionName */}</div>

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
  );
}
```

#### 5.2 Composant de chargement avec proverbe

**Fichier** : `src/components/v2/LoadingWithProverb.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Loader2, Quote } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Proverb } from '@/types/v2';

interface LoadingWithProverbProps {
  entityType?: string;
  entityId?: string;
}

export function LoadingWithProverb({ entityType, entityId }: LoadingWithProverbProps) {
  const [proverb, setProverb] = useState<Proverb | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (entityType === 'people' && entityId) params.set('peopleId', entityId);

    fetch(`/api/v2/proverbs/random?${params}`)
      .then(res => res.json())
      .then(data => setProverb(data.proverb))
      .catch(() => {});
  }, [entityType, entityId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />

      {proverb && (
        <Card className="max-w-md p-6 text-center">
          <Quote className="h-6 w-6 text-muted-foreground mb-2 mx-auto" />
          <p className="text-lg font-medium italic mb-2">
            "{proverb.text}"
          </p>
          {proverb.translationFr && (
            <p className="text-sm text-muted-foreground mb-2">
              {proverb.translationFr}
            </p>
          )}
          {proverb.meaning && (
            <p className="text-xs text-muted-foreground">
              {proverb.meaning}
            </p>
          )}
        </Card>
      )}

      <p className="text-sm text-muted-foreground">
        Chargement des données...
      </p>
    </div>
  );
}
```

---

### Phase 6 : Intégration IA

#### 6.1 Service de génération IA

**Fichier** : `src/lib/services/aiService.ts`

```typescript
// Configuration pour appeler l'API IA (OpenAI, Anthropic, etc.)

export async function generateSuggestionWithAI(params: {
  entityType: string;
  entityId: string;
  sectionName: string;
  missingFields: string[];
  existingData: any;
}): Promise<{
  content: Record<string, unknown>;
  sources: Source[];
}> {
  // Construire le prompt
  const prompt = buildPrompt(params);

  // Appeler l'API IA
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Tu es un assistant spécialisé dans l'ethnographie africaine pour le projet AFRIK...",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    content: result.content,
    sources: result.sources,
  };
}

function buildPrompt(params: {
  entityType: string;
  entityId: string;
  sectionName: string;
  missingFields: string[];
  existingData: any;
}): string {
  // Construire le prompt selon les spécifications
  // Voir V2_AI_SUGGESTIONS.md pour le format exact
  return `...`;
}
```

---

## 🧪 Tests

### Tests unitaires

**Fichier** : `src/lib/services/__tests__/suggestionService.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { getSuggestions, createSuggestion } from "../suggestionService";

describe("suggestionService", () => {
  it("should get suggestions for an entity", async () => {
    const suggestions = await getSuggestions("people", "PPL_YORUBA");
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it("should create a new suggestion", async () => {
    const suggestion = await createSuggestion({
      entityType: "people",
      entityId: "PPL_YORUBA",
      sectionName: "appellations",
      suggestedContent: { selfAppellation: "Yorùbá" },
      generatedBy: "ai",
      status: "pending",
      voteScore: 0,
      upvotesCount: 0,
      downvotesCount: 0,
    });

    expect(suggestion.id).toBeDefined();
  });
});
```

### Tests d'intégration

**Fichier** : `src/app/api/v2/__tests__/suggestions.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { GET } from "../suggestions/[entityType]/[entityId]/route";

describe("GET /api/v2/suggestions", () => {
  it("should return suggestions for an entity", async () => {
    const request = new Request(
      "http://localhost/api/v2/suggestions/people/PPL_YORUBA"
    );
    const response = await GET(request, {
      params: Promise.resolve({ entityType: "people", entityId: "PPL_YORUBA" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.suggestions).toBeDefined();
  });
});
```

---

## ✅ Checklist de déploiement

### Pré-déploiement

- [ ] Migration de base de données créée et testée
- [ ] Types TypeScript définis
- [ ] Services backend implémentés
- [ ] API routes créées et testées
- [ ] Composants React créés
- [ ] Service IA configuré (clés API, etc.)
- [ ] Tests unitaires écrits et passent
- [ ] Tests d'intégration écrits et passent

### Déploiement

- [ ] Appliquer migration en production
- [ ] Vérifier connexion base de données
- [ ] Vérifier variables d'environnement (clés IA)
- [ ] Tester endpoints API en production
- [ ] Vérifier affichage des composants

### Post-déploiement

- [ ] Monitorer logs d'erreurs
- [ ] Vérifier génération de suggestions IA
- [ ] Tester système de vote
- [ ] Vérifier affichage des proverbes
- [ ] Monitorer performance (temps de réponse)

---

## 📚 Références

- [Vue d'ensemble V2](./V2_OVERVIEW.md)
- [Architecture V2](./V2_ARCHITECTURE.md)
- [Suggestions IA](./V2_AI_SUGGESTIONS.md)
- [Système de vote](./V2_VOTING_SYSTEM.md)
- [Contributions](./V2_CONTRIBUTIONS.md)
- [Proverbes](./V2_PROVERBS.md)

---

## 🔧 Configuration requise

### Variables d'environnement

```env
# IA Service (OpenAI ou autre)
OPENAI_API_KEY=sk-...
# ou
ANTHROPIC_API_KEY=sk-ant-...

# Supabase (déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Dépendances npm

```json
{
  "dependencies": {
    // Existantes
    "@supabase/supabase-js": "^2.x",
    "next": "^15.x",
    "react": "^18.x",

    // Nouvelles (si nécessaire)
    "openai": "^4.x", // ou autre client IA
    "framer-motion": "^10.x" // pour animations
  }
}
```

---

**Fin du guide d'implémentation**
