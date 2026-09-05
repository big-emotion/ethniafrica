/**
 * /[lang]/comparer — entity picker for a 2–3 fiche comparison (FR59).
 *
 * The picker is a client component (debounced search, selection state), and a
 * server page cannot hand it the `onCompare` callback, so the route itself is
 * the client boundary. Nothing here is server-rendered data: the picker fetches
 * its own suggestions from /api/v2/search.
 *
 * The result route owns the comparison; this page only builds its URL, from
 * the same slug table the middleware and the switcher walk — the result route
 * still validates the segments it receives, it does not trust this caller.
 */
"use client";

import { useParams, useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/PageLayout";
import { EntityComparePicker } from "@/components/compare/EntityComparePicker";
import type { CompareEntityType } from "@/hooks/use-compare-selection";
import { DEFAULT_LOCALE, isLocale } from "@/lib/locale";
import {
  COMPARE_ENTITY_SEGMENTS,
  getLocalizedRoute,
  type CompareEntityKey,
} from "@/lib/routing";

const ENTITY_KEY: Record<CompareEntityType, CompareEntityKey> = {
  peoples: "peoples",
  countries: "countries",
  "language-families": "families",
};

// @req REQ-091
export default function ComparerPickerPage() {
  const router = useRouter();
  const { lang } = useParams<{ lang: string }>();
  const language = isLocale(lang) ? lang : DEFAULT_LOCALE;

  const goToComparison = (type: CompareEntityType, ids: string[]) => {
    const segment = COMPARE_ENTITY_SEGMENTS[language][ENTITY_KEY[type]];
    router.push(
      `${getLocalizedRoute(language, "compare")}/${segment}/${ids.join("/")}`
    );
  };

  return (
    <PageLayout language={language} sectionName="Comparer" hideHeader>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-afh-h1 font-display font-semibold text-afh-text">
          Comparer
        </h1>
        {/* The two-entry minimum is otherwise discoverable only by finding
            the compare button disabled, which reads as a broken control. */}
        <p className="mt-2 max-w-[58ch] text-afh-fg-muted">
          Choisissez deux ou trois fiches du même type, puis lancez la
          comparaison.
        </p>
        <EntityComparePicker className="mt-6" onCompare={goToComparison} />
      </div>
    </PageLayout>
  );
}
