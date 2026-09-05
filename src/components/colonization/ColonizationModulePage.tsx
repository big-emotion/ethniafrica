import { PageLayout } from "@/components/layout/PageLayout";
import { DoctrineLinkCard } from "@/components/source-transparency/DoctrineLinkCard";
import { FragmentationView } from "@/components/colonization/FragmentationView";
import { EventTimelineMarkers } from "@/components/colonization/EventTimelineMarkers";
import { EventChronologyTable } from "@/components/colonization/EventChronologyTable";
import { getTranslation } from "@/lib/translations";
import type { ColonizationModuleData } from "@/lib/colonizationDataTransformer";
import type { Language } from "@/types/shared";

export interface ColonizationModulePageProps {
  data: ColonizationModuleData;
  language: Language;
}

/**
 * Orchestrates the `/fr/regards/colonisation-et-resistances` sections (Epic
 * 13, Story 13.9, ETNI-533, FR90). Every section but the doctrine intro is
 * conditionally rendered from `data` (never from an ad-hoc mapping here) —
 * `mapSection` / `imposedNames` / `displacement` / `resistances` are
 * structurally `null` until Stories 13.8/13.10/13.11 land and extend
 * `colonizationDataTransformer`'s output. `timeline` (Story 13.12,
 * ETNI-536) is wired here: `EventTimelineMarkers` (interactive, JS-gated
 * marker layer) and `EventChronologyTable` (always-in-the-DOM text
 * equivalent) render the same event set.
 */
// @req FR90
// @req REQ-101
export function ColonizationModulePage({
  data,
  language,
}: ColonizationModulePageProps) {
  const t = getTranslation(language).colonization;

  return (
    <PageLayout
      language={language}
      title={t.pageTitle}
      subtitle={t.pageSubtitle}
    >
      <DoctrineLinkCard slug={data.doctrine.slug} />

      {data.fragmentation && data.fragmentation.length > 0 && (
        <section
          aria-labelledby="colonization-fragmentation-heading"
          className="mt-8"
        >
          <h2
            id="colonization-fragmentation-heading"
            className="text-afh-h2 font-semibold mb-4 text-afh-text"
          >
            {t.fragmentation.title}
          </h2>
          <ul className="flex flex-col gap-6">
            {data.fragmentation.map((entry) => (
              <li key={entry.peopleId}>
                <FragmentationView
                  fragmentation={entry.fragmentation}
                  variant="fiche-section"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.timeline && data.timeline.length > 0 && data.timelineBounds && (
        <section
          aria-labelledby="colonization-timeline-heading"
          className="mt-8"
        >
          <h2
            id="colonization-timeline-heading"
            className="text-afh-h2 font-semibold mb-4 text-afh-text"
          >
            {t.timeline.title}
          </h2>
          <EventTimelineMarkers
            events={data.timeline}
            bounds={data.timelineBounds}
            language={language}
          />
          <EventChronologyTable events={data.timeline} language={language} />
        </section>
      )}

      {data.sources && data.sources.length > 0 && (
        <section
          aria-labelledby="colonization-sources-heading"
          className="mt-8"
        >
          <h2
            id="colonization-sources-heading"
            className="text-afh-h2 font-semibold mb-4 text-afh-text"
          >
            {t.sources.title}
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {data.sources.map((source) => (
              <li key={`${source.peopleId}-${source.countryIso3}`}>
                <a
                  href={`#fragmentation-${source.peopleId}-${source.countryIso3}`}
                  className="text-afh-small underline text-[color:var(--afh-terracotta)]"
                >
                  {t.sources.linkLabel}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageLayout>
  );
}
