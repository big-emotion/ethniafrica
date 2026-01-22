"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Code, Info, Search } from "lucide-react";
import Link from "next/link";

// Import dynamique de SwaggerUI pour éviter les problèmes SSR
const SwaggerUI = dynamic(
  () => import("swagger-ui-react").then((mod) => mod.default),
  { ssr: false }
);

export default function ApiDocsV2Page() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>("");

  useEffect(() => {
    // Déterminer l'URL de base
    const url =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : "";
    setBaseUrl(url);

    // Charger la spécification OpenAPI v2
    fetch("/api/docs/v2")
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error("Failed to load API spec:", err));
  }, []);

  if (!spec) {
    return (
      <div className="min-h-screen gradient-earth">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-display font-bold mb-4">
              API Documentation v2 - AFRIK
            </h1>
            <p className="text-muted-foreground">
              Loading API documentation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-earth">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold">
                  API Documentation v2 - AFRIK
                </h1>
                <p className="text-muted-foreground mt-1">
                  Documentation interactive de l'API publique v2 basée sur la
                  méthodologie AFRIK
                </p>
              </div>
            </div>
          </div>

          {/* Version selector */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Vous consultez la documentation de l'API v2 (AFRIK)
              </p>
              <Link href="/docs/api/v1">
                <Button variant="outline" size="sm">
                  Voir l'API v1
                </Button>
              </Link>
            </div>
          </Card>

          {/* Quick Links */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Accès rapide</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Link href="/api/v2/search" target="_blank">
                  <Button variant="outline" className="w-full justify-start">
                    <Search className="h-4 w-4 mr-2" />
                    Recherche
                  </Button>
                </Link>
                <Link href="/api/v2/countries" target="_blank">
                  <Button variant="outline" className="w-full justify-start">
                    <Code className="h-4 w-4 mr-2" />
                    Pays
                  </Button>
                </Link>
                <Link href="/api/v2/peoples" target="_blank">
                  <Button variant="outline" className="w-full justify-start">
                    <Code className="h-4 w-4 mr-2" />
                    Peuples
                  </Button>
                </Link>
                <Link href="/api/v2/language-families" target="_blank">
                  <Button variant="outline" className="w-full justify-start">
                    <Code className="h-4 w-4 mr-2" />
                    Familles linguistiques
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Introduction */}
          <Card className="p-6 bg-muted/50">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">À propos de l'API v2</h2>
              <p className="text-sm text-muted-foreground">
                L'API v2 est basée sur la méthodologie AFRIK et utilise des
                identifiants stables (FLG_*, PPL_*, codes ISO 3166-1 alpha-3).
                Toutes les réponses suivent un format standardisé avec
                pagination. Les données sont stockées en JSONB pour permettre
                l'évolution sans migration de schéma.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  REST API v2
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  AFRIK
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  Pagination
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  OpenAPI 3.0
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  CORS activé
                </span>
              </div>
            </div>
          </Card>

          {/* Swagger UI */}
          <Card className="p-6">
            <div className="swagger-ui-wrapper">
              {/* @ts-expect-error - SwaggerUI types are not fully compatible */}
              <SwaggerUI spec={spec} />
            </div>
          </Card>

          {/* Footer Info */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              Base URL de l'API :{" "}
              <code className="px-2 py-1 rounded bg-muted text-foreground">
                {baseUrl || "Chargement..."}
              </code>
            </p>
            <p>
              Pour plus d'informations, consultez la{" "}
              <Link
                href="/fr/contribute"
                className="underline underline-offset-4 hover:text-primary"
              >
                page Contribuer
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
