/**
 * /[lang]/comparer — entity picker for a 2–3 fiche comparison (FR59).
 *
 * The picker is a client component (debounced search, selection state), and a
 * server page cannot hand it the `onCompare` callback, so the route itself is
 * the client boundary. Nothing here is server-rendered data: the picker fetches
 * its own suggestions from /api/v2/search.
 *
 * The result route owns the comparison; this page only builds its URL. The
 * French segment map is duplicated from
 * comparer/[entityType]/[...ids]/page.tsx on purpose — that route validates
 * untrusted segments, this one emits them, and coupling the two would make the
 * result route trust its caller.
 */
"use client";

import { useParams, useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/PageLayout";
import { EntityComparePicker } from "@/components/compare/EntityComparePicker";
import type { CompareEntityType } from "@/hooks/use-compare-selection";

const RESULT_ROUTE_SEGMENT: Record<CompareEntityType, string> = {
  peoples: "peuples",
  countries: "pays",
  "language-families": "familles",
};

// @req REQ-091
export default function ComparerPickerPage() {
  const router = useRouter();
  const { lang } = useParams<{ lang: string }>();

  const goToComparison = (type: CompareEntityType, ids: string[]) => {
    router.push(
      `/${lang}/comparer/${RESULT_ROUTE_SEGMENT[type]}/${ids.join("/")}`
    );
  };

  return (
    <PageLayout language="fr" sectionName="Comparer" hideHeader>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-semibold text-afh-text">
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
