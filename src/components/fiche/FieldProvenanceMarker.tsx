import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTranslation } from "@/lib/translations";
import type { ChapterState } from "@/lib/fieldProvenance";
import type { Language } from "@/types/shared";

export interface FieldProvenanceMarkerProps {
  state: ChapterState;
  /** Required and rendered only when state is "derived" (REQ-119 AC2). */
  origin?: string;
  /**
   * The corpus's own wording for why this field is empty, rendered only when
   * state is "documented-gap". Falls back to the generic badge without it.
   */
  reason?: string;
  language: Language;
  className?: string;
}

/**
 * Names a fiche field's provenance (REQ-119): visible when the corpus leaves
 * a structurally-expected field empty, or when the value shown was computed
 * from records other than the fiche's own source. A declared value — the
 * fiche's own source fills it — renders no marker at all, and neither does a
 * field the class's strict model never declared, which is not a silence but
 * an absence of contract.
 *
 * A documented gap outranks the generic badge: where an editor has written
 * why the corpus is silent, that sentence is more informative than "Donnée
 * manquante" and is what the reader gets.
 */
// @req REQ-119
export function FieldProvenanceMarker({
  state,
  origin,
  reason,
  language,
  className,
}: FieldProvenanceMarkerProps) {
  if (state === "declared" || state === "not-modelled") return null;

  const COPY = getTranslation(language).fieldProvenance;

  if (state === "documented-gap" && reason) {
    return (
      <p
        role="status"
        className={cn("text-afh-small text-muted-foreground", className)}
      >
        {reason}
      </p>
    );
  }

  if (state === "missing" || state === "documented-gap") {
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
