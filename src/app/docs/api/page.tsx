"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Code, Search, Info } from "lucide-react";
import Link from "next/link";

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen gradient-earth">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold">
                  API Documentation
                </h1>
                <p className="text-muted-foreground mt-1">
                  Choisissez la version de l'API à consulter
                </p>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <Card className="p-6 bg-muted/50">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Versions disponibles</h2>
              <p className="text-sm text-muted-foreground">
                L'API Ethniafrique Atlas est disponible en deux versions. La v1
                est l'API historique, tandis que la v2 est basée sur la
                méthodologie AFRIK avec des identifiants stables et un format de
                réponse standardisé.
              </p>
            </div>
          </Card>

          {/* API v1 Card */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">API v1</h2>
                  <p className="text-sm text-muted-foreground">
                    API publique pour accéder aux données démographiques et
                    ethniques de l'Afrique. Accès aux régions, pays, ethnies et
                    statistiques.
                  </p>
                </div>
                <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  v1.0.0
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  Régions
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  Pays
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  Ethnies
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  Statistiques
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                <Link href="/docs/api/v1" className="flex-1">
                  <Button className="w-full">Consulter la documentation</Button>
                </Link>
                <Link href="/api/docs/v1" target="_blank">
                  <Button variant="outline">
                    <Code className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* API v2 Card */}
          <Card className="p-6 hover:shadow-lg transition-shadow border-primary/20">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold">API v2 - AFRIK</h2>
                    <span className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Nouveau
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    API basée sur la méthodologie AFRIK avec identifiants
                    stables (FLG_*, PPL_*, codes ISO), pagination et contenu
                    évolutif. Accès aux pays, peuples, familles linguistiques et
                    recherche multi-entités.
                  </p>
                </div>
                <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  v2.0.0
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  Recherche
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  Pays
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  Peuples
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  Familles linguistiques
                </span>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                  Pagination
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                <Link href="/docs/api/v2" className="flex-1">
                  <Button className="w-full">Consulter la documentation</Button>
                </Link>
                <Link href="/api/docs/v2" target="_blank">
                  <Button variant="outline">
                    <Code className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Quick Info */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold">Quelle version choisir ?</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    <strong>API v1</strong> : Pour les applications existantes
                    ou si vous avez besoin d'accéder aux régions et aux
                    statistiques globales.
                  </li>
                  <li>
                    <strong>API v2</strong> : Pour les nouvelles applications,
                    si vous avez besoin d'identifiants stables, de pagination ou
                    d'accès aux données AFRIK (peuples, familles linguistiques).
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
