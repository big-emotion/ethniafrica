import { Card } from "@/components/ui/card";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";
import type { SearchResult } from "@/types/afrik-frontend";

const numberFr = new Intl.NumberFormat("fr-FR");

export interface DominantAnswerPanelProps {
  result: SearchResult;
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${numberFr.format(count)} ${count > 1 ? plural : singular}`;
}

interface FactRow {
  testId: string;
  label: string;
  value: string;
}

/**
 * Facts the "En bref" card can show, one field set per entity type. Every
 * type used to share the people set (population, confidence, country ids,
 * exonyms, sources); a patronyme or language pivot never carries those, so
 * the card rendered its title over a permanently empty `<dl>` — falsely
 * implying the corpus knows nothing about the entity. `country` and
 * `languageFamily` results carry nothing beyond name/id yet
 * (`mapSearchEnvelope`), so their row list stays empty rather than
 * fabricating a field; the panel then renders nothing for them (see below).
 */
function factRowsFor(result: SearchResult): FactRow[] {
  switch (result.type) {
    case "people":
      return [
        result.population != null
          ? {
              testId: "dominant-answer-population",
              label: "Population",
              value: numberFr.format(Math.round(result.population)),
            }
          : null,
        result.confidence != null
          ? {
              testId: "dominant-answer-confidence",
              label: "Confiance",
              value: `${numberFr.format(Math.round(result.confidence * 100))} %`,
            }
          : null,
        (result.countryIds?.length ?? 0) > 0
          ? {
              testId: "dominant-answer-countries",
              label: "Pays",
              value: countLabel(result.countryIds!.length, "pays", "pays"),
            }
          : null,
        (result.exonyms?.length ?? 0) > 0
          ? {
              testId: "dominant-answer-exonyms",
              label: "Exonymes",
              value: countLabel(result.exonyms!.length, "exonyme", "exonymes"),
            }
          : null,
        result.sourceCount != null
          ? {
              testId: "dominant-answer-sources",
              label: "Sources",
              value: countLabel(result.sourceCount, "source", "sources"),
            }
          : null,
      ].filter((row): row is FactRow => row !== null);

    case "patronyme":
      return [
        result.nameSystem
          ? {
              testId: "dominant-answer-name-system",
              label: "Système de nom",
              value: result.nameSystem,
            }
          : null,
        (result.associatedPeopleIds?.length ?? 0) > 0
          ? {
              testId: "dominant-answer-associated-peoples",
              label: "Peuples associés",
              value: countLabel(
                result.associatedPeopleIds!.length,
                "peuple",
                "peuples"
              ),
            }
          : null,
        (result.attestedCountryIds?.length ?? 0) > 0
          ? {
              testId: "dominant-answer-attested-countries",
              label: "Pays attestés",
              value: countLabel(
                result.attestedCountryIds!.length,
                "pays",
                "pays"
              ),
            }
          : null,
        result.sourceCount != null
          ? {
              testId: "dominant-answer-sources",
              label: "Sources",
              value: countLabel(result.sourceCount, "source", "sources"),
            }
          : null,
      ].filter((row): row is FactRow => row !== null);

    case "language":
      return [
        result.languageFamilyName
          ? {
              testId: "dominant-answer-family",
              label: "Famille",
              value: result.languageFamilyName,
            }
          : null,
        result.isoCode639_3
          ? {
              testId: "dominant-answer-iso-code",
              label: "Code ISO 639-3",
              value: result.isoCode639_3,
            }
          : null,
        (result.speakerPeopleIds?.length ?? 0) > 0
          ? {
              testId: "dominant-answer-speaker-peoples",
              label: "Peuples locuteurs",
              value: countLabel(
                result.speakerPeopleIds!.length,
                "peuple",
                "peuples"
              ),
            }
          : null,
        result.sourceCount != null
          ? {
              testId: "dominant-answer-sources",
              label: "Sources",
              value: countLabel(result.sourceCount, "source", "sources"),
            }
          : null,
      ].filter((row): row is FactRow => row !== null);

    default:
      // `country` and `languageFamily` carry no facts beyond name/id yet.
      return [];
  }
}

// @req REQ-124
export function DominantAnswerPanel({ result }: DominantAnswerPanelProps) {
  const factRows = factRowsFor(result);
  const externalLinks = (result.externalLinks ?? []).filter(
    ({ title, url }) => title.trim().length > 0 && url.trim().length > 0
  );

  // Nothing this type's fact set covers is populated: a titled card over an
  // empty `<dl>` would read as "the corpus knows nothing", which is false —
  // it just doesn't know facts of *this* shape. Render nothing instead.
  if (factRows.length === 0) {
    return null;
  }

  return (
    <aside aria-label="Réponse dominante" className="h-fit">
      <Card className="border-l-4 border-l-[var(--accent)] p-afh-md">
        <p className="text-afh-eyebrow font-bold uppercase tracking-[0.11em] text-afh-fg-muted">
          En bref
        </p>
        <h2 className="mt-afh-xs font-afh-display text-afh-h3 font-semibold text-afh-text">
          {result.name}
        </h2>

        <dl className="mt-afh-md grid grid-cols-2 gap-afh-sm">
          {factRows.map((row) => (
            <div
              key={row.testId}
              className="border-t border-afh-border pt-afh-xs"
            >
              <dt className="text-afh-caption text-afh-fg-muted">
                {row.label}
              </dt>
              <dd
                data-testid={row.testId}
                className="text-afh-small font-semibold text-afh-text"
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {externalLinks.length > 0 && (
          <section className="mt-afh-lg border-t border-afh-border pt-afh-md">
            <h3 className="font-afh-display text-afh-small font-semibold text-afh-text">
              Ailleurs
            </h3>
            <ul className="mt-afh-sm space-y-afh-xs">
              {externalLinks.map(({ title, url }) => (
                <li key={`${title}-${url}`}>
                  <a
                    href={url}
                    title={title}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-block rounded-afh-sm text-afh-small text-afh-text underline underline-offset-2 ${CHARTER_FOCUS_RING}`}
                  >
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Card>
    </aside>
  );
}
