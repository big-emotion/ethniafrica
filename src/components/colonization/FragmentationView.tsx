"use client";

import * as React from "react";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import SourceChainSheet from "@/components/source-transparency/SourceChainSheet";
import type {
  PeopleFragmentation,
  FragmentationCountry,
} from "@/api/v2/schemas/peopleFragmentation";

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
}

const COLONIAL_BORDER_LABEL = "frontière issue du partage colonial";

function formatShare(share: number): string {
  return `${Math.round(share * 100)} %`;
}

function countryName(countries: FragmentationCountry[], iso3: string): string {
  return countries.find((c) => c.iso3 === iso3)?.nameFr ?? iso3;
}

function FragmentationRow({
  peopleId,
  country,
}: {
  peopleId: string;
  country: FragmentationCountry;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const anchorId = `fragmentation-${peopleId}-${country.iso3}`;

  return (
    <tr>
      <td className="py-2 pr-4 text-sm text-[color:var(--afh-text,var(--country-text,#2C2018))]">
        {country.nameFr}
      </td>
      <td className="py-2 pr-4 text-sm tabular-nums text-[color:var(--afh-text,var(--country-text,#2C2018))]">
        {formatShare(country.populationShare)}
      </td>
      <td className="py-2">
        <ConfidenceChip
          id={anchorId}
          confidenceScore={null}
          sourceCount={null}
          lastHumanAuditAt={null}
          variant="inline"
          ariaSuffix={`pour la part de population en ${country.nameFr}`}
          onOpen={() => setSheetOpen(true)}
        />
        <SourceChainSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          assertion={{
            statement: `Part de la population en ${country.nameFr} : ${formatShare(
              country.populationShare
            )}`,
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
}: FragmentationViewProps) {
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
        <AutonymExonymHeading
          autonym={headingAutonym}
          exonym={headingExonym}
          variant="inline"
        />
        <p className="text-xs text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))]">
          {fragmentation.countryCount} pays
        </p>
      </div>
    );
  }

  return (
    <div className="FragmentationView FragmentationView--fiche-section">
      <AutonymExonymHeading
        autonym={headingAutonym}
        exonym={headingExonym}
        variant="inline"
      />
      <table className="w-full border-collapse">
        <caption className="text-left text-xs mb-2 text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))]">
          Répartition de {headingAutonym} par pays, avec niveau de confiance
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="text-left text-xs font-semibold pb-2 pr-4"
            >
              Pays
            </th>
            <th
              scope="col"
              className="text-left text-xs font-semibold pb-2 pr-4"
            >
              Part de la population
            </th>
            <th scope="col" className="text-left text-xs font-semibold pb-2">
              Confiance
            </th>
          </tr>
        </thead>
        <tbody>
          {fragmentation.countries.map((country) => (
            <FragmentationRow
              key={country.iso3}
              peopleId={fragmentation.peopleId}
              country={country}
            />
          ))}
        </tbody>
      </table>
      {colonialPairs.length > 0 && (
        <ul className="mt-3 space-y-1">
          {colonialPairs.map((pair) => (
            <li
              key={`${pair.a}-${pair.b}`}
              className="flex items-center gap-2 text-xs text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))]"
            >
              <span
                aria-hidden="true"
                className="inline-block w-2 h-2 rounded-full shrink-0 bg-[color:var(--afh-color-colonial)]"
              />
              <span>
                {countryName(fragmentation.countries, pair.a)} ↔{" "}
                {countryName(fragmentation.countries, pair.b)} —{" "}
                {COLONIAL_BORDER_LABEL}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FragmentationView;
