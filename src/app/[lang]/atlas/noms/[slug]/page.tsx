import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ficheCanonical } from "@/lib/seo/ficheCanonical";
import type { Language } from "@/types/shared";
import { getPatronymeById } from "@/api/v2/services/patronymes";
import { PageLayout } from "@/components/layout/PageLayout";
import { FicheSequence } from "@/components/fiche/FicheSequence";
import { FicheHeroHead } from "@/components/fiche/FicheHeroHead";
import { PatronymeFicheTitle } from "@/components/patronymes/PatronymeFicheTitle";
import { PatronymeFicheView } from "@/components/patronymes/PatronymeFicheView";

// @req REQ-133
export const revalidate = 3600;

interface PageParams {
  lang: string;
  slug: string;
}

// @req REQ-133
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  return ficheCanonical("name", lang as Language, slug);
}

/**
 * A patronyme fiche carries no globe (REQ-133 — see FicheSequence's own
 * doc comment on `globe?`): it is a naming fact, not a bounded cartographic
 * subject, so `FicheSequence` renders with `globe` omitted rather than
 * passed as `null` or an empty band.
 */
// @req REQ-133
export default async function AppellationsSlugPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;

  const patronyme = await getPatronymeById(decodeURIComponent(slug));
  if (!patronyme) {
    notFound();
  }

  return (
    <PageLayout
      language="fr"
      sectionName="Appellations"
      flushTop
      trailLabel={patronyme.nameMain}
      heroHead={
        <FicheHeroHead entityType="name">
          <PatronymeFicheTitle patronyme={patronyme} />
        </FicheHeroHead>
      }
    >
      <FicheSequence
        entityType="name"
        entityId={patronyme.id}
        entityName={patronyme.nameMain}
        record={<PatronymeFicheView patronyme={patronyme} />}
      />
    </PageLayout>
  );
}
