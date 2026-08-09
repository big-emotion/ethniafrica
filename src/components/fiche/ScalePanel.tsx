"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { classificationLabels } from "@/lib/translations";
import { Badge } from "@/components/ui/badge";
import { FichePanel } from "@/components/fiche/FichePanel";
import type {
  FichePanelData,
  FichePanelSide,
  FichePanelSize,
} from "@/types/fiche";
import type {
  ClassificationStatus,
  CountryDetail,
  CountryDistribution,
  LanguageFamilyDetail,
  PeopleDetail,
} from "@/types/afrik-frontend";

/**
 * Scale panel (Epic 15 · Story 15.4 · FR99).
 *
 * "The magnitude as an event" — a single Fraunces 900 figure sized via
 * clamp(60px, 15vw, 112px), fr-FR formatted, paired with a reference-year
 * label, a confidence chip and the panel's required source line (FR99).
 * People additionally get a per-country share ramp with a text legend
 * (never color alone). Country and language-family read their own headline
 * count from the corpus — no recalculation happens here (R4).
 */

const COUNT_UP_DURATION_MS = 800;
const COUNT_UP_FRAME_MS = 16;
const COUNT_UP_FRAMES = Math.round(COUNT_UP_DURATION_MS / COUNT_UP_FRAME_MS);

function formatNumberFr(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

/** Animates 0 → target once, purely visual; settles exactly on target (R4). */
function useAnimatedMagnitude(
  target: number | undefined,
  reducedMotion: boolean
): number | undefined {
  const [value, setValue] = React.useState<number | undefined>(
    target === undefined || reducedMotion ? target : 0
  );

  React.useEffect(() => {
    if (target === undefined) return;
    if (reducedMotion) {
      setValue(target);
      return;
    }
    setValue(0);
    let frame = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      frame += 1;
      const progress = Math.min(1, frame / COUNT_UP_FRAMES);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        timer = setTimeout(step, COUNT_UP_FRAME_MS);
      }
    };
    timer = setTimeout(step, COUNT_UP_FRAME_MS);
    return () => clearTimeout(timer);
  }, [target, reducedMotion]);

  return value;
}

interface ScaleContent {
  /** The headline number — no recalculation, straight from the corpus (R4). */
  magnitudeValue: number;
  /** Static unit caption describing what the figure counts. */
  caption: string;
  referenceYear?: number;
  sourceLabel?: string;
  classificationStatus?: ClassificationStatus | null;
  /** People-only per-country share breakdown. */
  ramp?: CountryDistribution[];
  /** Family-only literal chip, shown only when classification is contested. */
  contestedFamily?: boolean;
}

function readPeopleScale(payload: PeopleDetail): ScaleContent | null {
  const totalPopulation = payload.demography?.totalPopulation;
  if (totalPopulation === undefined) return null;
  return {
    magnitudeValue: totalPopulation,
    caption: "population totale",
    referenceYear: payload.demography?.referenceYear,
    sourceLabel: payload.demography?.source ?? payload.sources?.[0],
    classificationStatus: payload.classificationStatus,
    ramp: payload.demography?.distributionByCountry,
  };
}

function readCountryScale(payload: CountryDetail): ScaleContent | null {
  const peoplesCount = payload.demographics?.peoples?.length;
  if (!peoplesCount) return null;
  return {
    magnitudeValue: peoplesCount,
    caption: "peuples recensés",
    sourceLabel: payload.sources?.[0],
  };
}

function readFamilyScale(payload: LanguageFamilyDetail): ScaleContent | null {
  const numberOfLanguages = payload.generalInfo?.numberOfLanguages;
  if (numberOfLanguages === undefined) return null;
  return {
    magnitudeValue: numberOfLanguages,
    caption: "langues recensées",
    sourceLabel: payload.sources?.[0],
    contestedFamily: payload.classificationStatus === "contested",
  };
}

