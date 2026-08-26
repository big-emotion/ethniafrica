import { getPeoples } from "@/api/v2/services/peopleService";
import { getCountries } from "@/api/v2/services/countryService";
import { countAfrikLanguageFamilies } from "@/lib/supabase/queries/afrik/languageFamilies";

export interface CorpusCounts {
  peoples: number;
  countries: number;
  families: number;
}

/**
 * Live figures for the home entry points (REQ-113), read straight from the
 * service/query layer rather than over HTTP — the home page is a server
 * component, so it sidesteps the /api/v2 envelope inconsistency
 * (meta.total vs meta.pagination.total) entirely.
 */
// @req REQ-113
export async function getCorpusCounts(): Promise<CorpusCounts> {
  const [peoples, countries, families] = await Promise.all([
    getPeoples(1, 1),
    getCountries(1, 1),
    countAfrikLanguageFamilies(),
  ]);

  return {
    peoples: peoples.total,
    countries: countries.total,
    families,
  };
}
