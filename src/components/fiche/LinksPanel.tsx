import { FichePanel } from "@/components/fiche/FichePanel";
import { RelationTypeBadge } from "@/components/fiche/RelationTypeBadge";
import type {
  FichePanelSide,
  FichePanelSize,
  FichePanelSourceLine,
} from "@/types/fiche";
import type { SourcedRelation } from "@/types/relations";

export interface LinksPanelProps {
  /** Omitted when the underlying people has no sourced relations to show (FR98). */
  relations?: SourcedRelation[];
  size: FichePanelSize;
  side: FichePanelSide;
  sourceLine: FichePanelSourceLine;
  stepLabel: string;
  heading: string;
  body: string;
  note?: string;
}

/**
 * Links panel (Epic 15 · Story 15.7 · FR98, FR99) — the relation
 * constellation from afrik_people_relations. Node labels are rendered as
 * text-first chips (never color alone), each badged with its relation type
 * via RelationTypeBadge. Out of scope: the relation corpus itself (Epic 11)
 * and any derived-linguistic-link rendering — this panel only surfaces
 * already-sourced relations (R4).
 */
// @req REQ-097
export function LinksPanel({
  relations,
  size,
  side,
  sourceLine,
  stepLabel,
  heading,
  body,
  note,
}: LinksPanelProps) {
  if (!relations || relations.length === 0) {
    return <FichePanel size={size} side={side} sourceLine={sourceLine} />;
  }

  return (
    <FichePanel
      size={size}
      side={side}
      sourceLine={sourceLine}
      data={{
        stepLabel,
        heading,
        body,
        note,
        canvas: (
          <ul
            data-links-constellation
            className="flex h-full w-full flex-wrap content-start items-start gap-afh-sm overflow-y-auto p-afh-lg"
          >
            {relations.map((relation) => (
              <li
                key={relation.id}
                className="flex items-center gap-afh-2xs rounded-afh-lg bg-afh-bg px-afh-sm py-afh-2xs text-afh-small text-afh-text"
              >
                <span>{relation.neighbor.nameMain}</span>
                <RelationTypeBadge type={relation.relationType} />
              </li>
            ))}
          </ul>
        ),
      }}
    />
  );
}

export default LinksPanel;
