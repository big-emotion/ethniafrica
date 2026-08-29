import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { RelationsListWithSourceSheet } from "@/components/relations/RelationsListWithSourceSheet";
import { getPeopleById } from "@/api/v2/services/peopleService";
import { getEgoNetwork } from "@/api/v2/services/relations";
import { transformRelationsToListItems } from "@/lib/relationsDataTransformer";
import { getPeopleLinksRoute } from "@/lib/routing";
import { deriveTrail } from "@/lib/navigation/deriveTrail";

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
  const people = await getPeopleById(slug);

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

  // The family was fetched for one crumb and nothing else. The trail follows
  // the path — Peuples › <people> › Liens — so the query goes with the crumb.
  const breadcrumbs = deriveTrail(
    getPeopleLinksRoute("fr", people.id),
    people.nameMain
  );

  return (
    <PageLayout language="fr" sectionName="Peuples">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <AfrikBreadcrumbs items={breadcrumbs} />
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
