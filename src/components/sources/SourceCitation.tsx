import { type SourceTier, sourceStandingLabelFr } from "@/types/sources";

/**
 * A citable work, reduced to what a citation actually needs.
 *
 * Structural rather than named: a patronyme source, a dossier source and a
 * fiche source are three shapes of one idea, and a component that took one of
 * them by name would be copied for the other two — which is exactly what had
 * started to happen.
 */
export interface CitableSource {
  title: string;
  url: string | null;
  /**
   * `needs_review` is not a tier and must never be folded onto "Non vérifiée".
   * Keeping it in the type is what forces every caller through
   * `sourceStandingLabelFr`.
   */
  standing: SourceTier | "needs_review";
}

/**
 * One citation, wherever the atlas cites.
 *
 * The Source Tier Policy has one rendering, not one per surface. This was the
 * patronyme fiche's own component, typed to `PatronymeSource`; its docblock
 * already said it existed so that three sections would not each grow their
 * own, and the dossier and the bibliography page were about to make that four
 * and five.
 *
 * The standing goes through `sourceStandingLabelFr` and never through
 * `SOURCE_TIER_LABELS_FR` directly. `strictNullChecks` is off in this repo, so
 * indexing the label map with a value that turns out to be `needs_review`
 * yields an empty string — a source rendered with no visible provenance,
 * which is the one outcome the policy exists to prevent.
 */
// @req REQ-092
export function SourceCitation({ source }: { source: CitableSource }) {
  const standingLabel = sourceStandingLabelFr(source.standing);

  return (
    <span className="afh-source-citation" data-source-tier={source.standing}>
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer noopener">
          {source.title}
        </a>
      ) : (
        source.title
      )}{" "}
      <span className="afh-source-tier-label">({standingLabel})</span>
    </span>
  );
}
