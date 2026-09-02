"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Code, GitBranch, Info } from "lucide-react";
import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/brand";
import { apiTagLabel, OPENAPI_V2_TAGS } from "@/lib/api/openapiV2Tags";

// @req REQ-099
export default function ApiDocsPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-afh-h1 font-display font-bold">
                API Documentation
              </h1>
              <p className="text-muted-foreground mt-1">
                Documentation de l&apos;API AFRIK — {PRODUCT_NAME}
              </p>
            </div>
          </div>
        </div>

        {/* Introduction */}
        <Card className="p-6 bg-muted/50">
          <div className="space-y-3">
            <h2 className="text-afh-h3 font-semibold">API AFRIK v2</h2>
            <p className="text-afh-small text-muted-foreground">
              L&apos;API {PRODUCT_NAME} est basée sur la méthodologie AFRIK avec
              des identifiants stables (FLG_*, PPL_*, codes ISO) et un format de
              réponse standardisé avec pagination.
            </p>
          </div>
        </Card>

        {/* API v2 Card */}
        <Card className="p-6 hover:shadow-lg transition-shadow border-primary/20">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-afh-h2 font-semibold">API v2 - AFRIK</h2>
                  <span className="px-2 py-1 text-afh-caption rounded-md bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Actuelle
                  </span>
                </div>
                <p className="text-afh-small text-muted-foreground">
                  API basée sur la méthodologie AFRIK avec identifiants stables
                  (FLG_*, PPL_*, codes ISO), pagination et contenu évolutif.
                  Elle expose {OPENAPI_V2_TAGS.length} familles de ressources,
                  listées ci-dessous et détaillées dans la référence.
                </p>
              </div>
              <span className="px-3 py-1 text-afh-caption rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                v2.0.0
              </span>
            </div>
            {/* Read from the spec's own tag block rather than restated: this
                card claimed four resources while the API had grown to
                eighteen, and a hand-kept list was always going to lose that
                race. */}
            <div data-testid="api-v2-coverage" className="flex flex-wrap gap-2">
              {OPENAPI_V2_TAGS.map((tag) => (
                <span
                  key={tag.name}
                  className="px-2 py-1 text-afh-caption rounded-md bg-primary/10 text-primary"
                >
                  {apiTagLabel(tag.name)}
                </span>
              ))}
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

        {/* Versioning policy */}
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <GitBranch className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold">Versionnement et dépréciation</h3>
              <p className="text-afh-small text-muted-foreground">
                Ce qu&apos;une version majeure engage, les ajouts qui arrivent
                sans préavis, et le délai minimum de six mois avant le retrait
                d&apos;un endpoint.
              </p>
              <Link
                href="/docs/api/versioning"
                className="inline-block text-afh-small text-primary underline underline-offset-2"
              >
                Politique de versionnement
              </Link>
            </div>
          </div>
        </Card>

        {/* The "Endpoints disponibles" card that stood here listed four routes
            out of thirty, hand-written. It was the third list on this page
            saying an overlapping thing, and the two others are now derived —
            so it is removed rather than made to drift more slowly. The
            reference below enumerates every route, from the spec itself. */}
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold">
                Chaque route, avec ses paramètres
              </h3>
              <p className="text-afh-small text-muted-foreground">
                La référence est engendrée à partir de la spécification servie :
                chemins, paramètres, schémas de réponse et codes d&apos;erreur y
                sont à jour par construction.
              </p>
              <Link
                href="/docs/api/v2"
                className="inline-block text-afh-small text-primary underline underline-offset-2"
              >
                Ouvrir la référence v2
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