export type ScalePanelProps =
  | {
      entityType: "people";
      payload: PeopleDetail;
      size: FichePanelSize;
      side: FichePanelSide;
      className?: string;
    }
  | {
      entityType: "country";
      payload: CountryDetail;
      size: FichePanelSize;
      side: FichePanelSide;
      className?: string;
    }
  | {
      entityType: "language-family";
      payload: LanguageFamilyDetail;
      size: FichePanelSize;
      side: FichePanelSide;
      className?: string;
    };

// @req REQ-091
export function ScalePanel(props: ScalePanelProps) {
  const { size, side, className } = props;

  let content: ScaleContent | null;
  switch (props.entityType) {
    case "people":
      content = readPeopleScale(props.payload);
      break;
    case "country":
      content = readCountryScale(props.payload);
      break;
    case "language-family":
      content = readFamilyScale(props.payload);
      break;
  }

  // A magnitude without a resolvable source is not a valid panel (FR99) —
  // gate before source is known, then again once source is checked.
  const gated = content && content.sourceLabel ? content : null;

  const reducedMotion = usePrefersReducedMotion();
  const animatedValue = useAnimatedMagnitude(
    gated?.magnitudeValue,
    reducedMotion
  );

  if (!gated) {
    return (
      <FichePanel
        size={size}
        side={side}
        sourceLine={{ label: "" }}
        className={className}
      />
    );
  }

  const confidenceLabel =
    gated.classificationStatus && gated.classificationStatus !== "consensual"
      ? classificationLabels[gated.classificationStatus].label
      : undefined;

  const canvas = (
    <div className="flex h-full flex-col items-start justify-center gap-afh-md p-afh-lg">
      <div className="flex flex-wrap items-baseline gap-afh-sm">
        <span
          data-scale-figure
          className="font-afh-display font-black text-afh-text tabular-nums"
          style={{
            fontSize: "clamp(60px, 15vw, 112px)",
            lineHeight: 1,
          }}
        >
          {formatNumberFr(animatedValue ?? 0)}
        </span>
        {gated.referenceYear && (
          <span className="text-afh-small text-afh-text-muted">
            Année de référence : {gated.referenceYear}
          </span>
        )}
      </div>
      <p className="text-afh-caption uppercase tracking-wide text-afh-text-muted">
        {gated.caption}
      </p>

      {(confidenceLabel || gated.contestedFamily) && (
        <div className="flex flex-wrap gap-afh-xs">
          {confidenceLabel && (
            <Badge variant="outline" data-scale-confidence-chip>
              {confidenceLabel}
            </Badge>
          )}
          {gated.contestedFamily && (
            <Badge variant="outline" data-scale-contested-chip>
              estimation débattue
            </Badge>
          )}
        </div>
      )}

      {gated.ramp && gated.ramp.length > 0 && (
        <div data-scale-ramp className="flex w-full flex-col gap-afh-xs">
          <div
            aria-hidden="true"
            className="flex h-3 w-full overflow-hidden rounded-afh-lg"
          >
            {gated.ramp.map((entry) => (
              <div
                key={entry.country}
                style={{
                  flexGrow: entry.percentage ?? 1,
                  backgroundColor: `color-mix(in srgb, var(--accent) ${Math.max(
                    15,
                    Math.min(90, entry.percentage ?? 50)
                  )}%, var(--accent-tint))`,
                }}
              />
            ))}
          </div>
          <ul className="flex flex-col gap-afh-2xs text-afh-small text-afh-text-soft">
            {gated.ramp.map((entry) => (
              <li key={entry.country}>
                {entry.country}
                {entry.percentage !== undefined
                  ? ` — ${entry.percentage} %`
                  : ""}
                {entry.population !== undefined
                  ? ` (${formatNumberFr(entry.population)})`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const data: FichePanelData = {
    stepLabel: "02 · Échelle",
    heading: "Combien sont-ils ?",
    body: "Le poids démographique tel qu'attesté par le corpus, sans recalcul.",
    canvas,
  };

  return (
    <FichePanel
      data={data}
      size={size}
      side={side}
      sourceLine={{ label: gated.sourceLabel! }}
      className={cn(className)}
    />
  );
}

export default ScalePanel;
