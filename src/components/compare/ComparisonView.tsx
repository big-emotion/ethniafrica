import type { ComparisonPageData } from "@/types/compare";

interface ComparisonViewProps {
  data: ComparisonPageData;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "non renseigné";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Comparison orchestrator (9.4 shell). Renders the entity headings and
 * comparable rows as a flat definition list. The responsive <dl> (mobile) /
 * <table> (>= 800px) text-first split with links and confidence chips is
 * the 9.6/9.7 deliverable — this shell only proves the routing/SSR wiring.
 */
// @req REQ-097
export function ComparisonView({ data }: ComparisonViewProps) {
  const title = `Comparaison : ${data.columns.map((column) => column.label).join(" · ")}`;

  return (
    <article data-testid="comparison-view">
      <h1>{title}</h1>
      <dl>
        {data.rows.map((row) => (
          <div key={row.key} data-testid={`comparison-row-${row.key}`}>
            {data.columns.map((column) => (
              <div key={column.id}>
                <dt>
                  {row.key} — {column.label}
                </dt>
                <dd>{formatValue(row.values[column.id])}</dd>
              </div>
            ))}
          </div>
        ))}
      </dl>
    </article>
  );
}
