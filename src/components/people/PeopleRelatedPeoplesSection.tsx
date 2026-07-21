import type { PeopleRelatedData } from "@/lib/peopleDataTransformer";

interface PeopleRelatedPeoplesSectionProps {
  data: PeopleRelatedData;
}

export function PeopleRelatedPeoplesSection({
  data,
}: PeopleRelatedPeoplesSectionProps) {
  const hasContent =
    data.ethnicities.length > 0 ||
    data.politicalSystem ||
    data.clanOrganization ||
    data.ageClassSystems;

  if (!hasContent) return null;

  return (
    <div className="space-y-[14px]">
      {data.ethnicities.length > 0 && (
        <div>
          <p className="people-section-label">Groupes ethniques</p>
          <div className="flex flex-wrap gap-[6px] mt-[4px]">
            {data.ethnicities.map((e, i) => (
              <span key={i} className="people-tag">
                {e}
              </span>
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
    </div>
  );
}
