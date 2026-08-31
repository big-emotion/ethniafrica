"use client";

import Link from "next/link";

import { ficheHrefFor } from "@/components/search/SearchResultCard";
import { SearchSnippet } from "@/components/search/SearchSnippet";
import { SEARCH_ENTITY_ACCENT } from "@/components/search/searchEntityAccent";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import { getFrenchCountryCommonName } from "@/lib/countryNames";
import { getCountryRoute, getFamilyRoute } from "@/lib/routing";
import { cn } from "@/lib/utils";
import type { SearchEntityType, SearchResult } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

/**
 * The lead block for a search that has one unambiguous answer.
 *
 * A reader who types "Bété" wants the Bété, not a ranked list they must then
 * read. This states the entity and its place in the atlas — family, countries,
 * scale — so the question is answered before any scrolling.
 *
 * Two rules it keeps from the fiche panels. A node whose data the corpus does
 * not carry is absent rather than guessed (FR98): no placeholder family, no
 * invented country. And a name imposed from outside never stands alone where
 * the autonym exists, which is why the heading leads with the self-appellation
 * and demotes the exonym beside it.
 *
 * Unlike the list card there is no stretched link: the pivot offers several
 * destinations of equal weight, and an invisible overlay across all of them
 * would be a trap. The fiche gets an explicit link instead.
 */

const numberFr = new Intl.NumberFormat("fr-FR");

export interface SearchPivotCardProps {
  result: SearchResult;
  language: Language;
  onNavigate?: () => void;
}

// @req REQ-002
export function SearchPivotCard({
  result,
  language,
  onNavigate,
}: SearchPivotCardProps) {
  const type = result.type as SearchEntityType;
  const countries = result.countryIds ?? [];
  const hasAutonym = Boolean(result.autonym && result.autonym !== result.name);

  return (
    <Card
      data-testid="search-pivot"
      data-result-type={result.type}
      onClick={onNavigate}
      className={cn(
        "p-4 md:p-6",
        SEARCH_ENTITY_ACCENT[type]?.accentScopeClassName,
        "border-l-4 border-l-[var(--accent)] bg-[var(--accent-tint)]"
      )}
    >
      <p className="text-afh-eyebrow font-bold uppercase tracking-[0.11em] text-afh-fg-muted">
        Résultat principal
      </p>

      {/* Mobile first: one column, names then figures. From md the figures
          move beside the names rather than under them. */}
      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <AutonymExonymHeading
            variant="inline"
            autonym={hasAutonym ? result.autonym : result.name}
            exonym={hasAutonym ? result.name : undefined}
            alternateNames={result.exonyms}
          />
          <Link
            href={ficheHrefFor(result, language)}
            className={cn(
              "mt-1 inline-block text-afh-small underline underline-offset-2",
              CHARTER_FOCUS_RING
            )}
          >
            Ouvrir la fiche
          </Link>
        </div>

        <dl className="flex shrink-0 flex-col gap-1 md:text-right">
          {result.population !== undefined && (
            <>
              <dt className="text-afh-caption text-afh-fg-muted">Population</dt>
              <dd className="text-afh-small font-semibold text-afh-text">
                {numberFr.format(Math.round(result.population))}
              </dd>
            </>
          )}
          {result.confidence !== undefined && (
            <>
              <dt className="text-afh-caption text-afh-fg-muted">Confiance</dt>
              {/* The database stores this on [0,1]; every chip in the product
                  reads 0-100. Converting here, once, is what keeps the two
                  scales from being confused downstream. */}
              <dd className="text-afh-small font-semibold text-afh-text">
                {Math.round(result.confidence * 100)} %
              </dd>
            </>
          )}
        </dl>
      </div>

      {result.snippet && (
        <SearchSnippet snippet={result.snippet} className="mt-3" />
      )}

      <nav
        aria-label="Position dans la hiérarchie AFRIK"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        {result.languageFamilyId && result.languageFamilyName && (
          <Link
            href={getFamilyRoute(language, result.languageFamilyId)}
            // Linguistic attachment, not identity: several peoples grouped
            // under a family name reject it as a shared identity, and the
            // label must not quietly restate a colonial grouping.
            aria-label={`Famille linguistique ${result.languageFamilyName}`}
            className={cn("rounded-full", CHARTER_FOCUS_RING)}
          >
            <Badge variant="outline" className="text-afh-caption">
              {result.languageFamilyName}
            </Badge>
          </Link>
        )}
        {countries.map((iso3) => (
          <Link
            key={iso3}
            href={getCountryRoute(language, iso3)}
            className={cn("rounded-full", CHARTER_FOCUS_RING)}
          >
            <Badge variant="outline" className="text-afh-caption">
              {getFrenchCountryCommonName(iso3, iso3)}
            </Badge>
          </Link>
        ))}
        <ClassificationBadge status={result.classificationStatus} />
      </nav>
    </Card>
  );
}
