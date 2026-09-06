import { PeopleFieldLegend } from "@/components/people/PeopleFieldLegend";
import type { CountryDistribution } from "@/types/afrik";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

/**
 * "Pourquoi la carte ne trace pas de frontière".
 *
 * The section that makes the cartographic grammar readable by someone who has
 * never heard of it, and the only thing standing between the halo and being
 * read as a fuzzy territory. Without it the encoding is a soft edge; with it,
 * the softness is the argument.
 *
 * It says what the charter says (§1) in the reader's terms: a country fiche
 * closes its line because an administrative border is published and datable,
 * and this one does not because no source in the corpus states where a
 * people's presence stops. What the corpus declares is a population per
 * country, and the map holds to exactly that.
 *
 * The prose says "ce peuple" rather than naming it. afh/no-bare-people-name
 * stops a name reaching the page outside AutonymExonymHeading, and it is right
 * to: an exonym printed alone, even mid-sentence, is the exonym presented as
 * the neutral name. The naming section immediately above carries the autonym.
 */
// @req REQ-116
export function PeopleFieldExplainer({
  distribution,
  language = FALLBACK_LOCALE,
}: {
  distribution: CountryDistribution[] | undefined;
  language?: Language;
}) {
  if (!distribution || distribution.length === 0) return null;

  return (
    <div className="flex flex-col gap-afh-sm">
      <p className="text-afh-small">
        {peopleCopy[language].field.explanation(distribution.length)}
      </p>

      <PeopleFieldLegend distribution={distribution} language={language} />
    </div>
  );
}
