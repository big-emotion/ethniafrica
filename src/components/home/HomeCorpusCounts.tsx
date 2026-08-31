import type { CorpusCounts } from "@/lib/home/corpusCounts";

export interface HomeCorpusCountsProps {
  /** Live server totals, or null when the corpus could not be read. */
  counts: CorpusCounts | null;
}

type HomeCountKey = "peoples" | "countries" | "families";

const HOME_COUNTS: ReadonlyArray<{ key: HomeCountKey; label: string }> = [
  { key: "peoples", label: "Peuples" },
  { key: "countries", label: "Pays" },
  { key: "families", label: "Familles linguistiques" },
];

const formatCount = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

/**
 * The three corpus totals shown beside the home search.
 *
 * This component receives data from the server page and never opens a second
 * data path in the browser. A failed read is explicitly unavailable: zero is
 * a valid total, so using it as a fallback would make a false corpus claim.
 */
// @req REQ-113
export function HomeCorpusCounts({ counts }: HomeCorpusCountsProps) {
  return (
    <dl className="home-corpus-counts" aria-label="Le corpus en chiffres">
      {HOME_COUNTS.map(({ key, label }) => {
        const value = counts?.[key];
        const available = typeof value === "number" && Number.isFinite(value);

        return (
          <div
            key={key}
            className="home-corpus-count"
            data-state={available ? "available" : "unavailable"}
            data-testid={`home-count-${key}`}
          >
            <dt>{label}</dt>
            <dd className={available ? undefined : "is-unavailable"}>
              {available ? formatCount.format(value) : "Indisponible"}
            </dd>
          </div>
        );
      })}

      <style>{`
        .home-corpus-counts {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
          margin: 0;
        }
        .home-corpus-count {
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 82px;
          padding: 10px 6px;
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-md);
          background: var(--afh-bg-warm);
          text-align: center;
        }
        .home-corpus-count dt {
          font-size: var(--afh-text-caption);
          line-height: var(--afh-leading-caption);
          color: var(--afh-text-soft);
        }
        .home-corpus-count dd {
          order: -1;
          margin: 0;
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h2);
          font-weight: 900;
          line-height: 1;
          color: var(--afh-text);
          font-variant-numeric: tabular-nums;
        }
        .home-corpus-count dd.is-unavailable {
          font-family: var(--afh-font-body);
          font-size: var(--afh-text-caption);
          font-weight: 600;
          color: var(--afh-text-soft);
        }

        @media (min-width: 768px) {
          .home-corpus-counts { gap: 12px; }
          .home-corpus-count {
            min-height: 94px;
            padding: 14px 10px;
          }
        }

        @media (min-width: 1200px) {
          .home-corpus-count { align-items: flex-start; text-align: left; }
        }
      `}</style>
    </dl>
  );
}

export default HomeCorpusCounts;
