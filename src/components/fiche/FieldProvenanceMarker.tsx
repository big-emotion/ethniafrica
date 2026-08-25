import { Badge } from "@/components/ui/badge";
import { translations } from "@/lib/translations";
import type { ProvenanceState } from "@/lib/fieldProvenance";

export interface FieldProvenanceMarkerProps {
  state: ProvenanceState;
  /** Required and rendered only when state is "derived" (REQ-119 AC2). */
  origin?: string;
  className?: string;
}

const COPY = translations.fr.fieldProvenance;

/**
 * Names a fiche field's provenance (REQ-119): visible when the corpus leaves
 * a structurally-expected field empty, or when the value shown was computed
 * from records other than the fiche's own source. A declared value — the
 * fiche's own source fills it — renders no marker at all.
 */
// @req REQ-119
export function FieldProvenanceMarker({
  state,
  origin,
  className,
}: FieldProvenanceMarkerProps) {
  if (state === "declared") return null;

  if (state === "missing") {
    return (
      <Badge
        variant="outline"
        role="status"
        aria-label={`${COPY.missingLabel} — ${COPY.missingReason}`}
        className={className}
      >
        {COPY.missingLabel}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      role="status"
      aria-label={`${COPY.derivedLabel} — ${COPY.derivedFromPrefix}${origin ?? ""}`}
      className={className}
    >
      {COPY.derivedFromPrefix}
      {origin}
    </Badge>
  );
}
