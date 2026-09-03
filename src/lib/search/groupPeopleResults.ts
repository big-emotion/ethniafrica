/**
 * Groups split fiches of the same people together at display time (ETNI-1391).
 *
 * The corpus records "Peul" and "Peul du Massina" as two separate `PPL_*`
 * fiches — each with its own sources, demography and history — because they
 * are genuinely distinct editorial units. But a reader searching "Peul" does
 * not want two unrelated-looking cards; they want one people, shown as split.
 * `content.appellations.peopleGroupId` is the fiche-level opt-in that marks
 * "these fiches are one people, split"; grouping is applied only here, at
 * display time, so the underlying fiches and their sourcing stay untouched.
 *
 * A group of one is not a group: if only one split fiche of a people matched
 * the search, showing it as a lone card is more honest than a group badge
 * that promises siblings the reader will not find.
 */

import type { SearchResult } from "@/types/afrik-frontend";

export interface PeopleGroup {
  type: "peopleGroup";
  peopleGroupId: string;
  peopleGroupLabel: string;
  members: SearchResult[];
}

export type GroupedSearchResult = SearchResult | PeopleGroup;

// @req REQ-002
export function groupPeopleResults(
  results: SearchResult[]
): GroupedSearchResult[] {
  const groups = new Map<string, PeopleGroup>();
  const output: GroupedSearchResult[] = [];

  for (const result of results) {
    if (result.type !== "people" || !result.peopleGroupId) {
      output.push(result);
      continue;
    }

    const existing = groups.get(result.peopleGroupId);
    if (existing) {
      existing.members.push(result);
      continue;
    }

    const group: PeopleGroup = {
      type: "peopleGroup",
      peopleGroupId: result.peopleGroupId,
      peopleGroupLabel: result.peopleGroupLabel ?? result.name,
      members: [result],
    };
    groups.set(result.peopleGroupId, group);
    output.push(group);
  }

  return output.flatMap((entry) =>
    entry.type === "peopleGroup" && entry.members.length < 2
      ? entry.members
      : [entry]
  );
}
