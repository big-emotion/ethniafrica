import { classifyDepth, type DepthStage } from "./anthroponymDepth";

type CountryStatus = "attested" | "supposed";

interface PatronymDossier {
  id?: string;
  nameMain?: string;
  nameSystem?: string;
  transmissionMode?: string;
  countries?: Array<{ countryId?: string; status?: string }>;
  peoples?: Array<{ peopleId?: string }>;
  origin?: {
    oralTraditions?: unknown[];
    writtenChronicles?: unknown[];
    linguisticReconstructions?: unknown[];
  };
  sources?: Array<{
    source_kind?: string;
    tier?: string;
    url?: string | null;
  }>;
}

export interface CountryPatronymLedgerEntry {
  id: string;
  nameMain: string;
  nameSystem: string | null;
  countryStatus: CountryStatus;
  depthStage: DepthStage;
  peopleIds: string[];
  acceptedSourceCount: number;
  sourcesWithUrlCount: number;
  nextAction:
    | "replace_candidate_queue_with_accepted_source"
    | "document_origin_claim"
    | "resolve_transmission_mode"
    | "editorial_review_complete";
}

function nextAction(
  depthStage: DepthStage
): CountryPatronymLedgerEntry["nextAction"] {
  if (depthStage === "queue-only") {
    return "replace_candidate_queue_with_accepted_source";
  }
  if (depthStage === "unsourced-origin") return "document_origin_claim";
  if (depthStage === "undeclared-transmission") {
    return "resolve_transmission_mode";
  }
  return "editorial_review_complete";
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function buildCountryPatronymLedger({
  countryId,
  updatedAt,
  dossiers,
}: {
  countryId: string;
  updatedAt: string;
  dossiers: PatronymDossier[];
}) {
  const names = dossiers
    .flatMap((dossier): CountryPatronymLedgerEntry[] => {
      const relation = (dossier.countries ?? []).find(
        (country) => country.countryId === countryId
      );
      if (!relation || !dossier.id || !dossier.nameMain) return [];
      if (relation.status !== "attested" && relation.status !== "supposed") {
        return [];
      }

      const depthStage = classifyDepth(dossier);
      const sources = dossier.sources ?? [];
      return [
        {
          id: dossier.id,
          nameMain: dossier.nameMain,
          nameSystem: dossier.nameSystem ?? null,
          countryStatus: relation.status,
          depthStage,
          peopleIds: (dossier.peoples ?? [])
            .map((people) => people.peopleId)
            .filter((peopleId): peopleId is string => Boolean(peopleId)),
          acceptedSourceCount: sources.filter((source) =>
            ["official", "referenced"].includes(source.tier ?? "")
          ).length,
          sourcesWithUrlCount: sources.filter((source) => Boolean(source.url))
            .length,
          nextAction: nextAction(depthStage),
        },
      ];
    })
    .sort(
      (left, right) =>
        left.nameMain.localeCompare(right.nameMain, "fr", {
          sensitivity: "base",
        }) || left.id.localeCompare(right.id)
    );

  const byDepthStage: Record<DepthStage, number> = {
    "queue-only": 0,
    "unsourced-origin": 0,
    "undeclared-transmission": 0,
    documented: 0,
  };
  for (const name of names) byDepthStage[name.depthStage] += 1;

  return {
    schemaVersion: "1.0",
    countryId,
    updatedAt,
    summary: {
      directCountryFiches: names.length,
      byCountryStatus: {
        attested: names.filter((name) => name.countryStatus === "attested")
          .length,
        supposed: names.filter((name) => name.countryStatus === "supposed")
          .length,
      },
      byDepthStage,
      documentedPercent: percentage(byDepthStage.documented, names.length),
    },
    names,
  };
}
