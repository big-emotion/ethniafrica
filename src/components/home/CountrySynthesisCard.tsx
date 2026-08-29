import Link from "next/link";

import type { CountrySynthesis } from "@/lib/home/countrySynthesis";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

export interface CountrySynthesisCardProps {
  language: Language;
  synthesis: CountrySynthesis;
}

/**
 * One country, at card density.
 *
 * The card exists to show what a fiche holds rather than promise it, so it
 * prints real values or nothing at all: a line whose corpus field is empty
 * is dropped, never rendered as "—". Four cards each carrying a dash would
 * advertise an empty atlas.
 *
 * "Anciens noms" leads the fact list on purpose. It is the line that makes a
 * reader stop — Haute-Volta, Zaïre, Basutoland — and it is the one thing a
 * reader cannot get from the country's name alone.
 */
// @req REQ-113
export function CountrySynthesisCard({
  language,
  synthesis,
}: CountrySynthesisCardProps) {
  const { formerNames, peoples, languages } = synthesis;

  return (
    <article className="home-syn-card" data-testid="country-synthesis-card">
      <p className="home-syn-kind">Pays</p>

      <h3 className="home-syn-name">
        <Link href={getCountryRoute(language, synthesis.id)}>
          {synthesis.nameFr}
        </Link>
      </h3>

      {synthesis.summary ? (
        <p className="home-syn-summary">{synthesis.summary}</p>
      ) : null}

      <dl className="home-syn-facts">
        {formerNames.length > 0 ? (
          <div className="home-syn-fact">
            <dt>Anciens noms</dt>
            <dd>{formerNames.join(" · ")}</dd>
          </div>
        ) : null}

        {peoples.length > 0 ? (
          <div className="home-syn-fact">
            <dt>Peuples</dt>
            <dd>
              {peoples.map((people, index) => (
                <span key={people.peopleId ?? people.name}>
                  {index > 0 ? ", " : null}
                  {people.peopleId ? (
                    <Link href={getPeopleRoute(language, people.peopleId)}>
                      {people.name}
                    </Link>
                  ) : (
                    people.name
                  )}
                </span>
              ))}
            </dd>
          </div>
        ) : null}

        {languages.length > 0 ? (
          <div className="home-syn-fact">
            <dt>Langues</dt>
            <dd>{languages.join(", ")}</dd>
          </div>
        ) : null}
      </dl>

      <Link
        className="home-syn-cta"
        href={getCountryRoute(language, synthesis.id)}
      >
        Lire la fiche {synthesis.nameFr}
        <span aria-hidden="true"> →</span>
      </Link>

      <style>{`
        .home-syn-card {
          flex: none;
          width: 272px;
          scroll-snap-align: start;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 18px;
          background: var(--afh-color-card);
          border: 1px solid var(--afh-border);
          border-top: 3px solid var(--accent);
          border-radius: 8px;
        }
        .home-syn-kind {
          margin: 0;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent-ink);
        }
        .home-syn-name {
          margin: 0;
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: var(--afh-text-h3);
          font-weight: 600;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }
        .home-syn-name a {
          color: var(--afh-text);
          text-decoration: none;
        }
        .home-syn-name a:hover,
        .home-syn-name a:focus-visible {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .home-syn-summary {
          margin: 0;
          font-size: var(--afh-text-caption);
          line-height: 1.55;
          color: var(--afh-text-soft);
          /* Chapeaux run 270-398 characters; five lines keeps four cards the
             same height without cutting one mid-clause. */
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .home-syn-facts {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin: 0;
          padding-top: 11px;
          border-top: 1px solid var(--afh-border);
        }
        .home-syn-fact dt {
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.07em;
          text-transform: uppercase;
          /* The label naming each fact — « ANCIENS NOMS », « PEUPLES » — is
             what tells the reader which list they are looking at. */
          color: var(--afh-fg-muted);
        }
        .home-syn-fact dd {
          margin: 2px 0 0;
          font-size: var(--afh-text-caption);
          line-height: 1.5;
          color: var(--afh-text);
        }
        .home-syn-fact dd a {
          color: inherit;
          text-decoration: underline;
          text-decoration-color: var(--afh-border);
          text-underline-offset: 2px;
        }
        .home-syn-fact dd a:hover,
        .home-syn-fact dd a:focus-visible {
          text-decoration-color: var(--accent);
        }
        .home-syn-cta {
          margin-top: auto;
          padding-top: 12px;
          font-size: var(--afh-text-caption);
          font-weight: 700;
          color: var(--accent-ink);
          text-decoration: none;
        }
        .home-syn-cta:hover,
        .home-syn-cta:focus-visible {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </article>
  );
}
