"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import { buildContinentOverlay } from "@/lib/atlas/overlays";
import { buildCountryPickerTargets } from "@/lib/atlas/targets";
import { getLocalizedRoute } from "@/lib/routing";
import type { CountryId } from "@/types/afrik";

export interface CountryHubGlobeProps {
  /** Every country the corpus gives a fiche, in any order. */
  countryIds: CountryId[];
  /** Documented peoples per country, which the continent field is drawn from. */
  peopleCountsByCountry: Record<string, number> | undefined;
  missingMessage: string;
}

/**
 * `/fr/pays`, as a map you aim rather than a list you scroll (REQ-116).
 *
 * The three fiches all open on a globe; the hub that led to them opened on an
 * alphabet of cards, which made the countries the one part of the atlas you
 * reached without ever seeing where anything was. This is the same globe,
 * doing the hub's own job.
 *
 * Choosing navigates, and that is the difference from a fiche: a fiche's globe
 * re-aims because the reader is already somewhere and is looking around, while
 * a hub exists to be left. Opening a panel here would put a summary between
 * the reader and the fiche that summary is drawn from.
 *
 * The countries are offered as a list, never as pastilles. Fifty-four markers
 * at 430 px overlap into noise and the small ones stop being hittable — the
 * same reason the family footprint asks for a list.
 */
// @req REQ-116
export function CountryHubGlobe({
  countryIds,
  peopleCountsByCountry,
  missingMessage,
}: CountryHubGlobeProps) {
  const router = useRouter();

  const targets = useMemo(
    () => buildCountryPickerTargets(countryIds),
    [countryIds]
  );

  // The continent's own scene: a geographic frame, and a radial field over the
  // countries the corpus documents best. It measures the corpus, so it says
  // something the alphabet could not — which countries the atlas actually
  // knows about.
  const overlay = useMemo(
    () => buildContinentOverlay(peopleCountsByCountry),
    [peopleCountsByCountry]
  );

  return (
    <CountryHubStage>
      <AtlasGlobe
        overlay={overlay}
        targetPicker="list"
        pickerTargets={targets}
        areaNoun="l'atlas"
        missingMessage={missingMessage}
        onTargetChosen={(target) =>
          router.push(
            `${getLocalizedRoute("fr", "countries")}/${target.countryId}`
          )
        }
      />
    </CountryHubStage>
  );
}

/** The band the hub's globe stands on, matching the one every fiche opens with. */
function CountryHubStage({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="country-hub-globe"
      style={{
        position: "relative",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        backgroundColor: "var(--afh-night-ground)",
        containerType: "inline-size",
      }}
    >
      {children}
      <div
        aria-hidden="true"
        style={{
          height: 24,
          borderBottomStyle: "solid",
          borderBottomWidth: 1,
          borderBottomColor: "var(--afh-cat-ocre)",
        }}
      />
    </div>
  );
}

export default CountryHubGlobe;
