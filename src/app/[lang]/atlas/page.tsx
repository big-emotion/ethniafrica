import type { Metadata } from "next";

import {
  AxisHubPage,
  axisHubMetadata,
  type AxisHubParams,
} from "@/components/hubs/axisHubPage";

// @req REQ-114 @req REQ-140
export function generateMetadata(props: AxisHubParams): Promise<Metadata> {
  return axisHubMetadata("atlas", props);
}

// @req REQ-114 @req REQ-140
export default function AtlasHubRoute({ params }: AxisHubParams) {
  return <AxisHubPage axis="atlas" params={params} />;
}
