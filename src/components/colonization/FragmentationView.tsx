"use client";

import * as React from "react";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import SourceChainSheet from "@/components/source-transparency/SourceChainSheet";
import type {
  PeopleFragmentation,
  FragmentationCountry,
} from "@/api/v2/schemas/peopleFragmentation";
import { colonizationCopy } from "@/lib/i18n/copy/colonization";
import { getCountryCommonName } from "@/lib/countryNames";
import type { Language } from "@/types/shared";

/**
 * FragmentationView — text-first fragmentation view for FR85 (Epic 13, Story 13.7).
 *
 * No map involved: countries and border pairs are listed as prose/table data,
 * each share traceable to its source via ConfidenceChip -> SourceChainSheet.
 *
 * The fragmentation endpoint (Story 13.5) does not yet expose confidence
 * score / source count / audit date per country share — only an
 * `assertionId` pointer. Per the "never invent data" policy, ConfidenceChip
 * is fed nulls (its established fallback affordance) rather than fabricated
 * numbers; it still opens the same SourceChainSheet on activation.
 */

export type FragmentationViewVariant = "fiche-section" | "module-index";

export interface FragmentationViewProps {
  fragmentation: PeopleFragmentation;
  variant: FragmentationViewVariant;
  language?: Language;
}

function formatShare(share: number): string {
  return `${Math.round(share * 100)} %`;
}

function countryName(
  countries: FragmentationCountry[],
  iso3: string,
  language: Language
): string {
  const fallback = countries.find((c) => c.iso3 === iso3)?.nameFr ?? iso3;
  return getCountryCommonName(language, iso3, fallback);
}

function FragmentationRow({
  peopleId,
  country,
  language,
}: {
  peopleId: string;
  country: FragmentationCountry;
  language: Language;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const anchorId = `fragmentation-${peopleId}-${country.iso3}`;
  const copy = colonizationCopy[language].fragmentation;
  const localizedCountry = getCountryCommonName(
    language,
    country.iso3,
    country.nameFr
  );

  return (
    <tr>
      <td className="py-2 pr-4 text-afh-small text-[color:var(--afh-text,var(--country-text,#2C2018))]">
        {localizedCountry}
      </td>
      <td className="py-2 pr-4 text-afh-small tabular-nums text-[color:var(--afh-text,var(--country-text,#2C2018))]">
        {formatShare(country.populationShare)}
      </td>
      <td className="py-2">
        <ConfidenceChip
          id={anchorId}
          confidenceScore={null}
          sourceCount={null}
          lastHumanAuditAt={null}
          variant="inline"
          language={language}
          ariaSuffix={copy.shareAria(localizedCountry)}
          onOpen={() => setSheetOpen(true)}
        />
        <SourceChainSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          assertion={{
            statement: copy.shareStatement(
              localizedCountry,
              formatShare(country.populationShare)
            ),
            confidenceScore: 0,
            sourceCount: 0,
            lastHumanAuditAt: null,
          }}
          sources={[]}
          anchorId={anchorId}
        />
      </td>
    </tr>
  );
}

// @req REQ-091
export function FragmentationView({
  fragmentation,
  variant,
  language = "fr",
}: FragmentationViewProps) {
  const copy = colonizationCopy[language].fragmentation;
  if (fragmentation.countryCount < 2 || fragmentation.countries.length < 2) {
    return null;
  }

  const headingAutonym = fragmentation.autonym ?? fragmentation.exonym ?? "";
  const headingExonym =
    fragmentation.exonym && fragmentation.exonym !== fragmentation.autonym
      ? fragmentation.exonym
      : undefined;

  const colonialPairs = fragmentation.borderPairs.filter(
    (pair) => pair.colonialOrigin
  );

  if (variant === "module-index") {
    return (
      <div className="FragmentationView FragmentationView--module-index">
        {/* "card" (h3), not "inline" (h2): this heading sits inside a
            FicheTile, itself an h3 under the chapter's own h2 — "inline"
            put it at the same level as a chapter title, so the fiche read
            as ten chapters instead of nine. */}
        <AutonymExonymHeading
          autonym={headingAutonym}
          exonym={headingExonym}
          variant="card"
        />
        <p className="text-afh-caption text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))]">
          {copy.countryCount(fragmentation.countryCount)}
        </p>
      </div>
    );
  }

  return (
    <div className="FragmentationView FragmentationView--fiche-section">
      {/* See the module-index branch above: "card" keeps this below the
          chapter (FicheSection, h2) and its FicheTile (h3). */}
      <AutonymExonymHeading
        autonym={headingAutonym}
        exonym={headingExonym}
        variant="card"
      />
      <table className="w-full border-collapse">
        <caption className="text-left text-afh-caption mb-2 text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))]">
          {copy.caption(headingAutonym)}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="text-left text-afh-caption font-semibold pb-2 pr-4"
            >
              {copy.country}
            </th>
            <th
              scope="col"
              className="text-left text-afh-caption font-semibold pb-2 pr-4"
            >
              {copy.populationShare}
            </th>
            <th
              scope="col"
              className="text-left text-afh-caption font-semibold pb-2"
            >
              {copy.confidence}
            </th>
          </tr>
        </thead>
        <tbody>
          {fragmentation.countries.map((country) => (
            <FragmentationRow
              key={country.iso3}
              peopleId={fragmentation.peopleId}
              country={country}
              language={language}
            />
          ))}
        </tbody>
      </table>
      {colonialPairs.length > 0 && (
        <ul className="mt-3 space-y-1">
          {colonialPairs.map((pair) => (
            <li
              key={`${pair.a}-${pair.b}`}
              className="flex items-center gap-2 text-afh-caption text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))]"
            >
              <span
                aria-hidden="true"
                className="inline-block w-2 h-2 rounded-full shrink-0 bg-[color:var(--afh-color-colonial)]"
              />
              <span>
                {countryName(fragmentation.countries, pair.a, language)} ↔{" "}
                {countryName(fragmentation.countries, pair.b, language)} —{" "}
                {copy.colonialBorder}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
