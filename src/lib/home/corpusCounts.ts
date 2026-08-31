import { getPeoples } from "@/api/v2/services/peopleService";
import { getCountries } from "@/api/v2/services/countryService";
import { countAfrikLanguageFamilies } from "@/lib/supabase/queries/afrik/languageFamilies";
import { listMigrations } from "@/api/v2/services/migrations";

export interface CorpusCounts {
  peoples: number;
  countries: number;
  families: number;
  migrations: number;
}

/**
 * Live figures for the home's three axis cards (REQ-113), read straight
 * from the service/query layer rather than over HTTP — the home page is a
 * server component, so it sidesteps the /api/v2 envelope inconsistency
 * (meta.total vs meta.pagination.total) entirely.
 *
 * Every figure on the home is a count of something in the corpus. The
 * card that once read "3 000 ans" was describing a span nothing in the
 * data supports (ETNI-1198); it now reports the sourced events there are.
 */
// @req REQ-113
export async function getCorpusCounts(): Promise<CorpusCounts> {
  const [peoples, countries, families, migrations] = await Promise.all([
    getPeoples(1, 1),
    getCountries(1, 1),
    countAfrikLanguageFamilies(),
    listMigrations({ limit: 1, offset: 0 }),
  ]);

  return {
    peoples: peoples.total,
    countries: countries.total,
    families,
    migrations: migrations.total,
  };
}
