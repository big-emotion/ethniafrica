/**
 * ImposedNameList — Epic 13, Story 13.10 (ETNI-534).
 *
 * Renders the names imposed under colonization, endonym first, so naming
 * violence is documented without duplicating Epic 8's Names Atlas data
 * (FR88, FR90). Consumes view models produced by `mapImposedNames` — no
 * fabrication is possible here since the type guarantees every field came
 * from an actual Epic 8 record. Renders nothing when there is nothing to
 * show (no empty shell, consistent with `FragmentationView`).
 */

import { cn } from "@/lib/utils";
import { NameTypeBadge } from "@/components/names/NameTypeBadge";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import type { ImposedNameViewModel } from "@/components/colonization/imposedNames";

export interface ImposedNameListProps {
  items: ImposedNameViewModel[];
  className?: string;
}

// @req REQ-104
export function ImposedNameList({ items, className }: ImposedNameListProps) {
  if (items.length === 0) return null;

  return (
    <ul
      aria-label="noms imposés durant la colonisation"
      className={cn("flex flex-col gap-afh-sm", className)}
    >
      {items.map((item) => (
        <li
          key={item.peopleId}
          className="flex flex-col gap-2 rounded-afh-lg border border-afh-border bg-afh-surface p-afh-sm"
        >
          <div className="flex flex-wrap items-center gap-afh-sm">
            <span
              lang={item.endonymLanguage ?? undefined}
              className="font-afh-display font-black text-afh-h3 text-afh-text"
            >
              {item.endonym}
            </span>
            <span aria-hidden="true" className="text-afh-text-soft">
              →
            </span>
            <span className="font-afh text-afh-body font-semibold text-afh-text">
              {item.imposedName}
            </span>
            <NameTypeBadge nameType={item.imposedNameType} imposed />
          </div>

          {item.whyProblematic ? (
            <p className="font-afh text-afh-body text-afh-text-soft">
              {item.whyProblematic}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-afh-sm">
            <ConfidenceChip
              confidenceScore={item.confidenceScore}
              sourceCount={item.sourceCount}
              lastHumanAuditAt={item.lastHumanAuditAt}
              ariaSuffix={`pour le nom imposé « ${item.imposedName} »`}
            />
            <a
              href={item.atlasHref}
              className="text-afh-small text-afh-text-soft underline underline-offset-2 hover:text-afh-text"
            >
              voir dans l&apos;Atlas des noms
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
