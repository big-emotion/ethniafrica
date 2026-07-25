"use server";

import {
  getPublicFlagsPage,
  isValidPublicFlagsCursor,
  type PublicFlagKind,
  type PublicFlagsPage,
  type PublicFlagsPageOptions,
  type PublicFlagStatus,
  type PublicFlagTargetType,
} from "@/lib/supabase/queries/flags/getPublicFlagsPage";

const PUBLIC_STATUSES = new Set<PublicFlagStatus>([
  "open",
  "under_review",
  "accepted",
  "rejected",
  "withdrawn",
  "duplicate",
]);
const PUBLIC_KINDS = new Set<PublicFlagKind>([
  "inaccurate",
  "missing-source",
  "broken-url",
  "offensive",
  "correction-proposal",
  "other",
]);
const PUBLIC_TARGET_TYPES = new Set<PublicFlagTargetType>([
  "assertion",
  "source",
  "fiche_section",
  "classification",
]);

function allowedValues<T extends string>(
  values: T[] | undefined,
  allowed: Set<T>
): T[] {
  const candidates = Array.isArray(values) ? values : [];
  return [...new Set(candidates)].filter((value) => allowed.has(value));
}

// @req REQ-014
export async function loadPublicFlagsPage(
  options: PublicFlagsPageOptions
): Promise<PublicFlagsPage> {
  const requestedPageSize = Number.isFinite(options.pageSize)
    ? Math.floor(options.pageSize ?? 50)
    : 50;

  return getPublicFlagsPage({
    statuses: allowedValues(options.statuses, PUBLIC_STATUSES),
    kinds: allowedValues(options.kinds, PUBLIC_KINDS),
    targetTypes: allowedValues(options.targetTypes, PUBLIC_TARGET_TYPES),
    cursor:
      typeof options.cursor === "string" &&
      isValidPublicFlagsCursor(options.cursor)
        ? options.cursor
        : undefined,
    pageSize: Math.min(50, Math.max(1, requestedPageSize)),
  });
}
