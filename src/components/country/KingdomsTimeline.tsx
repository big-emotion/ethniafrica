"use client";

import Link from "next/link";
import type { Language } from "@/types/shared";
import { getFicheDossiers } from "@/lib/dossiers/catalog";
import { useModuleAvailability } from "@/components/hubs/ModuleAvailabilityProvider";
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
  countryId?: string;
  language?: Language;
}

// @req REQ-115
export function KingdomsTimeline({
  cards,
  countryId,
  language = "fr",
}: KingdomsTimelineProps) {
  const availability = useModuleAvailability();
  if (cards.length === 0) return null;

  return (
    <div className="afh-parchment-timeline">
      {cards.map((card) => {
        const dossier = countryId
          ? getFicheDossiers(
              {
                kind: "country",
                id: countryId,
                section: `kingdom:${card.name}`,
              },
              availability,
              language
            )[0]
          : undefined;
        return (
          <article className="afh-tl-item" key={`${card.name}-${card.period}`}>
            {/* An entity whose period the corpus does not state still gets its
              column, so the names stay aligned down the chronology. */}
            <span className="afh-tl-period">{card.period ?? "—"}</span>
            <div>
              <h3>
                {dossier ? (
                  <Link
                    href={dossier.href}
                    className="underline decoration-[var(--afh-accent)] underline-offset-4"
                  >
                    {card.name}
                  </Link>
                ) : (
                  card.name
                )}
              </h3>
              {card.historicalRole && <p>{card.historicalRole}</p>}
              {card.centers && card.centers.length > 0 && (
                <span className="afh-tl-centers">
                  Centres · {card.centers.join(" · ")}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
