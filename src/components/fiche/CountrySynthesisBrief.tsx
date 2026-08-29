import Link from "next/link";

import type { CountrySynthesis } from "@/lib/home/countrySynthesis";
import { getPeopleRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

export interface CountrySynthesisBriefProps {
  language: Language;
  synthesis: CountrySynthesis;
}

/**
 * The country fiche's chapô: the same synthesis as the home's card, opened
 * out.
 *
 * A fiche runs eight chapters. The brief is not a ninth — it is the eight
 * compressed, which is why it sits above them rather than among them, and
 * why it stays four lines long. Every line it prints appears again below in
 * more detail; that redundancy is what a summary *is*, and it stops being
 * acceptable the moment the brief tries to say everything.
 *
 * It lives under components/fiche/ rather than components/country/ because
 * it belongs to the fiche shell, beside FicheHeroBand, not to the country
 * domain rendering — and because the people it names are inline links into
 * their own fiches, where AutonymExonymHeading does the naming properly.
 */
// @req REQ-113
export function CountrySynthesisBrief({
  language,
  synthesis,
}: CountrySynthesisBriefProps) {
  const { summary, formerNames, peoples, kingdoms, languages } = synthesis;

  // Charter §4: a surface says what the corpus does not hold rather than
  // dressing the absence. With no chapeau and no peoples there is no brief
  // to write, so the fiche opens straight onto its chapters.
  if (!summary && peoples.length === 0) return null;

  return (
    <section
      className="fiche-brief afh-accent-teal"
      data-testid="country-synthesis-brief"
      aria-label={`${synthesis.nameFr} en bref`}
    >
      <p className="fiche-brief-eyebrow">En bref</p>
      <h2>{synthesis.nameFr} — synthèse culturelle et historique</h2>

      {summary ? <p className="fiche-brief-summary">{summary}</p> : null}

      <dl className="fiche-brief-facts">
        {formerNames.length > 0 ? (
          <div>
            <dt>Anciens noms et appellations</dt>
            <dd>{formerNames.join(" · ")}</dd>
          </div>
        ) : null}

        {peoples.length > 0 ? (
          <div>
            <dt>Groupes ethniques principaux</dt>
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

        {kingdoms.length > 0 ? (
          <div>
            <dt>Héritage historique</dt>
            <dd>{kingdoms.join(" · ")}</dd>
          </div>
        ) : null}

        {languages.length > 0 ? (
          <div>
            <dt>Langues et identité</dt>
            <dd>{languages.join(", ")}</dd>
          </div>
        ) : null}
      </dl>

      <style>{`
        .fiche-brief {
          background: var(--afh-bg-warm);
          border: 1px solid var(--afh-border);
          border-left: 3px solid var(--accent);
          border-radius: 6px;
          padding: 24px 22px 22px;
          margin: 0 0 28px;
        }
        .fiche-brief-eyebrow {
          margin: 0;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          font-weight: 500;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: var(--accent-ink);
        }
        .fiche-brief h2 {
          margin: 12px 0 14px;
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: var(--afh-text-h3);
          font-weight: 600;
          line-height: 1.18;
          letter-spacing: -0.012em;
          color: var(--afh-text);
          text-wrap: balance;
        }
        .fiche-brief-summary {
          margin: 0 0 20px;
          font-size: var(--afh-text-body);
          line-height: 1.62;
          color: var(--afh-text-soft);
          max-width: 68ch;
        }
        .fiche-brief-facts {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin: 0;
          padding-top: 16px;
          border-top: 1px solid var(--afh-border);
        }
        .fiche-brief-facts dt {
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--afh-text-muted);
        }
        .fiche-brief-facts dd {
          margin: 5px 0 0;
          font-size: var(--afh-text-small);
          line-height: 1.55;
          color: var(--afh-text);
        }
        .fiche-brief-facts dd a {
          color: inherit;
          text-decoration: underline;
          text-decoration-color: var(--afh-border);
          text-underline-offset: 2px;
        }
        .fiche-brief-facts dd a:hover,
        .fiche-brief-facts dd a:focus-visible {
          text-decoration-color: var(--accent);
        }
        @media (min-width: 720px) {
          .fiche-brief { padding: 30px 30px 26px; }
        }
      `}</style>
    </section>
  );
}
