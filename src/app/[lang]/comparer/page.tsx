/**
 * /[lang]/comparer — comparison picker shell (FR59).
 *
 * This is a shell: the type selector, search-backed entity picker and
 * sticky compare bar are populated in 9.5 (EntityComparePicker,
 * CompareStickyBar). 9.4 only wires the route into PageLayout.
 */
import { PageLayout } from "@/components/layout/PageLayout";

interface PageParams {
  lang: string;
}

// @req REQ-091
export default async function ComparerPickerPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  await params;

  return (
    <PageLayout language="fr" sectionName="Comparer" hideHeader>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-semibold text-afh-text">
          Comparer
        </h1>
        <p className="text-afh-text-soft mt-2">
          Sélectionnez 2 à 3 fiches du même type (peuples, pays ou familles
          linguistiques) pour les comparer côte à côte.
        </p>
      </div>
    </PageLayout>
  );
}
