"use client";

import { Badge } from "@/components/ui/badge";
import { publicFlagsCopy } from "@/lib/i18n/copy/publicFlags";
import type { FlagRow } from "@/types/module-zero";
import type { Language } from "@/types/shared";

type FlagStatus = FlagRow["status"];

interface FlagPublicStatusProps {
  status: FlagStatus;
  moderatorNotes?: string | null;
  language?: Language;
}

const STATUS_CONFIG: Record<FlagStatus, { style: React.CSSProperties }> = {
  open: {
    style: { backgroundColor: "#FEF3C7", color: "#92400E" },
  },
  under_review: {
    style: { backgroundColor: "#FEF3C7", color: "#92400E" },
  },
  accepted: {
    style: { backgroundColor: "#D1FAE5", color: "#065F46" },
  },
  rejected: {
    style: { backgroundColor: "#F3F4F6", color: "#374151" },
  },
  duplicate: {
    style: { backgroundColor: "#F3F4F6", color: "#374151" },
  },
  withdrawn: {
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
// @req REQ-014
export function FlagPublicStatus({
  status,
  moderatorNotes,
  language = "fr",
}: FlagPublicStatusProps) {
  const config = STATUS_CONFIG[status];
  const label = publicFlagsCopy[language].statusDescriptions[status];
  const showRationale =
    (status === "rejected" || status === "duplicate") && moderatorNotes;

  return (
    <div className="space-y-2">
      <Badge
        variant="outline"
        data-testid="flag-status-badge"
        data-status={status}
        className="border-transparent font-medium text-afh-small px-3 py-1"
        style={config.style}
      >
        {label}
      </Badge>
      {showRationale && (
        <blockquote
          className="border-l-4 border-muted pl-4 text-muted-foreground italic text-afh-small"
          role="blockquote"
        >
          {moderatorNotes}
        </blockquote>
      )}
    </div>
  );
}
