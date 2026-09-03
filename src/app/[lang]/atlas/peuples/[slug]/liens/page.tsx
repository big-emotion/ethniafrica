import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { RelationsListWithSourceSheet } from "@/components/relations/RelationsListWithSourceSheet";
import { getPeopleById } from "@/api/v2/services/peopleService";
import { getEgoNetwork } from "@/api/v2/services/relations";
import { transformRelationsToListItems } from "@/lib/relationsDataTransformer";
import { logger } from "@/lib/api/logger";

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
  const { slug } = await params;

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
    return { title: "Liens — EthniAfrica" };
  }

  if (!people) {
    return { title: "Liens introuvables — EthniAfrica" };
  }

  return {
    title: `Liens de ${people.nameMain} — EthniAfrica`,
    description: `Liens migratoires, commerciaux et religieux documentés entre ${people.nameMain} et les peuples voisins, avec leurs sources.`,
  };
}

// @req REQ-097 FR72
export default async function PeopleLinksPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;

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
      language="fr"
      sectionName="Peuples"
      trailLabel={people.nameMain}
    >
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-afh-h2 font-semibold mt-4 mb-6 text-afh-text">
          Liens de {people.nameMain}
        </h1>
        <RelationsListWithSourceSheet
          items={items}
          center={{ id: people.id, nameMain: people.nameMain }}
        />
      </div>
    </PageLayout>
  );
}
