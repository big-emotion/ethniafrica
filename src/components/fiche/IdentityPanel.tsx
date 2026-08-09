/**
 * IdentityPanel — Epic 15 · Story 15.3 (ETNI-811, FR96 — the emotional payload
 * of the product).
 *
 * The fiche hero's identity panel: endonym as the primary heading with a
 * correct `lang` attribute, exonym secondary; when an imposed exonym exists,
 * the imposing context is visible without interaction (struck-through
 * "terre" chip + one contextualizing line — terre is the reserved colonial
 * marker accent). Sourced fallback to the canonical AFRIK name when no
 * endonym name_record exists — never a fabricated endonym (R4).
 *
 * Accent/mode are never props (FichePanel contract, src/types/fiche.ts):
 * the "terre" marker is consumed as the `--afh-cat-terre` semantic token
 * from ambient scope, never a raw color literal.
 */

import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { NameTypeBadge } from "@/components/names/NameTypeBadge";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { deriveIdentityViewModel } from "@/lib/identityViewModel";
import type { PeopleNamesDossier } from "@/api/v2/schemas/names";

export interface IdentityPanelProps {
  peopleId: string;
  /** Canonical AFRIK name — the sourced fallback heading when no endonym record exists (R4). */
  nameMain: string;
  dossier: PeopleNamesDossier;
}

function buildImpositionContextLine(
  imposedBy: string | null,
  impositionPeriod: string | null,
  whyProblematic: string | null
): string {
  const parts: string[] = [];
  if (imposedBy) parts.push(`Imposé par ${imposedBy}`);
  if (impositionPeriod) parts.push(impositionPeriod);
  if (whyProblematic) parts.push(whyProblematic);
  return parts.join(" — ");
}

// @req REQ-091
export function IdentityPanel({
  peopleId,
  nameMain,
  dossier,
}: IdentityPanelProps) {
  const vm = deriveIdentityViewModel(dossier, nameMain);

  return (
    <header data-testid="identity-panel">
      <AutonymExonymHeading
        variant="hero"
        autonym={vm.primaryText}
        autonymIso639_3={vm.primaryLang ?? undefined}
        exonym={vm.secondaryText ?? undefined}
      />

      {vm.imposition && (
        <div
          data-testid="identity-imposition"
          className="mt-afh-sm flex flex-wrap items-center gap-afh-sm"
        >
          <span
            data-imposed-name="true"
            style={{
              color: "var(--afh-cat-terre)",
              backgroundColor: "var(--afh-cat-terre-tint)",
              textDecoration: "line-through",
            }}
            className="inline-flex items-center rounded-full px-2 py-0.5 text-afh-small font-medium"
          >
            {vm.secondaryText ?? vm.imposition.imposedBy}
          </span>
          <NameTypeBadge nameType="exonym" imposed />
          <p className="w-full text-afh-small text-afh-text-muted">
            {buildImpositionContextLine(
              vm.imposition.imposedBy,
              vm.imposition.impositionPeriod,
              vm.imposition.whyProblematic
            )}
          </p>
        </div>
      )}

      <div
        data-testid="identity-source-affordance"
        className="mt-afh-md flex flex-wrap items-center gap-afh-sm"
      >
        <ConfidenceChip
          confidenceScore={vm.confidence.score}
          sourceCount={vm.confidence.sourceCount}
          lastHumanAuditAt={vm.confidence.lastHumanAuditAt}
          variant="hero"
          id={peopleId}
          ariaSuffix={`pour la fiche ${vm.primaryText}`}
        />
        <p className="text-afh-caption text-afh-text-muted">
          {vm.sourceLine.href ? (
            <a
              href={vm.sourceLine.href}
              className="underline decoration-[var(--accent)]"
            >
              {vm.sourceLine.label}
            </a>
          ) : (
            vm.sourceLine.label
          )}
        </p>
      </div>
    </header>
  );
}

export default IdentityPanel;
