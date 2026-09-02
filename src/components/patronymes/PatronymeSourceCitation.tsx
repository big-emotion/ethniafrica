import type { PatronymeSource } from "@/lib/patronymes/content";
import { isSourceTier, SOURCE_TIER_LABELS_FR } from "@/types/sources";

/**
 * One citation, shared by every patronyme section that reads a `<source>`
 * out of the opaque `content` bag (attested-form attestations, an origin's
 * sources, a filiation claim's sources) — one rendering for the Source Tier
 * Policy rather than three slightly different ones.
 *
 * "One rendering" is now true of the whole atlas and not just of this fiche.
 * It used to emit `afh-source-citation` and `afh-source-tier-label`, two
 * classes no stylesheet has ever defined, so the tier arrived as parenthesised
 * body text while the family, people and country fiches showed it as a chip
 * whose colour comes from the tier itself. A source cannot be read at a
 * confidence its own record does not claim, and a citation that looks like
 * prose is exactly how that happens.
 */
// @req REQ-133
export function PatronymeSourceCitation({
  source,
}: {
  source: PatronymeSource;
}) {
  const tier = isSourceTier(source.tier) ? source.tier : null;

  return (
    <>
      <span className="afh-chip" data-tier={tier ?? "unknown"}>
        {tier ? SOURCE_TIER_LABELS_FR[tier] : "Palier à revoir"}
      </span>
      <span>
        {source.url ? (
          <a href={source.url} target="_blank" rel="noreferrer noopener">
            {source.title}
          </a>
        ) : (
          source.title
        )}
        {/* Inside the row's text cell, not beside it: `afh-source-row` is a
            two-cell flex, and a third child would set the note in its own
            column, out of line with the title it qualifies. */}
        {source.notes ? (
          <span className="afh-parchment-note"> {source.notes}</span>
        ) : null}
      </span>
    </>
  );
}
