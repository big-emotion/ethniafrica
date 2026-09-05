import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ficheCanonical } from "@/lib/seo/ficheCanonical";
import type { Language } from "@/types/shared";
import { loadPatronymeFiche } from "@/lib/fiche/ficheExistence";
import { readNameStanding } from "@/lib/patronymes/content";
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

/**
 * What this fiche asks a crawler to do with it.
 *
 * A name dossier resting only on `unverified` citations stays published — the
 * Source Tier Policy suppresses nothing for being weak — but publishing a
 * claim is not the same as offering it to a search index as an answer, so the
 * weakest dossiers are withheld from the index until a stronger citation lands.
 *
 * `follow` stays `true` on purpose: the fiche's outbound links point at
 * sourced fiches, and `nofollow` would strip the inbound signal those earn
 * from a page whose only fault is its own thin sourcing.
 *
 * The canonical is declared either way. Indexability and identity answer
 * different questions, and a `noindex` page still has to say which address it
 * is the duplicate of.
 */
// @req REQ-133
// @req REQ-147
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang, slug } = await params;

  const canonical = ficheCanonical("name", lang as Language, slug);
  // An unparseable slug gets no metadata from `ficheCanonical`, and a robots
  // directive on a 404 would be the same mistake in another field.
  if (!canonical.alternates) return canonical;

  let standing: ReturnType<typeof readNameStanding>;
  try {
    const patronyme = await loadPatronymeFiche(decodeURIComponent(slug));
    // The route 404s an unknown name from its layout; a 404 declares nothing.
    if (!patronyme) return {};
    standing = readNameStanding(patronyme.content);
  } catch {
    // An unreachable corpus is not a weak dossier. Answering `noindex` to a
    // timeout would de-list a sourced fiche, so a failed read leaves the
    // metadata as it stood before this directive existed. The page body reads
    // the corpus again and is where the failure surfaces.
    return canonical;
  }

  // No readable citation is treated as the weakest reading rather than as an
  // unknown one — `readNameStanding` documents that floor.
  if (standing !== null && standing.tier !== "unverified") return canonical;

  return { ...canonical, robots: { index: false, follow: true } };
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
  const { lang, slug } = await params;

  const patronyme = await loadPatronymeFiche(decodeURIComponent(slug));
  if (!patronyme) {
    notFound();
  }

  return (
    <PageLayout
      language={lang as Language}
      sectionName="Appellations"
      flushTop
      trailLabel={patronyme.nameMain}
      heroHead={
        <FicheHeroHead entityType="name">
          <PatronymeFicheTitle
            patronyme={patronyme}
            language={lang as Language}
          />
        </FicheHeroHead>
      }
    >
      <FicheSequence
        entityType="name"
        entityId={patronyme.id}
        entityName={patronyme.nameMain}
        record={
          <PatronymeFicheView
            patronyme={patronyme}
            language={lang as Language}
          />
        }
      />
    </PageLayout>
  );
}
