"use client";

import { Badge } from "@/components/ui/badge";
import type { FlagRow } from "@/types/module-zero";

type FlagStatus = FlagRow["status"];

interface FlagPublicStatusProps {
  status: FlagStatus;
  moderatorNotes?: string | null;
}

const STATUS_CONFIG: Record<
  FlagStatus,
  { label: string; style: React.CSSProperties }
> = {
  open: {
    label: "en cours — examen par l'équipe éditoriale",
    style: { backgroundColor: "#FEF3C7", color: "#92400E" },
  },
  under_review: {
    label: "en cours — examen par l'équipe éditoriale",
    style: { backgroundColor: "#FEF3C7", color: "#92400E" },
  },
  accepted: {
    label: "acceptée · fiche mise à jour",
    style: { backgroundColor: "#D1FAE5", color: "#065F46" },
  },
  rejected: {
    label: "rejetée",
    style: { backgroundColor: "#F3F4F6", color: "#374151" },
  },
  duplicate: {
    label: "doublon",
    style: { backgroundColor: "#F3F4F6", color: "#374151" },
  },
  withdrawn: {
    label: "retirée",
    style: { backgroundColor: "#F3F4F6", color: "#6B7280" },
  },
};

/**
 * L3 badge component showing the editorial status of a public flag.
 *
 * Amber = open / under review; green = accepted; grey = rejected / duplicate /
 * withdrawn. When moderator notes are present and the status is terminal
 * (rejected or duplicate), they are displayed verbatim in a <blockquote>.
 */
export function FlagPublicStatus({
  status,
  moderatorNotes,
}: FlagPublicStatusProps) {
  const config = STATUS_CONFIG[status];
  const showRationale =
    (status === "rejected" || status === "duplicate") && moderatorNotes;

  return (
    <div className="space-y-2">
      <Badge
        variant="outline"
        data-testid="flag-status-badge"
        data-status={status}
        className="border-transparent font-medium text-sm px-3 py-1"
        style={config.style}
      >
        {config.label}
      </Badge>
      {showRationale && (
        <blockquote
          className="border-l-4 border-muted pl-4 text-muted-foreground italic text-sm"
          role="blockquote"
        >
          {moderatorNotes}
        </blockquote>
      )}
    </div>
  );
}
