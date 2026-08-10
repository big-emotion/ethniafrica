/**
 * How each AFRIK entity type reads its own headline figure (Epic 15 · Story
 * 15.4 · FR99) — the corpus value only, never a recalculation (R4).
 *
 * This lives outside `ScalePanel.tsx` because the panel is a `"use client"`
 * module (it owns the count-up animation) while the panel registry gates the
 * chapter during the *server* render. A server module may render a client
 * component, but calling a plain function exported from one throws at request
 * time — which is exactly how every fiche route reached a 500 between ETNI-812
 * and ETNI-819. Keeping the rule here lets both sides share one copy of it
 * instead of drifting apart, which was the original reason to export it at all.
 */

import type {
  ClassificationStatus,
  CountryDetail,
  CountryDistribution,
  LanguageFamilyDetail,
  PeopleDetail,
} from "@/types/afrik-frontend";

export interface ScaleContent {
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

/** The entity half of ScalePanelProps — what the scale figure is read from. */
export type ScaleSubject =
  | { entityType: "people"; payload: PeopleDetail }
  | { entityType: "country"; payload: CountryDetail }
  | { entityType: "language-family"; payload: LanguageFamilyDetail };

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

export function readScale(subject: ScaleSubject): ScaleContent | null {
  switch (subject.entityType) {
    case "people":
      return readPeopleScale(subject.payload);
    case "country":
      return readCountryScale(subject.payload);
    case "language-family":
      return readFamilyScale(subject.payload);
  }
}

/**
 * Whether this entity has a scale figure the panel can actually show.
 *
 * The panel registry drops the chapter — and with it the `#fiche-scale`
 * journey anchor — on the exact rule ScalePanel applies to itself. Without a
 * shared rule the registry would either duplicate it (two copies to drift
 * apart) or emit an anchor that scrolls to nothing.
 */
export function hasScaleContent(subject: ScaleSubject): boolean {
  const content = readScale(subject);
  return Boolean(content?.sourceLabel);
}
