import { z } from "zod";

import { SOURCE_TIERS, sourceTierFromLegacyNumber } from "@/types/sources";

/**
 * The `tier` field of a fiche source entry.
 *
 * Accepts the retired numeric axis (`1` / `2`) as well as the tier vocabulary,
 * normalising both to a `SourceTier`, because the AFRIK corpus in
 * `dataset/source/afrik/` is reclassified separately from this code. Drop the
 * numeric branch once no fiche carries a numeric tier any more.
 */
export const ficheSourceTierSchema = z.union(
  [
    z.enum(SOURCE_TIERS),
    z
      .union([z.literal(1), z.literal(2)])
      .transform((value) => sourceTierFromLegacyNumber(value)),
  ],
  {
    errorMap: () => ({
      message: `tier must be one of ${SOURCE_TIERS.join(", ")}`,
    }),
  }
);
