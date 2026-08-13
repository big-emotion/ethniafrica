import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { RelationsListWithSourceSheet } from "@/components/relations/RelationsListWithSourceSheet";
import { getPeopleById } from "@/api/v2/services/peopleService";
import { getEgoNetwork } from "@/api/v2/services/relations";
import { getLanguageFamilyById } from "@/api/v2/services/languageFamilyService";
import { transformRelationsToListItems } from "@/lib/relationsDataTransformer";
import { getPeopleRoute } from "@/lib/routing";

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

  const family = await getLanguageFamilyById(people.languageFamilyId);
  const items = transformRelationsToListItems(
    egoNetwork.sourced,
    egoNetwork.derived
  );

  const breadcrumbs = [
    { label: "Familles", href: "/fr/familles" },
    ...(family
      ? [
          {
            label: family.nameFr,
            href: `/fr/familles/${family.id}`,
          },
        ]
      : []),
    { label: people.nameMain, href: getPeopleRoute("fr", people.id) },
    { label: "Liens" },
  ];

  return (
    <PageLayout language="fr" sectionName="Peuples">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <AfrikBreadcrumbs items={breadcrumbs} />
        <h1 className="text-2xl font-semibold mt-4 mb-6 text-afh-text">
          Liens de {people.nameMain}
        </h1>
        <RelationsListWithSourceSheet items={items} />
      </div>
    </PageLayout>
  );
}
