import { logger } from "@/lib/api/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export type FlagKind =
  | "inaccurate"
  | "missing-source"
  | "broken-url"
  | "offensive"
  | "correction-proposal"
  | "other";

export type FlagStatus =
  | "open"
  | "under_review"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "duplicate";

export interface FlagCreateInput {
  target_type: string;
  target_id: string;
  target_field_path?: string;
  flag_kind: FlagKind;
  reason_text: string;
  counter_source_url?: string;
  counter_source_citation?: string;
  proposed_rewrite?: string;
}

export interface CreatedFlag {
  id: string;
  public_slug: string;
  status: FlagStatus;
  created_at: string;
}

export interface PublicFlag {
  id: string;
  public_slug: string;
  target_type: string | null;
  target_id: string | null;
  target_field_path: string | null;
  assertion_id: string | null;
  flag_kind: FlagKind;
  reason_text: string | null;
  counter_source_url: string | null;
  counter_source_citation: string | null;
  proposed_rewrite: string | null;
  contributor_id: string | null;
  severity: "low" | "medium" | "high" | "critical" | null;
  auto_generated: boolean;
  status: FlagStatus;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
}

export interface FlagListFilters {
  status?: FlagStatus;
  kind?: FlagKind;
  target_type?: string;
  cursor?: string;
  limit: number;
}

export interface FlagListResult {
  items: PublicFlag[];
  next_cursor: string | null;
}

interface FlagRow {
  id: string;
  public_slug: string;
  entity_type: string | null;
  entity_id: string | null;
  assertion_field_path: string | null;
  assertion_id?: string | null;
  flag_kind: FlagKind;
  reason_text: string | null;
  counter_source_url: string | null;
  counter_source_citation: string | null;
  proposed_rewrite: string | null;
  contributor_id?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | null;
  auto_generated?: boolean;
  status: FlagStatus;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
}

const PUBLIC_FLAG_COLUMNS =
  "id, public_slug, entity_type, entity_id, assertion_field_path, assertion_id, flag_kind, reason_text, counter_source_url, counter_source_citation, proposed_rewrite, contributor_id, severity, auto_generated, status, created_at, updated_at, resolved_at";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

// @req REQ-012
export async function getAuthenticatedContributor(
  accessToken: string
): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    if (error) {
      logger.error("Failed to authenticate flag contributor", error);
    }
    return null;
  }

  return { id: user.id };
}

// @req REQ-012
export async function getAgeConfirmedAt(
  userId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contributor_profiles")
    .select("age_confirmed_at")
    .eq("id", userId)
    .single();

  if (error) {
    logger.error(
      "Failed to read contributor profile for age gate check",
      error
    );
    return null;
  }

  return data?.age_confirmed_at ?? null;
}

// @req REQ-012
export async function createFlag(
  contributorId: string,
  input: FlagCreateInput
): Promise<CreatedFlag> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("flags")
    .insert({
      entity_type: input.target_type,
      entity_id: input.target_id,
      assertion_field_path: input.target_field_path ?? null,
      flag_kind: input.flag_kind,
      reason_text: input.reason_text,
      counter_source_url: input.counter_source_url ?? null,
      counter_source_citation: input.counter_source_citation ?? null,
      proposed_rewrite: input.proposed_rewrite ?? null,
      contributor_id: contributorId,
      status: "open",
      turnstile_token_verified: true,
    })
    .select("id, public_slug, status, created_at")
    .single();

  if (error) {
    logger.error("Failed to create flag", error);
    throw new Error(`Failed to create flag: ${error.message}`);
  }

  return data;
}

// @req REQ-014
export function encodeFlagCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString("base64url");
}

// @req REQ-014
export function decodeFlagCursor(
  cursor: string
): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const separatorIndex = decoded.indexOf("|");
    if (separatorIndex < 0) return null;

    const createdAt = decoded.slice(0, separatorIndex);
    const id = decoded.slice(separatorIndex + 1);
    if (
      !ISO_TIMESTAMP_PATTERN.test(createdAt) ||
      !Number.isFinite(Date.parse(createdAt)) ||
      !UUID_PATTERN.test(id)
    ) {
      return null;
    }

    return { createdAt, id };
  } catch {
    return null;
  }
}

// @req REQ-014
export async function listFlags(
  filters: FlagListFilters
): Promise<FlagListResult> {
  const supabase = createAdminClient();
  let query = supabase
    .from("flags")
    .select(PUBLIC_FLAG_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(filters.limit + 1);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.kind) {
    query = query.eq("flag_kind", filters.kind);
  }
  if (filters.target_type) {
    query = query.eq("entity_type", filters.target_type);
  }
  if (filters.cursor) {
    const decoded = decodeFlagCursor(filters.cursor);
    if (decoded) {
      query = query.or(
        `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to list flags", error);
    throw new Error(`Failed to list flags: ${error.message}`);
  }

  const rows: FlagRow[] = data ?? [];
  const hasMore = rows.length > filters.limit;
  const pageRows = hasMore ? rows.slice(0, filters.limit) : rows;
  const items = pageRows.map(mapFlagRow);
  const lastRow = pageRows[pageRows.length - 1];

  return {
    items,
    next_cursor:
      hasMore && lastRow
        ? encodeFlagCursor(lastRow.created_at, lastRow.id)
        : null,
  };
}

// @req REQ-014
export async function getFlagByIdOrSlug(
  identifier: string
): Promise<PublicFlag | null> {
  const supabase = createAdminClient();
  let query = supabase.from("flags").select(PUBLIC_FLAG_COLUMNS);
  query = UUID_PATTERN.test(identifier)
    ? query.eq("id", identifier)
    : query.eq("public_slug", identifier);

  const { data, error } = await query.maybeSingle();

  if (error) {
    logger.error("Failed to get flag", error, { identifier });
    throw new Error(`Failed to get flag: ${error.message}`);
  }

  return data ? mapFlagRow(data) : null;
}

function mapFlagRow(row: FlagRow): PublicFlag {
  return {
    id: row.id,
    public_slug: row.public_slug,
    target_type: row.entity_type,
    target_id: row.entity_id,
    target_field_path: row.assertion_field_path,
    assertion_id: row.assertion_id ?? null,
    flag_kind: row.flag_kind,
    reason_text: row.reason_text,
    counter_source_url: row.counter_source_url,
    counter_source_citation: row.counter_source_citation,
    proposed_rewrite: row.proposed_rewrite,
    contributor_id: row.contributor_id ?? null,
    severity: row.severity ?? null,
    auto_generated: row.auto_generated ?? false,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    resolved_at: row.resolved_at,
  };
}
