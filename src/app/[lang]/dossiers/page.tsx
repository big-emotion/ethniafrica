import type { Metadata } from "next";

import {
  AxisHubPage,
  axisHubMetadata,
  type AxisHubParams,
} from "@/components/hubs/axisHubPage";

/**
 * The dossiers hub, on the shared spread with the other two.
 *
 * It carried the theme directory alone from 6 September 2026, which made it
 * the one axis whose landing page looked unlike its neighbours — the same
 * complaint the header's dossiers panel had already been through. The
 * directory has not gone anywhere: it is what `/fr/dossiers/themes/[theme]`
 * renders, and the axis's own tiles reach the readings from here.
 */
// @req REQ-114 @req REQ-140
export function generateMetadata(props: AxisHubParams): Promise<Metadata> {
  return axisHubMetadata("dossiers", props);
}

// @req REQ-114 @req REQ-140
export default function DossiersHubRoute({ params }: AxisHubParams) {
  return <AxisHubPage axis="dossiers" params={params} />;
}
