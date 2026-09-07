import type { Metadata } from "next";

import {
  AxisHubPage,
  axisHubMetadata,
  type AxisHubParams,
} from "@/components/hubs/axisHubPage";

// @req REQ-114 @req REQ-140
export function generateMetadata(props: AxisHubParams): Promise<Metadata> {
  return axisHubMetadata("jeux", props);
}

// @req REQ-114 @req REQ-140
export default function JeuxHubRoute({ params }: AxisHubParams) {
  return <AxisHubPage axis="jeux" params={params} />;
}
