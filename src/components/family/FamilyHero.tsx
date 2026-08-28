import { ClassificationBadge } from "@/components/ui/classification-badge";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import {
  DoctrineLinkCard,
  type DoctrineSlug,
} from "@/components/source-transparency/DoctrineLinkCard";
import type { FamilyHeroData } from "@/lib/familyDataTransformer";

export interface FamilyHeroProps {
  data: FamilyHeroData;
}

function doctrineSlugForClassification(
  status: FamilyHeroData["classificationStatus"]
): DoctrineSlug | null {
  switch (status) {
    case "contested":
      return "classifications-contestees";
    case "colonial-legacy":
      return "heritage-colonial";
    case "reconstructive":
      return "classifications-contestees";
    default:
      return null;
  }
}

// @req REQ-047
export function FamilyHero({ data }: FamilyHeroProps) {
  const doctrineSlug = doctrineSlugForClassification(data.classificationStatus);

  return (
    <header
      className="rounded-[var(--country-radius-xl)] p-[18px] md:p-6 xl:p-7"
      style={{
        background: "var(--country-card)",
        border: "1px solid var(--country-border)",
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h1
          className="text-afh-h1 leading-none tracking-[-0.02em]"
          style={{
            fontFamily: "var(--country-font-display)",
            fontWeight: 900,
          }}
        >
          {data.nameFr}
        </h1>
        <ClassificationBadge
          status={data.classificationStatus}
          doctrineSlug={doctrineSlug ?? undefined}
        />
      </div>
      <p
        className="mt-2 text-afh-small"
        style={{ color: "var(--country-text-soft)" }}
      >
        {data.id}
      </p>
      <div className="mt-3">
        <ConfidenceChip
          confidenceScore={null}
          sourceCount={null}
          lastHumanAuditAt={null}
          variant="hero"
          ariaSuffix={data.nameFr}
          id={data.id}
        />
      </div>
      {doctrineSlug && (
        <div className="mt-3">
          <DoctrineLinkCard slug={doctrineSlug} />
        </div>
      )}
    </header>
  );
}
