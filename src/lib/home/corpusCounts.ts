import { getPeoples } from "@/api/v2/services/peopleService";
import { getCountries } from "@/api/v2/services/countryService";
import { countAfrikLanguageFamilies } from "@/lib/supabase/queries/afrik/languageFamilies";
import { countAfrikLanguages } from "@/lib/supabase/queries/afrik/languages";
import { listNameForms } from "@/api/v2/services/names";
import { listPatronymes } from "@/api/v2/services/patronymes";
import { listMigrations } from "@/api/v2/services/migrations";

/**
 * `null` is "we could not read it", never "there are none" — the tile renders
 * *Indisponible* for it. Zero is a valid total and must never stand in for a
 * failed read.
 */
export interface CorpusCounts {
  peoples: number | null;
  countries: number | null;
  families: number | null;
  languages: number | null;
  nameForms: number | null;
  patronymes: number | null;
  migrations: number | null;
}

/**
 * A failed read costs its own figure and no other.
 *
 * The reads used to share a bare `Promise.all`, so one rejection blanked the
 * whole band. `listNameForms` throws `NamesSchemaUnavailableError` whenever its
 * view is missing, which would newly have taken the three original tiles down
 * with it. The query layer has already logged by the time we get here.
 */
const unavailable = () => null;

/**
 * Live figures for the five classes the home declares (REQ-113), read straight
 * from the service/query layer rather than over HTTP — the home page is a
 * server component, so it sidesteps the /api/v2 envelope inconsistency
 * (meta.total vs meta.pagination.total) entirely.
 *
 * Every figure on the home is a count of something in the corpus. The
 * card that once read "3 000 ans" was describing a span nothing in the
 * data supports (ETNI-1198); it now reports the sourced events there are.
 *
 * `nameForms` counts folded name *forms*, not `name_records`: migration 071
 * separated the two (3 134 forms behind 3 708 records) because a name borne by
 * four peoples is one appellation, not four. It is the figure
 * `/fr/atlas/appellations` shows, and asking `listNameForms` for it keeps the
 * two surfaces reading the same view.
 *
 * `patronymes` and `nameForms` are two counts and never one. DEC-038 separates
 * the objects: an *appellation* is how a people is called, a *nom* is the
 * system a person is named under. They are an order of magnitude apart, so
 * serving one where the band asked for the other is a wrong figure that reads
 * as a plausible one.
 */
// @req REQ-113
export async function getCorpusCounts(): Promise<CorpusCounts> {
  const [
    peoples,
    countries,
    families,
    languages,
    nameForms,
    patronymes,
    migrations,
  ] = await Promise.all([
    getPeoples(1, 1).then((page) => page.total, unavailable),
    getCountries(1, 1).then((page) => page.total, unavailable),
    countAfrikLanguageFamilies().catch(unavailable),
    countAfrikLanguages().catch(unavailable),
    listNameForms({ page: 1, perPage: 1, imposedOnly: false }).then(
      (page) => page.total,
      unavailable
    ),
    listPatronymes({ page: 1, perPage: 1 }).then(
      (page) => page.total,
      unavailable
    ),
    listMigrations({ limit: 1, offset: 0 }).then(
      (page) => page.total,
      unavailable
    ),
  ]);

  return {
    peoples,
    countries,
    families,
    languages,
    nameForms,
    patronymes,
    migrations,
  };
}
