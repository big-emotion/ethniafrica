import Link from "next/link";

import { FicheProse } from "@/components/fiche/FicheProse";
import { ActionLink } from "@/components/ui/ActionLink";

import {
  hasRelatedContent,
  type PeopleRelatedData,
  type PeopleRelationPreviewItem,
} from "@/lib/peopleDataTransformer";
import { RelationTypeBadge } from "@/components/relations/RelationTypeBadge";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";
import { cn } from "@/lib/utils";
import type { AssociatedGroup } from "@/lib/people/associatedPeopleLinks";
import { getPeopleLinksRoute, getPeopleRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import { peopleCopy } from "@/lib/i18n/copy/people";

interface PeopleRelatedPeoplesSectionProps {
  data: PeopleRelatedData;
  language: Language;
  peopleId?: string;
  relationsPreview?: PeopleRelationPreviewItem[];
  /**
   * `data.ethnicities`, each entry already told whether the corpus holds a
   * fiche under that name. Required rather than defaulted: an empty list next
   * to a non-empty `ethnicities` would open the chapter and print nothing,
   * because `hasRelatedContent` gates on the latter.
   */
  associatedGroups: AssociatedGroup[];
}

const GROUP_CHIP_CLASS =
  "px-[10px] py-[6px] rounded-[var(--country-radius-md)] border";

const GROUP_CHIP_STYLE = {
  background: "var(--people-accent-tint)",
  borderColor: "var(--country-border)",
} as const;

const GROUP_LABEL_CLASS = "text-afh-small font-semibold leading-tight";

// @req REQ-097 FR72
// @req REQ-097 FR75
export function PeopleRelatedPeoplesSection({
  data,
  language,
  peopleId,
  relationsPreview = [],
  associatedGroups,
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

      {associatedGroups.length > 0 && (
        <div>
          <dt className="people-section-label">{copy.associatedGroups}</dt>
          <dd className="afh-prose-def">
            <div className="flex flex-wrap gap-[8px] mt-[8px]">
              {/* The chip skin is kept and an anchor put in place of the div,
                  rather than turning the row into ActionLink arrows: this is a
                  chip that became navigable, and 3735 of the corpus's 4050
                  entries stay inert beside it. Only the ink changes, to the
                  accent ActionLink already reads — same skin, same padding,
                  same weight — so the row keeps its wrap at 430px and an inert
                  chip carries no mark of being inert. */}
              {associatedGroups.map((group, index) => {
                // The corpus entry whole, gloss included: the resolver's
                // leading-name split is a matching device, not a trim.
                const label = (
                  <span
                    className={GROUP_LABEL_CLASS}
                    style={{
                      fontFamily: "var(--country-font-body)",
                      color: group.peopleId
                        ? "var(--accent-ink)"
                        : "var(--country-text)",
                    }}
                  >
                    {group.label}
                  </span>
                );

                return group.peopleId ? (
                  <Link
                    key={index}
                    href={getPeopleRoute(language, group.peopleId)}
                    data-ethnicity-card="true"
                    className={cn(
                      GROUP_CHIP_CLASS,
                      "no-underline hover:underline focus-visible:underline underline-offset-4",
                      CHARTER_FOCUS_RING
                    )}
                    style={GROUP_CHIP_STYLE}
                  >
                    {label}
                  </Link>
                ) : (
                  <div
                    key={index}
                    data-ethnicity-card="true"
                    className={GROUP_CHIP_CLASS}
                    style={GROUP_CHIP_STYLE}
                  >
                    {label}
                  </div>
                );
              })}
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
