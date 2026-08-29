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

/**
 * Country id → the address of this facet narrowed to that country.
 *
 * Kept beside the row index rather than folded into it, because narrowing is a
 * capability of the *facet*, not a property of a row set: peoples and families
 * both take a country filter, the countries facet takes none, and on that facet
 * a country is not something to narrow to but something to open. A shape that
 * carried a `narrowHref?` on every entry would leave the countries facet
 * writing `undefined` 54 times to say a thing its filters never offered.
 *
 * Absent here means "this facet cannot be read one country at a time", which is
 * the only reading the globe needs to make.
 */
export type FacetCountryNarrowing = Partial<Record<CountryId, string>>;

/**
 * What the facet page tells the shared map about the reading on screen.
 *
 * Published as one value, never as three pieces of state. A facet switch or a
 * filter change replaces all three at once, and separate setters would let the
 * globe render one commit where the rows are the new facet's and the focus is
 * still the old one's.
 */
export interface FacetCountryReading {
  index: FacetCountryIndex;
  narrowing: FacetCountryNarrowing;
  /**
   * The country the reading is *already* narrowed to, when the reader set that
   * filter. This is the map's half of the loop: the list is not the only thing
   * that answers to `?pays=BEN`, the globe opens on Benin too.
   */
  focused: CountryId | null;
}

const EMPTY_READING: FacetCountryReading = {
  index: {},
  narrowing: {},
  focused: null,
};

interface FacetCountryIndexValue {
  reading: FacetCountryReading;
  publish: (reading: FacetCountryReading) => void;
}

const FacetCountryIndexContext = createContext<FacetCountryIndexValue>({
  reading: EMPTY_READING,
  publish: () => {},
});

/**
 * Held by the shell, written by the facet page, read by the globe.
 *
 * The globe is mounted by the layout so its WebGL context survives a facet
 * switch, which puts it *above* the page that knows what is on screen. React
 * props only travel downward, so the facet page publishes its reading into this
 * context and the globe reads it — the one piece of shared machinery the
 * three facets must agree on, and therefore the one that could not be
 * invented three times.
 */
// @req REQ-117
export function FacetCountryIndexProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [reading, publish] = useState<FacetCountryReading>(EMPTY_READING);
  const value = useMemo(() => ({ reading, publish }), [reading]);

  return (
    <FacetCountryIndexContext.Provider value={value}>
      {children}
    </FacetCountryIndexContext.Provider>
  );
}

// @req REQ-117
export function useFacetCountryReading(): FacetCountryReading {
  return useContext(FacetCountryIndexContext).reading;
}

/**
 * What a facet page renders to hand its reading up to the globe.
 *
 * Renders nothing. A server component cannot call a context setter, so the
 * page states its reading as data and this carries it across the boundary —
 * which also keeps the rows serialisable, the same constraint that stops
 * `targetFacts` being passed from a server route.
 */
// @req REQ-117
export function PublishFacetCountryIndex({
  index,
  narrowing,
  focused = null,
}: {
  index: FacetCountryIndex;
  /** Omitted by a facet with no country filter — see `FacetCountryNarrowing`. */
  narrowing?: FacetCountryNarrowing;
  focused?: CountryId | null;
}) {
  const { publish } = useContext(FacetCountryIndexContext);

  // No cleanup on unmount. A facet switch unmounts the outgoing publisher and
  // mounts the incoming one in separate commits, so clearing on the way out
  // can land *after* the arriving page has published and wipe it — a globe
  // whose panel is empty on every second switch. Each page overwrites the
  // reading whole, which is the same guarantee without the race.
  useEffect(() => {
    publish({ index, narrowing: narrowing ?? {}, focused });
  }, [index, narrowing, focused, publish]);

  return null;
}
