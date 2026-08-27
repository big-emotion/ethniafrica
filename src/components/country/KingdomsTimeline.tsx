import type { KingdomCard } from "@/lib/countryDataTransformer";

/**
 * Historical political entities, as a chronology.
 *
 * `HistoryTimeline` is not reused for this. It encodes a kingdom / colonial /
 * sovereign typology — a gradient rail, a strike-through on imposed names, a
 * mark on sovereignty — that the entities here do not carry, it has nowhere to
 * put the centres, and it still renders further down the same page. The same
 * component twice would read as one continuous chronology where these are two
 * separate claims.
 */

interface KingdomsTimelineProps {
  cards: KingdomCard[];
}

// @req REQ-115
export function KingdomsTimeline({ cards }: KingdomsTimelineProps) {
  if (cards.length === 0) return null;

  return (
    <div className="afh-parchment-timeline">
      {cards.map((card) => (
        <article className="afh-tl-item" key={`${card.name}-${card.period}`}>
          {/* An entity whose period the corpus does not state still gets its
              column, so the names stay aligned down the chronology. */}
          <span className="afh-tl-period">{card.period ?? "—"}</span>
          <div>
            <h3>{card.name}</h3>
            {card.historicalRole && <p>{card.historicalRole}</p>}
            {card.centers && card.centers.length > 0 && (
              <span className="afh-tl-centers">
                Centres · {card.centers.join(" · ")}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
