import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Language } from "@/types/ethnicity";
import { getLocalizedRoute } from "@/lib/routing";
import { DetailPageClient } from "@/components/pages/DetailPageClient";

type SectionType = "country" | "region" | "ethnicity";

const LANGUAGE_SEGMENTS: Record<Language, Record<SectionType, string>> = {
  en: {
    country: "countries",
    region: "regions",
    ethnicity: "ethnicities",
  },
  fr: {
    country: "pays",
    region: "regions",
    ethnicity: "ethnies",
  },
  es: {
    country: "paises",
    region: "regiones",
    ethnicity: "etnias",
  },
  pt: {
    country: "paises",
    region: "regioes",
    ethnicity: "etnias",
  },
};

const SECTION_TO_PAGE: Record<
  SectionType,
  "countries" | "regions" | "ethnicities"
> = {
  country: "countries",
  region: "regions",
  ethnicity: "ethnicities",
};

function resolveSection(lang: Language, section: string): SectionType | null {
  const mapping = LANGUAGE_SEGMENTS[lang];
  const match = (Object.keys(mapping) as SectionType[]).find(
    (type) => mapping[type] === section
  );
  return match ?? null;
}

async function getBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  const headersList = await headers();
  const protocol =
    headersList.get("x-forwarded-proto") ??
    headersList.get("x-forwarded-protocol") ??
    "http";
  const host = headersList.get("host");
  return `${protocol}://${host}`;
}

async function fetchFromApi<T>(path: string): Promise<T> {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    next: { revalidate: 60 },
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return response.json() as Promise<T>;
}

interface CountryDetailPayload {
  name: string;
  population: number;
  percentageInRegion: number;
  percentageInAfrica: number;
  region: string;
  ethnicities: Array<{
    name: string;
    population: number;
    percentageInCountry: number;
    percentageInRegion: number;
    percentageInAfrica: number;
  }>;
}

interface RegionDetailPayload {
  name: string;
  totalPopulation: number;
  countries: Record<
    string,
    {
      population: number;
      percentageInRegion: number;
      percentageInAfrica: number;
      ethnicityCount: number;
    }
  >;
  ethnicities: Record<
    string,
    {
      totalPopulationInRegion: number;
      percentageInRegion: number;
      percentageInAfrica: number;
    }
  >;
}

interface EthnicityDetailPayload {
  name: string;
  totalPopulation: number;
  percentageInAfrica: number;
  countries: Array<{
    country: string;
    region: string;
    population: number;
    percentageInCountry: number;
    percentageInRegion: number;
    percentageInAfrica: number;
  }>;
}

type DetailData =
  | {
      type: "country";
      payload: CountryDetailPayload;
    }
  | {
      type: "region";
      payload: RegionDetailPayload;
    }
  | {
      type: "ethnicity";
      payload: EthnicityDetailPayload;
    };

export default async function LocalizedDetailPage({
  params,
}: {
  params: Promise<{ lang: string; section: string; item: string }>;
}) {
  const { lang, section, item } = await params;

  if (!["en", "fr", "es", "pt"].includes(lang)) {
    notFound();
  }

  const language = lang as Language;
  const sectionType = resolveSection(language, section);

  if (!sectionType) {
    notFound();
  }

  let detailData: DetailData;
  const encodedItem = encodeURIComponent(item);

  switch (sectionType) {
    case "country": {
      const payload = await fetchFromApi<CountryDetailPayload>(
        `/api/countries/${encodedItem}`
      );
      detailData = { type: "country", payload };
      break;
    }
    case "region": {
      const payload = await fetchFromApi<RegionDetailPayload>(
        `/api/regions/${encodedItem}`
      );
      detailData = { type: "region", payload };
      break;
    }
    case "ethnicity": {
      const payload = await fetchFromApi<EthnicityDetailPayload>(
        `/api/ethnicities/${encodedItem}`
      );
      detailData = { type: "ethnicity", payload };
      break;
    }
    default:
      notFound();
  }

  const listHref = getLocalizedRoute(language, SECTION_TO_PAGE[sectionType]);

  return (
    <DetailPageClient
      lang={language}
      sectionType={sectionType}
      sectionSlug={section}
      item={item}
      listHref={listHref}
      data={detailData}
    />
  );
}
