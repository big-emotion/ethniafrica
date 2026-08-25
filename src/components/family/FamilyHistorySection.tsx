import type { FamilyHistoryData } from "@/lib/familyDataTransformer";
import { FlagTarget } from "@/components/flags/FlagTarget";

export interface FamilyHistorySectionProps {
  data: FamilyHistoryData;
  familyId: string;
  /** Cloudflare Turnstile public site key, required to enable the live FlagTarget wiring on this heading (AC5). */
  turnstileSiteKey?: string;
}

const historyFields = [
  ["Origine probable", "probableOrigin"],
  ["Période d'émergence", "emergencePeriod"],
  ["Diffusion", "diffusion"],
  ["Ruptures historiques", "historicalBreaks"],
  ["Zones de contact", "contactZones"],
  ["Événements majeurs", "majorEvents"],
] as const;

// @req REQ-047
export function FamilyHistorySection({
  data,
  familyId,
  turnstileSiteKey,
}: FamilyHistorySectionProps) {
  if (!historyFields.some(([, field]) => Boolean(data[field]))) return null;

  return (
    <section aria-labelledby="family-history-heading">
      <h2 id="family-history-heading">Histoire et origines</h2>
      {historyFields.map(([label, field]) =>
        data[field] ? (
          <p key={field}>
            <strong>{label} :</strong> {data[field]}
          </p>
        ) : null
      )}
      <div data-testid="section-flag-target-history">
        {turnstileSiteKey ? (
          <FlagTarget
            target={{
              type: "fiche_section",
              id: familyId,
              fieldPath: "history",
            }}
            turnstileSiteKey={turnstileSiteKey}
            triggerLabel="Signaler cette section"
            className="w-auto text-xs"
          />
        ) : (
          <button
            type="button"
            disabled
            className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground"
            aria-label="Signaler cette section — bientôt disponible"
          >
            Signaler cette section (bientôt disponible)
          </button>
        )}
      </div>
    </section>
  );
}
