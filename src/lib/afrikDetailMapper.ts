import type {
  ClassificationStatus,
  CountryDetail,
  PeopleDetail,
} from "@/types/afrik-frontend";
import { getFrenchCountryCommonName } from "@/lib/countryNames";

interface PeopleDetailRecord {
  id: string;
  nameMain?: string;
  name_main?: string;
  languageFamilyId?: string;
  language_family_id?: string;
  currentCountries?: string[];
  current_countries?: string[];
  createdAt?: string | Date;
  created_at?: string | Date;
  updatedAt?: string | Date;
  updated_at?: string | Date;
  classificationStatus?: ClassificationStatus | null;
  classification_status?: ClassificationStatus | null;
  content?: {
    appellations?: PeopleDetail["appellations"];
    ethnicities?: PeopleDetail["ethnicities"];
    origins?: PeopleDetail["origins"];
    organization?: PeopleDetail["organization"];
    languages?: PeopleDetail["languages"];
    culture?: PeopleDetail["culture"];
    historicalRole?: PeopleDetail["historicalRole"];
    demography?: PeopleDetail["demography"];
    sources?: PeopleDetail["sources"];
  };
}

interface CountryDetailRecord {
  id: string;
  nameFr?: string;
  name_fr?: string;
  nameOfficial?: string;
  name_official?: string;
  etymology?: string;
  nameOriginActor?: string;
  name_origin_actor?: string;
  createdAt?: string | Date;
  created_at?: string | Date;
  updatedAt?: string | Date;
  updated_at?: string | Date;
  content?: {
    historicalNames?: CountryDetail["historicalNames"];
    kingdoms?: CountryDetail["kingdoms"];
    majorPeoples?: CountryDetail["majorPeoples"];
    culture?: CountryDetail["culture"];
    historicalFacts?: CountryDetail["historicalFacts"];
    sources?: CountryDetail["sources"];
    demographics?: CountryDetail["demographics"];
  };
}

function serializeDate(value?: string | Date): string | undefined {
  return value instanceof Date ? value.toISOString() : value;
}

export function mapPeopleDetail(apiData: PeopleDetailRecord): PeopleDetail {
  return {
    id: apiData.id,
    nameMain: apiData.nameMain || apiData.name_main,
    languageFamilyId: apiData.languageFamilyId || apiData.language_family_id,
    currentCountries:
      apiData.currentCountries || apiData.current_countries || [],
    createdAt: serializeDate(apiData.createdAt || apiData.created_at),
    updatedAt: serializeDate(apiData.updatedAt || apiData.updated_at),
    classificationStatus:
      apiData.classificationStatus ?? apiData.classification_status ?? null,
    appellations: apiData.content?.appellations,
    ethnicities: apiData.content?.ethnicities,
    origins: apiData.content?.origins,
    organization: apiData.content?.organization,
    languages: apiData.content?.languages,
    culture: apiData.content?.culture,
    historicalRole: apiData.content?.historicalRole,
    demography: apiData.content?.demography,
    sources: apiData.content?.sources,
  };
}

export function mapCountryDetail(apiData: CountryDetailRecord): CountryDetail {
  const nameFr = apiData.nameFr ?? apiData.name_fr;
  const nameOfficial = apiData.nameOfficial ?? apiData.name_official ?? nameFr;

  return {
    id: apiData.id,
    nameFr,
    nameCommonFr: getFrenchCountryCommonName(apiData.id, nameOfficial),
    nameOfficial,
    etymology: apiData.etymology,
    nameOriginActor: apiData.nameOriginActor || apiData.name_origin_actor,
    createdAt: serializeDate(apiData.createdAt || apiData.created_at),
    updatedAt: serializeDate(apiData.updatedAt || apiData.updated_at),
    historicalNames: apiData.content?.historicalNames,
    kingdoms: apiData.content?.kingdoms,
    majorPeoples: apiData.content?.majorPeoples,
    culture: apiData.content?.culture,
    historicalFacts: apiData.content?.historicalFacts,
    sources: apiData.content?.sources,
    demographics: apiData.content?.demographics,
  };
}
