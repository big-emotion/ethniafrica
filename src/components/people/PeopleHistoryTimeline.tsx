import type { PeopleHistoryData } from "@/lib/peopleDataTransformer";
import { ProseWithChip } from "./ProseWithChip";
import type { HistoryChips } from "./ProseWithChip";

interface PeopleHistoryTimelineProps {
  data: PeopleHistoryData;
  chips?: HistoryChips;
}

export function PeopleHistoryTimeline({
  data,
  chips,
}: PeopleHistoryTimelineProps) {
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
          <ProseWithChip
            text={data.kingdomsOrChiefdoms}
            chip={chips?.kingdomsOrChiefdoms}
          />
        </div>
      )}

      {data.relationsWithNeighbors && (
        <div>
          <p className="people-section-label">Relations avec les voisins</p>
          <ProseWithChip
            text={data.relationsWithNeighbors}
            chip={chips?.relationsWithNeighbors}
          />
        </div>
      )}

      {data.conflictsOrAlliances && (
        <div>
          <p className="people-section-label">Conflits & alliances</p>
          <ProseWithChip
            text={data.conflictsOrAlliances}
            chip={chips?.conflictsOrAlliances}
          />
        </div>
      )}

      {data.diaspora && (
        <div>
          <p className="people-section-label">Diaspora</p>
          <ProseWithChip text={data.diaspora} chip={chips?.diaspora} />
        </div>
      )}
    </div>
  );
}
