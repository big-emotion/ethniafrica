import * as React from "react";
import {
  Footprints,
  Handshake,
  Languages,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { RELATION_TYPE_LABELS } from "@/lib/glossaire/vocabularies";
import type { RelationBadgeType } from "@/lib/relationsDataTransformer";

export interface RelationTypeBadgeProps {
  type: RelationBadgeType;
  /** Renders a "· dérivé" suffix and a dashed border (AFRIK-derived, never sourced individually). */
  derived?: boolean;
  size?: "inline" | "card";
  className?: string;
}

const RELATION_TYPE_ICONS: Record<RelationBadgeType, LucideIcon> = {
  linguistic: Languages,
  migratory: Footprints,
  commercial: Handshake,
  religious: Sparkles,
};

const RELATION_TYPE_COLOR_CLASSES: Record<RelationBadgeType, string> = {
  linguistic: "border-afh-relation-linguistic text-afh-relation-linguistic",
  migratory: "border-afh-relation-migratory text-afh-relation-migratory",
  commercial: "border-afh-relation-commercial text-afh-relation-commercial",
  religious: "border-afh-relation-religious text-afh-relation-religious",
};

/**
 * Relation type badge (Epic 11, FR72-FR77, UX-DR39) — pairs an icon, a text
 * label, and an `--afh-relation-*` color so the type is never conveyed by
 * color alone. The `derived` variant marks AFRIK-derived linguistic links
 * that are never stored/sourced individually (FR73).
 */
// @req REQ-097
export function RelationTypeBadge({
  type,
  derived = false,
  size = "inline",
  className,
}: RelationTypeBadgeProps) {
  const Icon = RELATION_TYPE_ICONS[type];
  const label = RELATION_TYPE_LABELS.fr[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-afh-surface font-medium",
        size === "card"
          ? "px-3 py-1 text-afh-small"
          : "px-2 py-0.5 text-afh-caption",
        RELATION_TYPE_COLOR_CLASSES[type],
        derived && "border-dashed",
        className
      )}
      data-relation-type={type}
      data-derived={derived}
    >
      <Icon className={size === "card" ? "h-4 w-4" : "h-3 w-3"} aria-hidden />
      <span>
        {label}
        {derived ? " · dérivé" : ""}
      </span>
    </span>
  );
}
