import type { PeopleHistoryData } from "@/lib/peopleDataTransformer";

interface PeopleHistoryTimelineProps {
  data: PeopleHistoryData;
}

export function PeopleHistoryTimeline({ data }: PeopleHistoryTimelineProps) {
  const hasContent =
    data.kingdomsOrChiefdoms ||
    data.relationsWithNeighbors ||
    data.conflictsOrAlliances ||
    data.diaspora;

  if (!hasContent) return null;

  return (
    <div className="space-y-[14px]">
      {data.kingdomsOrChiefdoms && (
        <div>
          <p className="people-section-label">Royaumes & chefferies</p>
          <p className="people-section-body">{data.kingdomsOrChiefdoms}</p>
        </div>
      )}

      {data.relationsWithNeighbors && (
        <div>
          <p className="people-section-label">Relations avec les voisins</p>
          <p className="people-section-body">{data.relationsWithNeighbors}</p>
        </div>
      )}

      {data.conflictsOrAlliances && (
        <div>
          <p className="people-section-label">Conflits & alliances</p>
          <p className="people-section-body">{data.conflictsOrAlliances}</p>
        </div>
      )}

      {data.diaspora && (
        <div>
          <p className="people-section-label">Diaspora</p>
          <p className="people-section-body">{data.diaspora}</p>
        </div>
      )}
    </div>
  );
}
