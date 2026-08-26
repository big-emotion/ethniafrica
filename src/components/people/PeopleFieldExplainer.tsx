import { PeopleFieldLegend } from "@/components/people/PeopleFieldLegend";
import type { CountryDistribution } from "@/types/afrik";

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
}: {
  distribution: CountryDistribution[] | undefined;
}) {
  if (!distribution || distribution.length === 0) return null;

  return (
    <div className="flex flex-col gap-afh-sm">
      <p className="text-afh-small">
        Sur la fiche d&apos;un pays, le trait se referme parce qu&apos;une
        frontière administrative est publiée et datée. Ici, rien de tel
        n&apos;existe :{" "}
        <strong>
          aucune source du corpus ne dit où la présence de ce peuple
          s&apos;arrête
        </strong>
        . Ce que le corpus déclare, ce sont {distribution.length} populations
        par pays. La carte s&apos;en tient exactement à cela — un halo par pays,
        dont l&apos;aire suit la population et dont le bord vaut zéro. Un tracé
        fermé aurait affirmé un dedans et un dehors que personne ne peut
        sourcer.
      </p>

      <PeopleFieldLegend distribution={distribution} />
    </div>
  );
}
