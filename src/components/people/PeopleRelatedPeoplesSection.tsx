import { FicheProse } from "@/components/fiche/FicheProse";
import { ActionLink } from "@/components/ui/ActionLink";

import {
  hasRelatedContent,
  type PeopleRelatedData,
  type PeopleRelationPreviewItem,
} from "@/lib/peopleDataTransformer";
import { RelationTypeBadge } from "@/components/relations/RelationTypeBadge";
import { getPeopleLinksRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import { peopleCopy } from "@/lib/i18n/copy/people";

interface PeopleRelatedPeoplesSectionProps {
  data: PeopleRelatedData;
  language: Language;
  peopleId?: string;
  relationsPreview?: PeopleRelationPreviewItem[];
}

// @req REQ-097 FR72
// @req REQ-097 FR75
export function PeopleRelatedPeoplesSection({
  data,
  language,
  peopleId,
  relationsPreview = [],
}: PeopleRelatedPeoplesSectionProps) {
  const copy = peopleCopy[language].relatedFields;
  const hasContent = hasRelatedContent(data) || relationsPreview.length > 0;

  if (!hasContent) return null;

  return (
    <dl className="afh-prose-fields space-y-[14px]">
      {relationsPreview.length > 0 && peopleId && (
        <div>
          <dt className="people-section-label">{copy.links}</dt>
          <dd className="afh-prose-def">
            <div className="flex flex-col gap-[8px] mt-[8px]">
              {relationsPreview.slice(0, 3).map((relation) => (
                <div key={relation.id} className="flex items-center gap-[8px]">
                  <RelationTypeBadge
                    type={relation.type}
                    derived={relation.derived}
                    size="inline"
                  />
                  <span
                    className="text-afh-small font-medium"
                    style={{ color: "var(--country-text)" }}
                  >
                    {relation.neighborName}
                  </span>
                </div>
              ))}
            </div>
            {/* `text-afh-accent` was not a colour: the Tailwind config has no
              afh-accent key, so the class resolved to nothing and the link
              inherited the surrounding ink. ActionLink reads --accent-ink
              directly. */}
            <ActionLink
              href={getPeopleLinksRoute(language, peopleId)}
              className="mt-[4px]"
            >
              {copy.seeAll}
            </ActionLink>
          </dd>
        </div>
      )}

      {data.ethnicities.length > 0 && (
        <div>
          <dt className="people-section-label">{copy.associatedGroups}</dt>
          <dd className="afh-prose-def">
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
                    className="text-afh-small font-semibold leading-tight"
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
          </dd>
        </div>
      )}

      {data.politicalSystem && (
        <div>
          <dt className="people-section-label">{copy.politicalSystem}</dt>
          <dd className="afh-prose-def">
            <FicheProse
              language={language}
              text={data.politicalSystem}
              paragraphClassName="people-section-body"
            />
          </dd>
        </div>
      )}

      {data.clanOrganization && (
        <div>
          <dt className="people-section-label">{copy.clanOrganisation}</dt>
          <dd className="afh-prose-def">
            <FicheProse
              language={language}
              text={data.clanOrganization}
              paragraphClassName="people-section-body"
            />
          </dd>
        </div>
      )}

      {data.ageClassSystems && (
        <div>
          <dt className="people-section-label">{copy.ageGrades}</dt>
          <dd className="afh-prose-def">
            <FicheProse
              language={language}
              text={data.ageClassSystems}
              paragraphClassName="people-section-body"
            />
          </dd>
        </div>
      )}

      {/* Declared by 786 of 789 fiches and read by nothing until now: the two
          fields were typed on OrganizationSection and the transform mapped
          three of its five. */}
      {data.roleOfLineages && (
        <div>
          <dt className="people-section-label">{copy.lineages}</dt>
          <dd className="afh-prose-def">
            <FicheProse
              language={language}
              text={data.roleOfLineages}
              paragraphClassName="people-section-body"
            />
          </dd>
        </div>
      )}

      {data.religiousAuthority && (
        <div>
          <dt className="people-section-label">{copy.religiousAuthority}</dt>
          <dd className="afh-prose-def">
            <FicheProse
              language={language}
              text={data.religiousAuthority}
              paragraphClassName="people-section-body"
            />
          </dd>
        </div>
      )}
    </dl>
  );
}
