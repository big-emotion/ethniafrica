/**
 * /[lang]/comparer/[entityType]/[...ids] — comparison SSR page (FR62, NFR1).
 *
 * The URL path alone reconstructs the comparison: entityType is a French
 * segment (peuples|pays|familles), ids is the display order (left→right),
 * 2 to 3 entries, no duplicates. There is no reorder redirect — each
 * ordering of the same ids is its own stable, shareable URL.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assembleComparison } from "@/api/v2/handlers/compare";
import { transformComparisonData } from "@/lib/comparisonDataTransformer";
import { ComparisonView } from "@/components/compare/ComparisonView";
import type { CompareEntityPayload } from "@/types/compare";
import type { CompareEntityTypeParam } from "@/api/v2/schemas/compare";

export const revalidate = 3600;

interface PageParams {
  lang: string;
  entityType: string;
  ids: string[];
}

const ENTITY_TYPE_SLUGS = ["peuples", "pays", "familles"] as const;
type ComparerEntityTypeSlug = (typeof ENTITY_TYPE_SLUGS)[number];

const SLUG_TO_API_TYPE: Record<ComparerEntityTypeSlug, CompareEntityTypeParam> =
  {
    peuples: "peoples",
    pays: "countries",
    familles: "language-families",
  };

function isComparerEntityTypeSlug(
  value: string
): value is ComparerEntityTypeSlug {
  return (ENTITY_TYPE_SLUGS as readonly string[]).includes(value);
}

function hasValidSegmentShape(
  entityType: string,
  ids: string[]
): entityType is ComparerEntityTypeSlug {
  if (!isComparerEntityTypeSlug(entityType)) return false;
  if (ids.length < 2 || ids.length > 3) return false;
  return new Set(ids).size === ids.length;
}

// Shared by the page and generateMetadata (each caller reads Supabase once).
async function loadComparisonData(entityType: string, ids: string[]) {
  if (!hasValidSegmentShape(entityType, ids)) {
    notFound();
  }

  const result = await assembleComparison({
    entityType: SLUG_TO_API_TYPE[entityType],
    ids,
  });

  if (!result.ok) {
    notFound();
  }

  // assembleComparison's entities are structurally the comparable-row
  // payload the transformer expects (see COMPARABLE_ROWS registry).
  return transformComparisonData(
    result.entities as unknown as CompareEntityPayload[]
  );
}

// @req REQ-091
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang, entityType, ids } = await params;
  const data = await loadComparisonData(entityType, ids);

  const labels = data.columns.map((column) => column.label);
  const title = `Comparaison : ${labels.join(" · ")}`;
  const description = `Comparaison de fiches AFRIK : ${labels.join(", ")}. Identité, langues, démographie et confiance éditoriale côte à côte.`;
  const canonical = `/${lang}/comparer/${entityType}/${ids.join("/")}`;

  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// @req REQ-097
export default async function ComparisonPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { entityType, ids } = await params;
  const data = await loadComparisonData(entityType, ids);

  const title = `Comparaison : ${data.columns.map((column) => column.label).join(" · ")}`;

  return (
    <>
      <h1>{title}</h1>
      <ComparisonView data={data} />
    </>
  );
}
