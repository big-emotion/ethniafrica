import type { CountrySynthesis } from "@/lib/home/countrySynthesis";

export interface CountrySynthesisBriefProps {
  synthesis: CountrySynthesis;
}

/**
 * The country fiche's chapô: the same synthesis as the home's card, opened
 * out.
 *
 * It was written as "the eight chapters compressed", sitting above the eight —
 * a summary whose redundancy was the point. There are no chapters. The brief
 * now stands between the globe and a parchment, and three of its four facts
 * were the parchment's own sections restated a screen early: the peoples it
 * listed appear below with their shares and their own links, the kingdoms on
 * a dated timeline, the languages with the family each belongs to. A summary
 * of the thing directly beneath it is not a summary; it is the same page
 * twice, and the reader meets the second copy first.
 *
 * What is left is what only the brief holds: the corpus's own chapeau, and
 * the former names — `historicalNames.formerNames`, which
 * countryDataTransformer never reads, so this is the fiche's only sight of
 * them.
 *
 * It lives under components/fiche/ rather than components/country/ because it
 * belongs to the fiche shell, beside FicheHeroBand, not to the country domain
 * rendering.
 */
// @req REQ-113
export function CountrySynthesisBrief({
  synthesis,
}: CountrySynthesisBriefProps) {
  const { summary, formerNames } = synthesis;

  // Charter §4: a surface says what the corpus does not hold rather than
  // dressing the absence. With neither chapeau nor former names there is no
  // brief to write, so the fiche opens straight onto its parchment.
  if (!summary && formerNames.length === 0) return null;

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
          /* Same class of label as the home's synthesis cards, held to the
             same bar: it names the list under it. */
          color: var(--afh-fg-muted);
        }
        .fiche-brief-facts dd {
          margin: 5px 0 0;
          font-size: var(--afh-text-small);
          line-height: 1.55;
          color: var(--afh-text);
        }
        @media (min-width: 720px) {
          .fiche-brief { padding: 30px 30px 26px; }
        }
      `}</style>
    </section>
  );
}
