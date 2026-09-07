import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/shared";

export interface NoNameFicheNoteProps {
  className?: string;
  language?: Language;
}

/**
 * ETNI-1463 AC2: a query that resolves to persons but no name (patronyme)
 * fiche must show that absence explicitly, not fall silent about it — the
 * atlas charter's "say what the corpus does not have" doctrine (§4),
 * applied to a whole missing result kind rather than one fiche field.
 */
// @req REQ-135
export function NoNameFicheNote({
  className,
  language = "fr",
}: NoNameFicheNoteProps) {
  return (
    <div
      data-testid="no-name-fiche-note"
      role="status"
      className={cn(
        "flex items-center gap-2 text-afh-small text-afh-text-soft",
        className
      )}
    >
      <Badge variant="outline" className="text-afh-caption">
        {language === "en" ? "Surname absent" : "Nom absent"}
      </Badge>
      <span>
        {language === "en"
          ? "The corpus does not yet document a surname record for this search."
          : "Le corpus ne documente pas encore de fiche de nom pour cette recherche."}
      </span>
    </div>
  );
}
