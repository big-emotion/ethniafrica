import { Badge } from "@/components/ui/badge";
import type { TranslationKind } from "@/lib/afrik/translations/types";

export interface TranslationProvenanceLabels {
  human: string;
  machine_reviewed: string;
  machine: string;
  /** Appended after the kind when the source moved since the translation. */
  staleSuffix: string;
}

/**
 * English defaults, so the component is testable standalone. The foundation
 * wiring passes the locale dictionary once `translations.en` exists.
 */
const DEFAULT_LABELS: TranslationProvenanceLabels = {
  human: "Human translation",
  machine_reviewed: "Machine translation, reviewed",
  machine: "Machine translation, not yet reviewed",
  staleSuffix: "— source updated since",
};

export interface TranslationProvenanceMarkerProps {
  /** Null on the authored locale, or when the locale has no record. */
  translation: { kind: TranslationKind; stale: boolean } | null;
  labels?: Partial<TranslationProvenanceLabels>;
  className?: string;
}

/**
 * Names how the text in front of the reader was translated (REQ-142 AC1,
 * AC2), the way FieldProvenanceMarker names where a field's value came from.
 *
 * Art-direction ruling (brand charter §5.2, actions charter §5–6): this is
 * source apparatus, not a facet and not an alarm. It never names an accent —
 * a page has one, and the marker would teach a second lesson with the same
 * hue — and it is never red, which the classification badge already reserved
 * for nothing. `outline` for the two reviewed states, a plain statement;
 * `secondary`, the warm ground, for the unreviewed machine state, so it asks
 * for a second look without colour alarm. Staleness is a suffix in words, not
 * a colour: a colour that changes with a hash carries no meaning a reader can
 * learn.
 *
 * Distinct from ConfidenceChip on purpose: the chip is a 44 px interactive
 * pill carrying a score and opening the source chain; this is a static
 * sentence. Mount point, for the wiring that follows the foundation PR:
 * in the parchment head after the lede and before `.afh-chips`, on its own
 * line, so the reader meets it before the facts it qualifies.
 */
// @req REQ-142
export function TranslationProvenanceMarker({
  translation,
  labels,
  className,
}: TranslationProvenanceMarkerProps) {
  if (!translation) return null;

  const copy = { ...DEFAULT_LABELS, ...labels };
  const text = translation.stale
    ? `${copy[translation.kind]} ${copy.staleSuffix}`
    : copy[translation.kind];

  return (
    <Badge
      variant={translation.kind === "machine" ? "secondary" : "outline"}
      role="status"
      aria-label={text}
      className={className}
    >
      {text}
    </Badge>
  );
}
