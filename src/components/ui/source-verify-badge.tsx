"use client";

/**
 * "Source à vérifier" badge — surfaced on public fiches when an active
 * auto-generated `unreachable_source` flag exists for the entity.
 *
 * Colors use the project's design tokens (`--country-colonial-bg` /
 * `--country-colonial`) to stay consistent with the colonial-term warning
 * styling and to meet WCAG AA contrast (#9B3030 on #FCE8E8 ≈ 7.3:1).
 *
 * Story 0.20 (FR31).
 */

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface SourceVerifyBadgeProps {
  /** Optional reason shown as tooltip on hover / focus. */
  reason?: string;
  className?: string;
}

const LABEL = "source à vérifier";
const DEFAULT_REASON =
  "URL de la source injoignable depuis au moins 7 jours consécutifs.";

export function SourceVerifyBadge({
  reason,
  className,
}: SourceVerifyBadgeProps) {
  const tooltipText = reason || DEFAULT_REASON;
  const badge = (
    <Badge
      variant="outline"
      role="status"
      aria-label={`${LABEL} — ${tooltipText}`}
      className={cn(
        "gap-1 border-transparent",
        "bg-[var(--country-colonial-bg)] text-[var(--country-colonial)]",
        "hover:bg-[var(--country-colonial-bg)]/80",
        className
      )}
    >
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      {LABEL}
    </Badge>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            {badge}
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
