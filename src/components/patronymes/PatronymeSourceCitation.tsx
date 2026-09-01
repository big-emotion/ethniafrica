import type { PatronymeSource } from "@/lib/patronymes/content";
import { sourceStandingLabelFr } from "@/types/sources";

/**
 * One citation, shared by every patronyme section that reads a `<source>`
 * out of the opaque `content` bag (attested-form attestations, an origin's
 * sources, a filiation claim's sources) — one rendering for the Source Tier
 * Policy rather than three slightly different ones.
 */
// @req REQ-133
export function PatronymeSourceCitation({
  source,
}: {
  source: PatronymeSource;
}) {
  const tierLabel = sourceStandingLabelFr(source.tier);
  return (
    <span className="afh-source-citation" data-source-tier={source.tier}>
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer noopener">
          {source.title}
        </a>
      ) : (
        source.title
      )}{" "}
      <span className="afh-source-tier-label">({tierLabel})</span>
    </span>
  );
}

export default PatronymeSourceCitation;
