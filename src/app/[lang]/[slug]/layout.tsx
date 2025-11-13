import { Metadata } from "next";
import { getPageFromRoute, getLanguageFromRoute } from "@/lib/routing";
import { loadDatasetIndex } from "@/lib/datasetLoader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const pageType = getPageFromRoute(
    `/${resolvedParams.lang}/${resolvedParams.slug}`
  );
  const language =
    getLanguageFromRoute(`/${resolvedParams.lang}/${resolvedParams.slug}`) ||
    "en";

  // Note: searchParams are not available in layout generateMetadata in Next.js 15
  // Metadata will be basic, detailed metadata with searchParams is handled in opengraph-image.tsx
  const pageTitle =
    pageType === "regions"
      ? language === "en"
        ? "Regions"
        : language === "fr"
          ? "Régions"
          : language === "es"
            ? "Regiones"
            : "Regiões"
      : pageType === "countries"
        ? language === "en"
          ? "Countries"
          : language === "fr"
            ? "Pays"
            : language === "es"
              ? "Países"
              : "Países"
        : pageType === "ethnicities"
          ? language === "en"
            ? "Ethnicities"
            : language === "fr"
              ? "Ethnies"
              : language === "es"
                ? "Etnias"
                : "Etnias"
          : "African Ethnicities Dictionary";

  const title = `${pageTitle} - African Ethnicities Dictionary`;
  const description =
    language === "en"
      ? "Explore ethnic groups across 55 African countries"
      : language === "fr"
        ? "Explorez les groupes ethniques dans les 55 pays africains"
        : language === "es"
          ? "Explore grupos étnicos en los 55 países africanos"
          : "Explore grupos étnicos em todos os 55 países africanos";

  const ogImageUrl = `/${resolvedParams.lang}/${resolvedParams.slug}/opengraph-image`;

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
