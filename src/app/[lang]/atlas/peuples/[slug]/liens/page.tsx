import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { RETIRED_PEOPLE_IDS } from "@/lib/afrik/retiredPeopleIds";
import { getPeopleLinksRoute } from "@/lib/routing";
import { ficheCanonical } from "@/lib/seo/ficheCanonical";
import type { Language } from "@/types/shared";
import { RelationsListWithSourceSheet } from "@/components/relations/RelationsListWithSourceSheet";
import { getPeopleById } from "@/api/v2/services/peopleService";
import { getEgoNetwork } from "@/api/v2/services/relations";
import { transformRelationsToListItems } from "@/lib/relationsDataTransformer";
import { logger } from "@/lib/api/logger";
import { relationsCopy } from "@/lib/i18n/copy/relations";

// @req REQ-097 FR72
export const revalidate = 3600;

interface PageParams {
  lang: string;
  slug: string;
}

// @req REQ-097 FR72
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const language = lang as Language;
  const copy = relationsCopy[language].page;
  // The links page is a chapter of its people's fiche and shares its
  // canonical treatment: it was in the sitemap with no canonical at all.
  const head = await ficheCanonical("peopleLinks", language, slug);

  // A read that fails must still leave the document a title. Metadata settles
  // after this segment's Suspense shell — and its `200` — has been flushed, so
  // a rejection here cannot become a 404: Next drops the metadata instead and
  // the page renders titleless, which axe reports as a serious
  // `document-title` violation. The unnamed fallback below is the honest
  // answer to "we could not read who this is", and the body still surfaces the
  // failure itself.
  let people: Awaited<ReturnType<typeof getPeopleById>> = null;
  try {
    people = await getPeopleById(slug);
  } catch (error) {
    logger.error(`Links metadata read failed for ${slug}`, error);
    return { ...head, title: copy.fallbackTitle };
  }

  if (!people) {
    return { title: copy.missingTitle };
  }

  return {
    ...head,
    title: copy.metadataTitle(people.nameMain),
    description: copy.description(people.nameMain),
  };
}

// @req REQ-097 FR72
export default async function PeopleLinksPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { lang, slug } = await params;
  const language = lang as Language;
  const copy = relationsCopy[language].page;

  // The fiche page redirects a retired id to its successor; its links page
  // must follow it there rather than 404 once the old row is pruned.
  const successorId = RETIRED_PEOPLE_IDS[slug];
  if (successorId) {
    redirect(getPeopleLinksRoute(language, successorId));
  }

  const [people, egoNetwork] = await Promise.all([
    getPeopleById(slug),
    getEgoNetwork(slug),
  ]);

  if (!people) {
    notFound();
  }

  const items = transformRelationsToListItems(
    egoNetwork.sourced,
    egoNetwork.derived
  );

  return (
    <PageLayout
      language={language}
      sectionName={copy.section}
      trailLabel={people.nameMain}
    >
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-afh-h2 font-semibold mt-4 mb-6 text-afh-text">
          {copy.title(people.nameMain)}
        </h1>
        <RelationsListWithSourceSheet
          items={items}
          center={{ id: people.id, nameMain: people.nameMain }}
          language={language}
        />
      </div>
    </PageLayout>
  );
}
