import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AxisHubSpread } from "@/components/hubs/AxisHubSpread";
import { PageLayout } from "@/components/layout/PageLayout";
import { AXIS_HUB_PAGE } from "@/lib/hubs/axisRoutes";
import { drawHubSpread } from "@/lib/hubs/hubSpread";
import { getHubModules } from "@/lib/hubs/moduleAvailability";
import type { AccessMode } from "@/lib/hubs/moduleRegistry";
import { isLocale } from "@/lib/locale";
import { getLocalizedRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import { getTranslation } from "@/lib/translations";

/**
 * The three axis hubs, written once.
 *
 * They differ by one word — which axis — and by nothing else: the same spread,
 * the same head, the same reads. Three copies of that is three places for the
 * atlas hub to drift away from the games hub, which is how the retired hubs
 * ended up being three different pages wearing one name.
 */
export interface AxisHubParams {
  params: Promise<{ lang: string }>;
}

/**
 * `pageTitle` and `blurb` rather than the title the page renders.
 *
 * The `h1` names the axis — `L'atlas` — because brand charter §5.3 reserves
 * the brand gradient for a title that names a part of the apparatus. A search
 * result has no gradient and no masthead above it, so it gets the descriptive
 * pair instead: what the axis is, and what it holds.
 */
// @req REQ-114 @req REQ-140
export async function axisHubMetadata(
  axis: AccessMode,
  { params }: AxisHubParams
): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const page = AXIS_HUB_PAGE[axis];
  const hub = getTranslation(lang).hubs[axis];

  return {
    title: hub.pageTitle,
    description: hub.blurb,
    ...surfaceHead(
      lang,
      page,
      (language) => getLocalizedRoute(language, page),
      { title: hub.pageTitle, description: hub.blurb }
    ),
  };
}

// @req REQ-114 @req REQ-140
export async function AxisHubPage({
  axis,
  params,
}: AxisHubParams & {
  axis: AccessMode;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const modules = await getHubModules(axis);

  return (
    // No `title` and no `sectionName`, so `PageLayout` raises no band: the
    // spread names the axis in its own first line and a plate above it would
    // print that name twice. `flushTop`/`flushBottom` because the spread pads
    // itself — the floor it may claim is measured against that padding, and
    // main's own would add a second one the calculation does not know about.
    <PageLayout language={lang} flushTop flushBottom>
      <AxisHubSpread
        axis={axis}
        language={lang}
        modules={modules}
        spread={drawHubSpread()}
      />
    </PageLayout>
  );
}
