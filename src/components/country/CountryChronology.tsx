import { FicheTile } from "@/components/fiche/FicheTile";
import type {
  HistoricalFactsData,
  KingdomCard,
} from "@/lib/countryDataTransformer";
import { countryCopy } from "@/lib/i18n/copy/country";
import type { Language } from "@/types/shared";

/**
 * A country's political entities and its dated accounts, on one spine.
 *
 * There were three versions of this. Two were written and never wired: a
 * gradient rail that encoded the polity / colonial / modern typology in
 * colour, and a row of dated entities that had somewhere to put a seat of
 * power. The third was inlined in the parchment, rendered, and carried
 * neither — so the encoding existed in the repository and not on the page,
 * and the page it was missing from was the one arguing that a colonial
 * administration and a precolonial kingdom are different kinds of thing.
 *
 * One component now, carrying both halves: the period inked by its regime,
 * the entity in the display face, its account, and the seats of power under
 * it. The other two are deleted rather than left orphaned.
 *
 * Two rules survive from the inlined version and are held by
 * `countryFicheCharter`:
 *
 *   — An entry the corpus does not date keeps its row and stays undated.
 *     Filling the column with a year nobody wrote would be the atlas
 *     inventing the one thing it exists to source.
 *   — An entry with nothing further to say gets no disclosure. An empty
 *     control that opens onto nothing is worse than no control.
 */

/** The first sentence stays visible; the rest goes behind the disclosure. */
function firstSentence(text: string): string {
  return text.match(/^.*?[.!?](?=\s|$)/u)?.[0] ?? text;
}

interface CountryChronologyProps {
  entities: KingdomCard[];
  accounts?: HistoricalFactsData;
  language: Language;
}

// @req REQ-154
export function CountryChronology({
  entities,
  accounts,
  language,
}: CountryChronologyProps) {
  const copy = countryCopy[language];

  return (
    <ol className="afh-parchment-timeline afh-chronology-spine">
      {entities.map((entity) => (
        <li className="afh-tl-item" key={`${entity.name}-${entity.period}`}>
          {/* The regime inks the period, never the entity's name: the claim
              is about what kind of authority held the years, and writing the
              name in colonial red would read as a judgement on the place.

              A paragraph, not a span. Below the tablet floor the row stacks
              and the atlas centres everything but `p`, `blockquote`, `dt` and
              `dd` — so as a span a date drifted to the middle of its own row
              while the account under it stayed left. */}
          <p className="afh-tl-period" data-regime={entity.entryType}>
            {entity.period ?? "—"}
          </p>
          {entity.historicalRole || entity.centers?.length ? (
            <FicheTile
              title={entity.name}
              closedFact={entity.period ?? copy.historyDateMissing}
            >
              {entity.historicalRole ? <p>{entity.historicalRole}</p> : null}
              {/* A paragraph, not a span: below the tablet floor the atlas
                  centres everything but `p`, `blockquote`, `dt` and `dd`, and
                  a seat of power adrift in the middle of its own row is the
                  failure that rule exists to prevent. */}
              {entity.centers?.length ? (
                <p className="afh-tl-centers">
                  {copy.generated.centers} · {entity.centers.join(" · ")}
                </p>
              ) : null}
            </FicheTile>
          ) : (
            <h3>{entity.name}</h3>
          )}
        </li>
      ))}

      {accounts?.periods.map((period) => {
        const lead = firstSentence(period.content);
        const remainder = period.content.slice(lead.length).trim();
        return (
          <li className="afh-tl-item afh-tl-item--fact" key={period.label}>
            {remainder ? (
              <FicheTile title={period.label} closedFact={lead}>
                <p>{remainder}</p>
              </FicheTile>
            ) : (
              <div>
                <h3>{period.label}</h3>
                <p>{lead}</p>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
