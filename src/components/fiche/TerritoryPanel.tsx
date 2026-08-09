import { useMemo } from "react";

import { DottedContinent } from "@/components/home/DottedContinent";
import { FichePanel } from "@/components/fiche/FichePanel";
import { africaDots, type ContinentDot, type Point } from "@/lib/continentDots";
import type { CountryDistributionRow } from "@/lib/peopleDataTransformer";
import type {
  FichePanelSide,
  FichePanelSize,
  FichePanelSourceLine,
} from "@/types/fiche";

export interface TerritoryPanelProps {
  /** Real per-country presence data (afrik_people_countries) — never invented. */
  distributions: readonly CountryDistributionRow[];
  stepLabel: string;
  heading: string;
  body: string;
  note?: string;
  sourceLine: FichePanelSourceLine;
  size?: FichePanelSize;
  side?: FichePanelSide;
  className?: string;
}

const MIN_MIX_PERCENT = 25;

/** Descending by share — undefined percentages sort last. Stable for ties. */
function sortByShareDescending(
  distributions: readonly CountryDistributionRow[]
): CountryDistributionRow[] {
  return [...distributions].sort(
    (a, b) => (b.percentage ?? -Infinity) - (a.percentage ?? -Infinity)
  );
}

/** Highest share gets 100% --accent; the ramp fades toward --accent-tint. */
function mixPercentFor(index: number, total: number): number {
  if (total <= 1) return 100;
  const step = (100 - MIN_MIX_PERCENT) / (total - 1);
  return Math.round(100 - index * step);
}

/**
 * Evenly-spaced samples from the real dot field (continentDots.ts) — never
 * hand-drawn per-country geometry. The mapping from sample to country is
 * illustrative (a data device, not a claim of location); the real presence
 * data lives in the text-first country list.
 */
function sampleDotPositions(
  dots: readonly ContinentDot[],
  count: number
): Point[] {
  if (count <= 0 || dots.length === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const index = Math.min(
      dots.length - 1,
      Math.floor(((i + 0.5) * dots.length) / count)
    );
    const [x, y] = dots[index];
    return [x, y] as Point;
  });
}

function TerritoryHighlight({
  ordered,
}: {
  ordered: readonly CountryDistributionRow[];
}) {
  const dots = useMemo(() => africaDots(), []);
  const positions = useMemo(
    () => sampleDotPositions(dots, ordered.length),
    [dots, ordered.length]
  );

  return (
    <div
      data-territory-highlight
      aria-hidden="true"
      className="relative h-full w-full"
    >
      <DottedContinent />
      {ordered.map((row, i) => {
        const [x, y] = positions[i] ?? [0.5, 0.5];
        const mixPercent = mixPercentFor(i, ordered.length);
        return (
          <span
            key={row.country}
            data-territory-highlight-dot
            data-mix-percent={mixPercent}
            className="absolute h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              backgroundColor: `color-mix(in srgb, var(--accent) ${mixPercent}%, var(--accent-tint))`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Territory panel (Epic 15 · Story 15.5 · FR98, FR99, R3, R4, R5) — where a
 * people lives, felt rather than listed. Reuses DottedContinent as a
 * decorative, aria-hidden backdrop with a share-ranked accent highlight;
 * the country list is the text-first, accessible source of truth.
 */
// @req REQ-091
export function TerritoryPanel({
  distributions,
  stepLabel,
  heading,
  body,
  note,
  sourceLine,
  size = "md",
  side = "left",
  className,
}: TerritoryPanelProps) {
  const ordered = sortByShareDescending(distributions);
  if (ordered.length === 0) return null;

  return (
    <div className={className}>
      <FichePanel
        data={{
          stepLabel,
          heading,
          body,
          note,
          canvas: <TerritoryHighlight ordered={ordered} />,
        }}
        size={size}
        side={side}
        sourceLine={sourceLine}
      />
      <ul
        data-territory-country-list
        className="mt-afh-md flex flex-col gap-afh-xs"
      >
        {ordered.map((row) => (
          <li
            key={row.country}
            className="flex items-baseline justify-between gap-afh-sm text-afh-small text-afh-text-soft"
          >
            <span className="font-mono font-semibold text-afh-text">
              {row.country}
            </span>
            <span>
              {row.percentage != null ? `${row.percentage}%` : "—"}
              {row.populationFormatted ? ` · ${row.populationFormatted}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
