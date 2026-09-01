import type { PatronymeAggregate } from "@/api/v2/services/patronymes";
import type {
  PatronymeBearerSummary,
  PatronymeCountrySummary,
  PatronymePeopleSummary,
  PublicPatronyme,
} from "@/api/v2/schemas/patronymes";

function comparePeoples(
  left: PatronymePeopleSummary,
  right: PatronymePeopleSummary
): number {
  return (
    left.nameMain.localeCompare(right.nameMain, "fr") ||
    left.id.localeCompare(right.id, "en")
  );
}

function compareCountries(
  left: PatronymeCountrySummary,
  right: PatronymeCountrySummary
): number {
  return (
    left.nameFr.localeCompare(right.nameFr, "fr") ||
    left.id.localeCompare(right.id, "en")
  );
}

function compareBearers(
  left: PatronymeBearerSummary,
  right: PatronymeBearerSummary
): number {
  return (
    left.fullName.localeCompare(right.fullName, "fr") ||
    left.id.localeCompare(right.id, "en")
  );
}

/**
 * A bearer entry is rebuilt field-by-field rather than spread, so an
 * aggregate that somehow carries extra data (a future service bug, a
 * malformed upstream row) can never leak an ethnic-origin-adjacent field
 * into the response — DEC-040.
 */
function serializeBearer(
  bearer: PatronymeBearerSummary
): PatronymeBearerSummary {
  return {
    id: bearer.id,
    fullName: bearer.fullName,
    roleCategory: bearer.roleCategory,
  };
}

// @req REQ-133
export function serializePatronyme(
  aggregate: PatronymeAggregate
): PublicPatronyme {
  return {
    id: aggregate.id,
    nameMain: aggregate.nameMain,
    nameSystem: aggregate.nameSystem,
    casteOrSocialFunction: aggregate.casteOrSocialFunction,
    content: aggregate.content,
    associatedPeoples: [...aggregate.associatedPeoples].sort(comparePeoples),
    associatedCountries: [...aggregate.associatedCountries].sort(
      compareCountries
    ),
    bearers: [...aggregate.bearers].sort(compareBearers).map(serializeBearer),
  };
}
