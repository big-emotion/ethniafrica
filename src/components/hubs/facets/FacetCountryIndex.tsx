"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { CountryId } from "@/types/afrik";

/**
 * One row of the current facet, as it appears when a country is chosen on the
 * globe.
 *
 * A map click always yields a *country* — and that is correct rather than a
 * compromise: the country is the only unit the three cartographic encodings
 * share. So the panel cannot show "the thing you clicked"; it shows the
 * intersection of the current facet and its filters with that country.
 */
export interface FacetCountryRow {
  id: string;
  label: string;
  /** The fiche this row opens. Composed by the caller through the route helpers. */
  href: string;
}

/** Country id → the rows of the current, already-filtered facet that touch it. */
export type FacetCountryIndex = Partial<Record<CountryId, FacetCountryRow[]>>;

interface FacetCountryIndexValue {
  index: FacetCountryIndex;
  publish: (index: FacetCountryIndex) => void;
}

const FacetCountryIndexContext = createContext<FacetCountryIndexValue>({
  index: {},
  publish: () => {},
});

/**
 * Held by the shell, written by the facet page, read by the globe.
 *
 * The globe is mounted by the layout so its WebGL context survives a facet
 * switch, which puts it *above* the page that knows what is on screen. React
 * props only travel downward, so the facet page publishes its rows into this
 * context and the globe reads them — the one piece of shared machinery the
 * three facets must agree on, and therefore the one that could not be
 * invented three times.
 */
// @req REQ-117
export function FacetCountryIndexProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [index, publish] = useState<FacetCountryIndex>({});
  const value = useMemo(() => ({ index, publish }), [index]);

  return (
    <FacetCountryIndexContext.Provider value={value}>
      {children}
    </FacetCountryIndexContext.Provider>
  );
}

// @req REQ-117
export function useFacetCountryIndex(): FacetCountryIndex {
  return useContext(FacetCountryIndexContext).index;
}

/**
 * What a facet page renders to hand its rows up to the globe.
 *
 * Renders nothing. A server component cannot call a context setter, so the
 * page states its rows as data and this carries them across the boundary —
 * which also keeps the rows serialisable, the same constraint that stops
 * `targetFacts` being passed from a server route.
 */
// @req REQ-117
export function PublishFacetCountryIndex({
  index,
}: {
  index: FacetCountryIndex;
}) {
  const { publish } = useContext(FacetCountryIndexContext);

  // No cleanup on unmount. A facet switch unmounts the outgoing publisher and
  // mounts the incoming one in separate commits, so clearing on the way out
  // can land *after* the arriving page has published and wipe it — a globe
  // whose panel is empty on every second switch. Each page overwrites the
  // index whole, which is the same guarantee without the race.
  useEffect(() => {
    publish(index);
  }, [index, publish]);

  return null;
}
