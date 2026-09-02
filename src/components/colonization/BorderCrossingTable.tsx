/**
 * BorderCrossingTable — text-first equivalent of the colonial-border map
 * overlay (Epic 13, Story 13.8). Always in the DOM, server-rendered, not
 * gated by any toggle (FR86, FR90).
 *
 * Story 13.3 (sourced colonial-border layer) has not landed yet, so
 * ColonialBorderOverlay does not ship in this PR — per the story's own
 * technical notes, only this table ships, fed by 13.5 border pairs.
 */

export interface BorderCrossingCountry {
  iso3: string;
  nameFr: string;
}

export interface BorderCrossingPeople {
  peopleId: string;
  autonym: string | null;
  exonym: string | null;
}

export interface BorderCrossingSource {
  id: string;
  title: string;
  url: string | null;
}

export interface BorderCrossing {
  countryA: BorderCrossingCountry;
  countryB: BorderCrossingCountry;
  peoples: BorderCrossingPeople[];
  sources: BorderCrossingSource[];
}

export interface BorderCrossingTableProps {
  crossings: BorderCrossing[];
}

function peopleLabel(people: BorderCrossingPeople): string {
  return people.autonym ?? people.exonym ?? people.peopleId;
}

const textSoft =
  "text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))]";
const text = "text-[color:var(--afh-text,var(--country-text,#2C2018))]";

// @req REQ-091
export function BorderCrossingTable({ crossings }: BorderCrossingTableProps) {
  if (crossings.length === 0) {
    return null;
  }

  return (
    <div className="BorderCrossingTable">
      <table className="w-full border-collapse">
        <caption className={`text-left text-afh-caption mb-2 ${textSoft}`}>
          Frontières coloniales, peuples traversés et sources
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="text-left text-afh-caption font-semibold pb-2 pr-4"
            >
              Frontière
            </th>
            <th
              scope="col"
              className="text-left text-afh-caption font-semibold pb-2 pr-4"
            >
              Peuples concernés
            </th>
            <th
              scope="col"
              className="text-left text-afh-caption font-semibold pb-2"
            >
              Sources
            </th>
          </tr>
        </thead>
        <tbody>
          {crossings.map((crossing) => (
            <tr key={`${crossing.countryA.iso3}-${crossing.countryB.iso3}`}>
              <td className={`py-2 pr-4 text-afh-small ${text}`}>
                {crossing.countryA.nameFr} ↔ {crossing.countryB.nameFr}
              </td>
              <td className={`py-2 pr-4 text-afh-small ${text}`}>
                {crossing.peoples.length > 0 ? (
                  <ul className="space-y-1">
                    {crossing.peoples.map((people) => (
                      <li key={people.peopleId}>{peopleLabel(people)}</li>
                    ))}
                  </ul>
                ) : (
                  <span>—</span>
                )}
              </td>
              <td className={`py-2 text-afh-small ${text}`}>
                {crossing.sources.length > 0 ? (
                  <ul className="space-y-1">
                    {crossing.sources.map((source) =>
                      source.url ? (
                        <li key={source.id}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline"
                          >
                            {source.title}
                          </a>
                        </li>
                      ) : (
                        <li key={source.id}>{source.title}</li>
                      )
                    )}
                  </ul>
                ) : (
                  <span>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
