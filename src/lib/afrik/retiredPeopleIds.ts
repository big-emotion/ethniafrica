import retiredIdentifiers from "../../../dataset/source/afrik/_retired-identifiers.json";

/**
 * A people identifier the corpus no longer publishes, and the fiche that took
 * its place. Sourced from the editorial ledger itself rather than a hand-kept
 * copy: the ledger is where a merge or rename is decided, and a second list
 * would drift the first time someone updated one and not the other.
 *
 * Only merged and renamed entries appear here. A kept-distinct decision
 * records why two ids stay separate and redirects nothing.
 */
// @req REQ-027
export const RETIRED_PEOPLE_IDS: Readonly<Record<string, string>> =
  Object.fromEntries(
    retiredIdentifiers
      .filter(
        (
          entry
        ): entry is (typeof retiredIdentifiers)[number] & {
          successorId: string;
        } =>
          entry.decision !== "kept-distinct" &&
          typeof entry.successorId === "string"
      )
      .map((entry) => [entry.retiredId, entry.successorId])
  );
