import { notFound } from "next/navigation";
import { Language } from "@/types/ethnicity";
import { getLocalizedRoute } from "@/lib/routing";
import { DetailPageClient } from "@/components/pages/DetailPageClient";
import {
  getCountryDetailsByKey,
  getRegion,
  getEthnicityGlobalDetailsByKey,
} from "@/lib/api/datasetLoader.server";
import {
  getCountryWithDescription,
  getCountryAncientNames,
  getTopEthnicitiesForCountry,
} from "@/lib/supabase/queries/countries";
import {
  getEthnicityWithDescription,
  getTopLanguagesForEthnicity,
  getEthnicityLanguages,
  getEthnicitySubgroups,
  getEthnicityParent,
  getEthnicitySources,
} from "@/lib/supabase/queries/ethnicities";
import { getCountryKey, getEthnicityKey } from "@/lib/entityKeys";

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
  description?: string;
  ancientNames?: Array<{ period: string; names: string[] }>; // Max 3 entrées pour le résumé
  allAncientNames?: Array<{ period: string; names: string[] }>; // Toutes les entrées pour la section détaillée
  topEthnicities?: Array<{
    name: string;
    languages: string[];
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
  regions?: Array<{
    name: string;
    totalPopulation: number;
    ethnicityPopulation: number;
    percentageInRegion: number;
  }>;
  description?: string;
  ancientName?: string[]; // Max 3 pour le résumé
  allAncientNames?: string[]; // Tous pour la section détaillée
  topLanguages?: string[];
  allLanguages?: Array<{ name: string; isPrimary: boolean }>;
  sources?: string[];
  societyType?: string;
  religion?: string;
  linguisticFamily?: string;
  historicalStatus?: string;
  regionalPresence?: string;
  subgroups?: Array<{
    id: string;
    slug: string;
    name_fr: string;
    total_population?: number;
    percentage_in_africa?: number;
  }>;
  isSubgroup?: boolean;
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
  const decodedItem = decodeURIComponent(item);

  switch (sectionType) {
    case "country": {
      // decodedItem est maintenant une clé normalisée (ex: "afriqueDuSud")
      const countryDetails = await getCountryDetailsByKey(decodedItem);
      if (!countryDetails) {
        notFound();
      }

      // Charger les données enrichies
      const countrySlug = getCountryKey(countryDetails.name) || decodedItem;
      const enrichedCountry = await getCountryWithDescription(countrySlug);
      const ancientNames = enrichedCountry
        ? await getCountryAncientNames(countrySlug)
        : [];
      const topEthnicities = await getTopEthnicitiesForCountry(countrySlug, 5);

      const payload: CountryDetailPayload = {
        ...countryDetails,
        description: enrichedCountry?.description,
        ancientNames: ancientNames.slice(0, 3), // Max 3 pour le résumé
        allAncientNames: ancientNames, // Tous pour la section détaillée
        topEthnicities: topEthnicities,
      };
      detailData = { type: "country", payload };
      break;
    }
    case "region": {
      // decodedItem est une clé de région (ex: "afrique_australe")
      const region = await getRegion(decodedItem);
      if (!region) {
        notFound();
      }

      const payload: RegionDetailPayload = {
        name: region.name,
        totalPopulation: region.totalPopulation,
        countries: region.countries,
        ethnicities: region.ethnicities,
      };
      detailData = { type: "region", payload };
      break;
    }
    case "ethnicity": {
      // decodedItem est maintenant une clé normalisée (ex: "adjaApparentes")
      const ethnicityDetails =
        await getEthnicityGlobalDetailsByKey(decodedItem);
      if (!ethnicityDetails) {
        notFound();
      }

      // Charger les données enrichies
      const ethnicitySlug =
        getEthnicityKey(ethnicityDetails.name) || decodedItem;
      const enrichedEthnicity =
        await getEthnicityWithDescription(ethnicitySlug);
      const parent = await getEthnicityParent(ethnicitySlug);
      const isSubgroup = !!parent;
      const subgroups = isSubgroup
        ? []
        : await getEthnicitySubgroups(ethnicitySlug);
      const topLanguages = isSubgroup
        ? []
        : await getTopLanguagesForEthnicity(ethnicitySlug, 5);
      const allLanguages = isSubgroup
        ? []
        : await getEthnicityLanguages(ethnicitySlug);
      const sources = await getEthnicitySources(ethnicitySlug);

      // Parser les anciens noms
      const allAncientNames = enrichedEthnicity?.ancient_name
        ? enrichedEthnicity.ancient_name
            .split(",")
            .map((n) => n.trim())
            .filter((n) => n.length > 0)
        : [];
      const ancientName = allAncientNames.slice(0, 3); // Max 3 pour le résumé

      const payload: EthnicityDetailPayload = {
        name: ethnicityDetails.name,
        totalPopulation: ethnicityDetails.totalPopulation,
        percentageInAfrica: ethnicityDetails.percentageInAfrica,
        countries: ethnicityDetails.countries,
        regions: ethnicityDetails.regions,
        description: enrichedEthnicity?.description,
        ancientName: ancientName, // Max 3 pour le résumé
        allAncientNames: allAncientNames, // Tous pour la section détaillée
        topLanguages: topLanguages,
        allLanguages: allLanguages,
        sources: sources,
        societyType: enrichedEthnicity?.society_type,
        religion: enrichedEthnicity?.religion,
        linguisticFamily: enrichedEthnicity?.linguistic_family,
        historicalStatus: enrichedEthnicity?.historical_status,
        regionalPresence: enrichedEthnicity?.regional_presence,
        subgroups: subgroups,
        isSubgroup: isSubgroup,
      };
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
