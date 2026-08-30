import type { PeopleHistoryData } from "@/lib/peopleDataTransformer";
import { ProseWithChip } from "./ProseWithChip";
import type { HistoryChips } from "./ProseWithChip";

interface PeopleHistoryTimelineProps {
  data: PeopleHistoryData;
  chips?: HistoryChips;
}

// @req REQ-003
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
    <dl className="afh-prose-fields space-y-[14px]">
      {data.kingdomsOrChiefdoms && (
        <div>
          <dt className="people-section-label">Royaumes &amp; chefferies</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              text={data.kingdomsOrChiefdoms}
              chip={chips?.kingdomsOrChiefdoms}
            />
          </dd>
        </div>
      )}

      {data.relationsWithNeighbors && (
        <div>
          <dt className="people-section-label">Relations avec les voisins</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              text={data.relationsWithNeighbors}
              chip={chips?.relationsWithNeighbors}
            />
          </dd>
        </div>
      )}

      {data.conflictsOrAlliances && (
        <div>
          <dt className="people-section-label">Conflits &amp; alliances</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              text={data.conflictsOrAlliances}
              chip={chips?.conflictsOrAlliances}
            />
          </dd>
        </div>
      )}

      {data.diaspora && (
        <div>
          <dt className="people-section-label">Diaspora</dt>
          <dd className="afh-prose-def">
            <ProseWithChip text={data.diaspora} chip={chips?.diaspora} />
          </dd>
        </div>
      )}
    </dl>
  );
}
