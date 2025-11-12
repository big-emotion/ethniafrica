import { Metadata } from "next";
import { getPageFromRoute, getLanguageFromRoute } from "@/lib/routing";
import { loadDatasetIndex } from "@/lib/datasetLoader";

type Props = {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const pageType = getPageFromRoute(`/${resolvedParams.lang}/${resolvedParams.slug}`);
  const language = getLanguageFromRoute(`/${resolvedParams.lang}/${resolvedParams.slug}`) || "en";
  
  let title = "African Ethnicities Dictionary";
  let description = "Explore ethnic groups across 55 African countries";
  let name = "";

  // Ensure resolvedSearchParams is an object (handle both null and undefined)
  const searchParamsObj = resolvedSearchParams && typeof resolvedSearchParams === 'object' ? resolvedSearchParams : {};

  if (pageType === "regions" && searchParamsObj.region) {
    const regionKey = String(searchParamsObj.region);
    // Try to get the region name from the dataset
    try {
      const index = await loadDatasetIndex();
      const region = index.regions[regionKey];
      name = region ? region.name : regionKey;
    } catch {
      name = regionKey;
    }
    title = `${name} - African Ethnicities Dictionary`;
    description = language === "en"
      ? `Explore countries and ethnic groups in ${name}`
      : language === "fr"
      ? `Explorez les pays et groupes ethniques de ${name}`
      : language === "es"
      ? `Explore países y grupos étnicos en ${name}`
      : `Explore países e grupos étnicos em ${name}`;
  } else if (pageType === "countries" && searchParamsObj.country) {
    name = String(searchParamsObj.country);
    title = `${name} - African Ethnicities Dictionary`;
    description = language === "en"
      ? `Demographics and ethnic groups in ${name}`
      : language === "fr"
      ? `Démographie et groupes ethniques en ${name}`
      : language === "es"
      ? `Demografía y grupos étnicos en ${name}`
      : `Demografia e grupos étnicos em ${name}`;
  } else if (pageType === "ethnicities" && searchParamsObj.ethnicity) {
    name = String(searchParamsObj.ethnicity);
    title = `${name} - African Ethnicities Dictionary`;
    description = language === "en"
      ? `Information about the ${name} ethnic group`
      : language === "fr"
      ? `Informations sur le groupe ethnique ${name}`
      : language === "es"
      ? `Información sobre el grupo étnico ${name}`
      : `Informações sobre o grupo étnico ${name}`;
  }

  // Build the Open Graph image URL with query params
  const queryString = new URLSearchParams(
    Object.entries(searchParamsObj).reduce((acc, [key, value]) => {
      if (value) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const ogImageUrl = `/${resolvedParams.lang}/${resolvedParams.slug}/opengraph-image${queryString ? `?${queryString}` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function SlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

