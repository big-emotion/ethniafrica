import type { PeopleDetail } from "@/types/afrik-frontend";
import {
  transformPeopleCountries,
  transformPeopleHero,
} from "@/lib/peopleDataTransformer";
import { PeopleFicheHead } from "@/components/people/PeopleFicheHead";

/**
 * The band a people fiche opens on, above the globe.
 *
 * The head used to sit inside the parchment, below a full-bleed band some
 * 520px tall: a reader arriving on `/fr/atlas/peuples/PPL_KUNG` saw a globe
 * and nothing naming the page they were on, because the name was below the
 * fold on every screen. Every other surface on the site — the quiz, the
 * facets, the names atlas — states its title directly under the header, and
 * the fiche was the exception.
 *
 * It re-derives the hero and the countries rather than taking them as props:
 * both transforms are pure and read the same object the parchment already
 * holds, so the alternative is threading two shapes through a route that has
 * no use for either.
 */
// @req REQ-091
export function PeopleFicheTitle({ people }: { people: PeopleDetail }) {
  const hero = transformPeopleHero(people);
  const countries = transformPeopleCountries(people.demography);

  // The trail is the shell's now (`PageLayout` → `SiteTrail`); the route
  // passes the name it should print through `trailLabel`.
  return (
    <PeopleFicheHead hero={hero} countries={countries} showConfidence={false} />
  );
}

export default PeopleFicheTitle;
