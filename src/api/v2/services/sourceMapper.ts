import type { Source } from "@/api/v2/schemas/sources";
import {
  evaluateSourceUrl,
  sourceKindSchema,
} from "@/lib/sources/authorized-source-catalog";
import { isSourceTier } from "@/types/sources";

/**
 * The single place that knows the `sources` column layout.
 *
 * Its own module rather than a member of either service: both the public
 * endpoint and the directory facet build their own narrowed queries, and a
 * second opinion about what a row means is exactly how `lastVerifiedAt` came
 * to read one column in one place and a non-existent one in another. Keeping
 * it here also keeps the two services from importing each other.
 */
// @req REQ-092
export function mapRowToSource(row: Record<string, unknown>): Source {
  const rawSourceKind = row.source_kind as string | null | undefined;
  const rawIdentifiers = row.identifiers;
  const url = typeof row.url === "string" ? row.url : null;
  const sourceKindResult = sourceKindOf(rawSourceKind);
  // An untiered legacy row stays null here rather than being coerced: the
  // payload distinguishes "not yet classified" from "classified unverified".
  const tier = isSourceTier(row.tier) ? row.tier : null;
  const identifiers =
    rawIdentifiers &&
    typeof rawIdentifiers === "object" &&
    !Array.isArray(rawIdentifiers)
      ? Object.fromEntries(
          Object.entries(rawIdentifiers).filter(
            ([, value]) => typeof value === "string"
          )
        )
      : null;

  return {
    id: row.id as string,
    sourceKey: (row.source_key as string | null) ?? null,
    sourceKind: sourceKindResult,
    tier,
    identifiers,
    title: (row.title as string) ?? "",
    url,
    pinnedUrl: (row.pinned_url as string | null) ?? null,
    year: (row.year as number | null) ?? null,
    author: (row.author as string | null) ?? null,
    publisher: (row.publisher as string | null) ?? null,
    resolvable: (row.resolvable as boolean | null) ?? null,
    // `verified_at` is the column; `last_verified_at` never existed, so this
    // field reported null however recently a source had been checked.
    lastVerifiedAt: (row.verified_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    page: (row.page as string | null) ?? null,
    addedAt: (row.added_at as string | null) ?? null,
    policy: evaluateSourceUrl(url ?? ""),
  };
}

function sourceKindOf(value: string | null | undefined): Source["sourceKind"] {
  const parsed = sourceKindSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
