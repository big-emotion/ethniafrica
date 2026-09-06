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
import { getCountryCommonName } from "@/lib/countryNames";
import { formatNumber } from "@/lib/languageTag";
import {
  getLocalizedSearchResultFamilyName,
  getLocalizedSearchResultName,
} from "@/lib/search/localizedResult";
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

export interface SearchPivotCardProps {
  result: SearchResult;
  language: Language;
  onNavigate?: () => void;
}

// @req REQ-124
// @req REQ-002
export function SearchPivotCard({
  result,
  language,
  onNavigate,
}: SearchPivotCardProps) {
  const type = result.type as SearchEntityType;
  const countries = result.countryIds ?? [];
  const name = getLocalizedSearchResultName(result, language);
  const familyName = getLocalizedSearchResultFamilyName(result, language);
  const hasAutonym = Boolean(result.autonym && result.autonym !== name);
  const copy =
    language === "en"
      ? {
          primary: "Primary result",
          open: "Open record",
          population: "Population",
          confidence: "Confidence",
          hierarchy: "Position in the AFRIK hierarchy",
          family: (value: string) => `Linguistic family ${value}`,
        }
      : {
          primary: "Résultat principal",
          open: "Ouvrir la fiche",
          population: "Population",
          confidence: "Confiance",
          hierarchy: "Position dans la hiérarchie AFRIK",
          family: (value: string) => `Famille linguistique ${value}`,
        };

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
        {copy.primary}
      </p>

      {/* Mobile first: one column, names then figures. From md the figures
          move beside the names rather than under them. */}
      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <AutonymExonymHeading
            variant="inline"
            autonym={hasAutonym ? result.autonym : name}
            exonym={hasAutonym ? name : undefined}
            alternateNames={result.exonyms}
          />
          <Link
            href={ficheHrefFor(result, language)}
            className={cn(
              "mt-1 inline-block text-afh-small underline underline-offset-2",
              CHARTER_FOCUS_RING
            )}
          >
            {copy.open}
          </Link>
        </div>

        <dl className="flex shrink-0 flex-col gap-1 md:text-right">
          {result.population !== undefined && (
            <>
              <dt className="text-afh-caption text-afh-fg-muted">
                {copy.population}
              </dt>
              <dd className="text-afh-small font-semibold text-afh-text">
                {formatNumber(language, Math.round(result.population))}
              </dd>
            </>
          )}
          {result.confidence !== undefined && (
            <>
              <dt className="text-afh-caption text-afh-fg-muted">
                {copy.confidence}
              </dt>
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
        aria-label={copy.hierarchy}
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        {result.languageFamilyId && familyName && (
          <Link
            href={getFamilyRoute(language, result.languageFamilyId)}
            // Linguistic attachment, not identity: several peoples grouped
            // under a family name reject it as a shared identity, and the
            // label must not quietly restate a colonial grouping.
            aria-label={copy.family(familyName)}
            className={cn("rounded-full", CHARTER_FOCUS_RING)}
          >
            <Badge variant="outline" className="text-afh-caption">
              {familyName}
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
              {getCountryCommonName(language, iso3, iso3)}
            </Badge>
          </Link>
        ))}
        <ClassificationBadge
          status={result.classificationStatus}
          language={language}
        />
      </nav>
    </Card>
  );
}
