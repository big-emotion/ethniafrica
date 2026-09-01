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

// @req REQ-124
export function DominantAnswerPanel({ result }: DominantAnswerPanelProps) {
  const externalLinks = (result.externalLinks ?? []).filter(
    ({ title, url }) => title.trim().length > 0 && url.trim().length > 0
  );

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
          {result.population != null && (
            <div className="border-t border-afh-border pt-afh-xs">
              <dt className="text-afh-caption text-afh-fg-muted">Population</dt>
              <dd
                data-testid="dominant-answer-population"
                className="text-afh-small font-semibold text-afh-text"
              >
                {numberFr.format(Math.round(result.population))}
              </dd>
            </div>
          )}

          {result.confidence != null && (
            <div className="border-t border-afh-border pt-afh-xs">
              <dt className="text-afh-caption text-afh-fg-muted">Confiance</dt>
              <dd
                data-testid="dominant-answer-confidence"
                className="text-afh-small font-semibold text-afh-text"
              >
                {numberFr.format(Math.round(result.confidence * 100))} %
              </dd>
            </div>
          )}

          {(result.countryIds?.length ?? 0) > 0 && (
            <div className="border-t border-afh-border pt-afh-xs">
              <dt className="text-afh-caption text-afh-fg-muted">Pays</dt>
              <dd
                data-testid="dominant-answer-countries"
                className="text-afh-small font-semibold text-afh-text"
              >
                {countLabel(result.countryIds.length, "pays", "pays")}
              </dd>
            </div>
          )}

          {(result.exonyms?.length ?? 0) > 0 && (
            <div className="border-t border-afh-border pt-afh-xs">
              <dt className="text-afh-caption text-afh-fg-muted">Exonymes</dt>
              <dd
                data-testid="dominant-answer-exonyms"
                className="text-afh-small font-semibold text-afh-text"
              >
                {countLabel(result.exonyms.length, "exonyme", "exonymes")}
              </dd>
            </div>
          )}

          {result.sourceCount != null && (
            <div className="border-t border-afh-border pt-afh-xs">
              <dt className="text-afh-caption text-afh-fg-muted">Sources</dt>
              <dd
                data-testid="dominant-answer-sources"
                className="text-afh-small font-semibold text-afh-text"
              >
                {countLabel(result.sourceCount, "source", "sources")}
              </dd>
            </div>
          )}
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
