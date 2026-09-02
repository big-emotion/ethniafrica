/**
 * NameTypeBadge — Epic 8 Story 8.8 (ETNI-472).
 *
 * Icon + French label + color for one of the four `NameRecordType` values.
 * Color is never the sole signal (UX-DR49 rule 3): every variant pairs its
 * color with a lucide-react icon and a visible French label.
 *
 * The `imposed` variant renders "nom imposé" using the colonial tokens
 * (`--afh-color-colonial` / `--afh-color-colonial-bg` — muted brick, calm)
 * and MUST NOT use `--afh-error`, which is reserved for actual error states.
 */

import {
  BookOpenText,
  Fingerprint,
  Globe,
  Landmark,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NameRecordType } from "@/types/names";

export interface NameTypeBadgeProps {
  nameType: NameRecordType;
  imposed?: boolean;
  className?: string;
}

type TypeConfig = {
  label: string;
  fg: string;
  bg: string;
  Icon: LucideIcon;
};

const TYPE_CONFIG: Record<NameRecordType, TypeConfig> = {
  endonym: {
    label: "endonyme",
    fg: "var(--afh-earth)",
    bg: "var(--afh-color-earth-bg)",
    Icon: Fingerprint,
  },
  exonym: {
    label: "exonyme",
    fg: "var(--afh-terracotta)",
    bg: "var(--afh-color-terracotta-bg)",
    Icon: Globe,
  },
  historical_spelling: {
    label: "graphie historique",
    fg: "var(--afh-color-text-soft)",
    bg: "var(--afh-color-gold-bg)",
    Icon: BookOpenText,
  },
  surname: {
    label: "patronyme",
    fg: "var(--afh-earth)",
    bg: "var(--afh-color-earth-bg)",
    Icon: Users,
  },
};

const IMPOSED_CONFIG: TypeConfig = {
  label: "nom imposé",
  fg: "var(--afh-color-colonial)",
  bg: "var(--afh-color-colonial-bg)",
  Icon: Landmark,
};

// @req REQ-056
export function NameTypeBadge({
  nameType,
  imposed = false,
  className,
}: NameTypeBadgeProps) {
  const config = imposed ? IMPOSED_CONFIG : TYPE_CONFIG[nameType];
  const Icon = config.Icon;

  return (
    <Badge
      variant="outline"
      data-name-type={nameType}
      data-imposed={imposed || undefined}
      className={cn("gap-1.5 border-transparent font-semibold", className)}
      style={{ backgroundColor: config.bg, color: config.fg }}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span>{config.label}</span>
    </Badge>
  );
}
