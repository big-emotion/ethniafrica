import Link from "next/link";

import {
  hasRelatedContent,
  type PeopleRelatedData,
  type PeopleRelationPreviewItem,
} from "@/lib/peopleDataTransformer";
import { RelationTypeBadge } from "@/components/relations/RelationTypeBadge";
import { getPeopleLinksRoute } from "@/lib/routing";

interface PeopleRelatedPeoplesSectionProps {
  data: PeopleRelatedData;
  peopleId?: string;
  relationsPreview?: PeopleRelationPreviewItem[];
}

// @req REQ-097 FR72
// @req REQ-097 FR75
export function PeopleRelatedPeoplesSection({
  data,
  peopleId,
  relationsPreview = [],
}: PeopleRelatedPeoplesSectionProps) {
  const hasContent = hasRelatedContent(data) || relationsPreview.length > 0;

  if (!hasContent) return null;

  return (
    <div className="space-y-[14px]">
      {relationsPreview.length > 0 && peopleId && (
        <div>
          <p className="people-section-label">Liens</p>
          <div className="flex flex-col gap-[8px] mt-[8px]">
            {relationsPreview.slice(0, 3).map((relation) => (
              <div key={relation.id} className="flex items-center gap-[8px]">
                <RelationTypeBadge
                  type={relation.type}
                  derived={relation.derived}
                  size="inline"
                />
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--country-text)" }}
                >
                  {relation.neighborName}
                </span>
              </div>
            ))}
          </div>
          <Link
            href={getPeopleLinksRoute("fr", peopleId)}
            className="inline-flex items-center min-h-[44px] mt-[4px] text-[13px] font-semibold text-afh-accent"
          >
            voir tous les liens →
          </Link>
        </div>
      )}

      {data.ethnicities.length > 0 && (
        <div>
          <p className="people-section-label">Groupes associés</p>
          <div className="flex flex-wrap gap-[8px] mt-[8px]">
            {data.ethnicities.map((e, i) => (
              <div
                key={i}
                data-ethnicity-card="true"
                className="px-[10px] py-[6px] rounded-[var(--country-radius-md)] border"
                style={{
                  background: "var(--country-earth-bg)",
                  borderColor: "var(--country-border)",
                }}
              >
                <span
                  className="text-[13px] font-semibold leading-tight"
                  style={{
                    fontFamily: "var(--country-font-body)",
                    color: "var(--country-text)",
                  }}
                >
                  {e}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.politicalSystem && (
        <div>
          <p className="people-section-label">Système politique traditionnel</p>
          <p className="people-section-body">{data.politicalSystem}</p>
        </div>
      )}

      {data.clanOrganization && (
        <div>
          <p className="people-section-label">Organisation clanique</p>
          <p className="people-section-body">{data.clanOrganization}</p>
        </div>
      )}

      {data.ageClassSystems && (
        <div>
          <p className="people-section-label">Grades d&apos;âge</p>
          <p className="people-section-body">{data.ageClassSystems}</p>
        </div>
      )}

      {/* Declared by 786 of 789 fiches and read by nothing until now: the two
          fields were typed on OrganizationSection and the transform mapped
          three of its five. */}
      {data.roleOfLineages && (
        <div>
          <p className="people-section-label">Rôle des lignages</p>
          <p className="people-section-body">{data.roleOfLineages}</p>
        </div>
      )}

      {data.religiousAuthority && (
        <div>
          <p className="people-section-label">Autorité religieuse</p>
          <p className="people-section-body">{data.religiousAuthority}</p>
        </div>
      )}
    </div>
  );
}
