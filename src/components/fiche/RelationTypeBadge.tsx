import { Badge } from "@/components/ui/badge";
import type { RelationType } from "@/types/relations";

const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  migratory: "Migratoire",
  commercial: "Commerciale",
  religious: "Religieuse",
};

export interface RelationTypeBadgeProps {
  type: RelationType;
  className?: string;
}

/**
 * Text label for a sourced relation's type (Epic 11 FR72-FR77, Epic 15
 * Story 15.7). Text-first: the type is always readable as a word, never
 * conveyed by color alone.
 */
// @req REQ-097
export function RelationTypeBadge({ type, className }: RelationTypeBadgeProps) {
  return (
    <Badge variant="outline" className={className} data-relation-type={type}>
      {RELATION_TYPE_LABELS[type]}
    </Badge>
  );
}

export default RelationTypeBadge;
