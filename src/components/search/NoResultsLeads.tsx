import Link from "next/link";

import {
  SEARCH_ENTITY_ACCENT,
  SearchEntityMark,
  getSearchEntityLabel,
} from "@/components/search/searchEntityAccent";
import { Badge } from "@/components/ui/badge";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";
import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import { cn } from "@/lib/utils";
import type { SearchLead } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

// @req REQ-125
function leadHrefFor(lead: SearchLead, language: Language): string {
  if (lead.type === "country") return getCountryRoute(language, lead.id);
  if (lead.type === "languageFamily") return getFamilyRoute(language, lead.id);
  return getPeopleRoute(language, lead.id);
}

export interface NoResultsLeadsProps {
  leads: SearchLead[];
  language: Language;
  /** Fired when a lead link is activated — a modal closes with it. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * The near-miss cartouche (REQ-125): what the engine almost understood, shown
 * only alongside a zero-result search so the reader never faces a dead empty
 * state. Renders nothing when there are no leads, so every call site can
 * mount it unconditionally on the empty-state branch.
 */
// @req REQ-125
export function NoResultsLeads({
  leads,
  language,
  onNavigate,
  className,
}: NoResultsLeadsProps) {
  if (leads.length === 0) return null;

  return (
    <div
      data-testid="no-results-leads"
      className={cn("flex flex-col gap-afh-md", className)}
    >
      <p className="text-afh-small text-afh-text-soft">Vouliez-vous dire :</p>
      <ul
        className="flex flex-wrap items-center justify-center gap-2"
        aria-label="Suggestions proches"
      >
        {leads.map((lead) => (
          <li key={`${lead.type}-${lead.id}`} onClick={onNavigate}>
            <Link
              href={leadHrefFor(lead, language)}
              className={cn(
                "rounded-full",
                SEARCH_ENTITY_ACCENT[lead.type]?.accentScopeClassName,
                CHARTER_FOCUS_RING
              )}
            >
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 text-afh-caption"
              >
                <SearchEntityMark type={lead.type} />
                {lead.name}
                <span className="text-afh-text-muted">
                  {getSearchEntityLabel(lead.type)}
                </span>
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
