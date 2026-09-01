"use client";

import Link from "next/link";

import {
  SEARCH_ENTITY_ACCENT,
  SearchEntityMark,
  getSearchEntityLabel,
} from "@/components/search/searchEntityAccent";
import { SearchSnippet } from "@/components/search/SearchSnippet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import {
  CHARTER_FOCUS_RING,
  CHARTER_HOVER_LIFT,
} from "@/components/ui/charter-motion";
import { getFrenchCountryCommonName } from "@/lib/countryNames";
import {
  getCountryRoute,
  getFamilyRoute,
  getPeopleRoute,
  getPersonRoute,
} from "@/lib/routing";
import { buildRelationSearchHref } from "@/lib/search/relationSearch";
import {
  getPersonRelationLabel,
  getPersonRoleLabel,
} from "@/lib/search/personResultLabels";
import { cn } from "@/lib/utils";
import type { SearchEntityType, SearchResult } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

/**
 * The one search result card, shared by /recherche and the search overlay.
 *
 * It used to exist three times, and the copies drifted: the overlay navigated
 * on a div's onClick, the /recherche page rendered a card with a hover shadow
 * and no handler at all — promising an interaction it never delivered — and a
 * third copy sat behind an unreachable route. Extracting it is what makes
 * "a result is a link" a property of the surface rather than of one page.
 *
 * Navigation is a real <Link>, so the card is reachable by keyboard. The card
 * carries several destinations — the fiche, the linguistic family, each
 * country — so it cannot simply be wrapped in one anchor: the title link is
 * stretched over the card and the chip rows sit above it.
 */

const MAX_COUNTRY_CHIPS = 3;

const numberFr = new Intl.NumberFormat("fr-FR");

// @req REQ-002
export function ficheHrefFor(result: SearchResult, language: Language): string {
  if (result.type === "country") return getCountryRoute(language, result.id);
  if (result.type === "languageFamily")
    return getFamilyRoute(language, result.id);
  if (result.type === "person") return getPersonRoute(language, result.id);
  return getPeopleRoute(language, result.id);
}

export interface SearchResultCardProps {
  result: SearchResult;
  language: Language;
  /** Fired when any link inside the card is activated — a modal closes with it. */
  onNavigate?: () => void;
  className?: string;
}

// @req REQ-002
export function SearchResultCard({
  result,
  language,
  onNavigate,
  className,
}: SearchResultCardProps) {
  const type = result.type as SearchEntityType;
  const countries = result.countryIds ?? [];
  const shownCountries = countries.slice(0, MAX_COUNTRY_CHIPS);
  const hiddenCountryCount = countries.length - shownCountries.length;

  return (
    <Card
      data-testid="search-result-card"
      data-result-type={result.type}
      onClick={onNavigate}
      className={cn(
        "relative p-4 md:p-5",
        SEARCH_ENTITY_ACCENT[type]?.accentScopeClassName,
        CHARTER_HOVER_LIFT,
        "focus-within:shadow-[var(--afh-ring-focus)]",
        className
      )}
    >
      <h3 className="font-afh-display text-afh-small font-semibold text-afh-text">
        {/* Stretched over the whole card. Anything below that must stay
            separately clickable sits on `relative z-10`, above this overlay. */}
        <Link
          href={ficheHrefFor(result, language)}
          className={cn(
            "after:absolute after:inset-0 after:content-['']",
            CHARTER_FOCUS_RING
          )}
        >
          {result.name}
        </Link>
      </h3>

      <div className="relative z-10 mt-1 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5">
          <SearchEntityMark type={type} />
          <Badge variant="secondary" className="text-afh-caption">
            {getSearchEntityLabel(type)}
          </Badge>
        </span>

        {result.languageFamilyId && result.languageFamilyName && (
          <Link
            href={buildRelationSearchHref(language, {
              kind: "family",
              id: result.languageFamilyId,
            })}
            aria-label={`Peuples de la famille linguistique ${result.languageFamilyName}`}
            className={cn("rounded-full", CHARTER_FOCUS_RING)}
          >
            <Badge variant="outline" className="text-afh-caption">
              {result.languageFamilyName}
            </Badge>
          </Link>
        )}

        <ClassificationBadge status={result.classificationStatus} />

        {/* REQ-126: rendered unconditionally whenever the card carries a
            roleCategory — no tooltip, no hover, no "show more". A person
            result the reader cannot immediately place is exactly the
            editorial failure this ticket exists to close. */}
        {result.type === "person" && result.roleCategory && (
          <Badge variant="outline" className="text-afh-caption">
            {getPersonRoleLabel(result.roleCategory)}
          </Badge>
        )}
      </div>

      {result.snippet && (
        <SearchSnippet snippet={result.snippet} className="mt-1 line-clamp-2" />
      )}

      {result.type === "person" && (result.peopleLinks?.length ?? 0) > 0 && (
        <ul
          className="relative z-10 mt-2 flex flex-wrap items-center gap-2"
          aria-label="Peuples cités"
        >
          {result.peopleLinks?.map((link) => (
            <li key={link.peopleId}>
              <Link
                href={getPeopleRoute(language, link.peopleId)}
                className={cn("rounded-full", CHARTER_FOCUS_RING)}
              >
                {/* membership and observation carry distinct wording, never
                    just a colour, so the two never read as interchangeable
                    (REQ-126) — an observer must never look like a member. */}
                <Badge
                  variant={
                    link.relationLabel === "membership"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-afh-caption"
                >
                  {getPersonRelationLabel(link.relationLabel)} {link.peopleId}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {shownCountries.length > 0 && (
        <ul
          className="relative z-10 mt-2 flex flex-wrap items-center gap-2"
          aria-label="Pays de présence"
        >
          {shownCountries.map((iso3) => (
            <li key={iso3}>
              <Link
                href={buildRelationSearchHref(language, {
                  kind: "country",
                  id: iso3,
                })}
                aria-label={`Peuples du pays ${getFrenchCountryCommonName(iso3, iso3)}`}
                className={cn("rounded-full", CHARTER_FOCUS_RING)}
              >
                <Badge variant="outline" className="text-afh-caption">
                  {getFrenchCountryCommonName(iso3, iso3)}
                </Badge>
              </Link>
            </li>
          ))}
          {hiddenCountryCount > 0 && (
            <li className="text-afh-caption text-afh-fg-muted">
              +{hiddenCountryCount}
            </li>
          )}
        </ul>
      )}

      {result.population !== undefined && (
        <p className="mt-1 text-afh-small text-afh-text-soft">
          Population : {numberFr.format(Math.round(result.population))}
        </p>
      )}
    </Card>
  );
}
