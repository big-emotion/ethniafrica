import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import { ficheCanonical } from "@/lib/seo/ficheCanonical";
import type { Language } from "@/types/shared";
import { PageLayout } from "@/components/layout/PageLayout";
import { FicheSequence } from "@/components/fiche/FicheSequence";
import { FicheHeroHead } from "@/components/fiche/FicheHeroHead";
import { LanguageFicheTitle } from "@/components/language/LanguageFicheTitle";
import { LanguageDetailViewV2 } from "@/components/language/LanguageDetailViewV2";
import { getLanguageById } from "@/api/v2/services/languageService";
import { transformLanguageData } from "@/lib/languageDataTransformer";
import { getActiveSourceFlags } from "@/lib/supabase/queries/afrik/flags";

interface PageParams {
  lang: string;
  slug: string;
}

// @req REQ-019
export const revalidate = 3600;

// @req REQ-091
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  return ficheCanonical("language", lang as Language, slug);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * The language fiche (ETNI-1507): the middle layer of the AFRIK hierarchy —
 * family → language → people → country — that used to be a hole a reader
 * fell through between a family fiche and a people fiche.
 *
 * Two differences from the other three fiches, both because
 * `LanguageDetail` (REQ-136) is a thinner aggregate than a people or a
 * country:
 *
 * - No globe. A language declares no per-country distribution to draw, only
 *   a family, its speaking peoples and a vitality status, so `FicheSequence`
 *   gets no `globe` prop rather than a fabricated one — it already renders
 *   that case.
 * - No revision history. `RevisionEntityType` has no `language` member, so a
 *   `@vNN` or `@latest` slug names a capability this entity does not have
 *   yet; the route 404s on either rather than pretend to resolve one.
 */
// @req REQ-136
export default async function LanguesSlugPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;

  const parsed = parseVersionedSlug(decodeURIComponent(slug));
  if (!parsed || parsed.mode !== "live") {
    notFound();
  }

  const [language, sourceFlags] = await Promise.all([
    getLanguageById(parsed.slug),
    getActiveSourceFlags("language", parsed.slug),
  ]);
  if (!language) {
    notFound();
  }

  const data = transformLanguageData(language);

  // Live version (revalidate = 3600 at segment level)
  return (
    <PageLayout
      language="fr"
      sectionName="Langues"
      flushTop
      trailLabel={data.name}
      heroHead={
        <FicheHeroHead entityType="language">
          <LanguageFicheTitle data={data} />
        </FicheHeroHead>
      }
    >
      <FicheSequence
        entityType="language"
        entityId={parsed.slug}
        entityName={data.name}
        record={
          <LanguageDetailViewV2
            data={data}
            hasSourceFlag={sourceFlags.length > 0}
          />
        }
      />
    </PageLayout>
  );
}
