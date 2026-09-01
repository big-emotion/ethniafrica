import { logger } from "@/lib/api/logger";
import { isEmailAllowlisted } from "@/lib/auth/adminAllowlist";
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
  /** Null for an anonymous report — see moderation-charter.md §2. */
  contributorId: string | null,
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
      human_verified: true,
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

/**
 * The moderator behind a bearer token, or null.
 *
 * `getModeratorSession` in src/lib/supabase/moderator.ts answers the same
 * question for a Server Component and `redirect()`s when the answer is no —
 * which an API route must not do. This is its non-redirecting twin, and it
 * consults the same allowlist, so the two cannot drift on who counts as a
 * moderator.
 *
 * It used to read `contributor_profiles.moderator_role`, hedged across two
 * columns (`.or(id.eq…, user_id.eq…)`) because the sign-in wrote one and every
 * reader queried the other. That whole model is gone with the public accounts:
 * authorization is the address, and the address is on the allowlist or it is
 * not.
 */
// @req REQ-042
export async function getModeratorByAccessToken(
  accessToken: string
): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    if (error) logger.error("Failed to authenticate moderator", error);
    return null;
  }

  return (await isEmailAllowlisted(user.email)) ? { id: user.id } : null;
}

/**
 * Drive one flag through the state machine.
 *
 * The transition itself is validated by Postgres — `flags_enforce_state_machine`
 * raises on anything the charter's diagram does not allow — so this does not
 * re-implement the rules. It reports the refusal rather than pre-empting it,
 * which keeps one definition of the machine instead of two that can disagree.
 *
 * Writes go through the service-role client because RLS gives a contributor no
 * path to a status change, by design: the authorization check is the handler's,
 * and it is the only one.
 */
// @req REQ-042
export async function transitionFlag(
  identifier: string,
  next: { status: FlagStatus; moderatorId: string; moderatorNotes?: string }
): Promise<
  | { ok: true; flag: PublicFlag; previousStatus: FlagStatus }
  | { ok: false; reason: "not_found" | "illegal_transition" }
> {
  const supabase = createAdminClient();

  const current = await getFlagByIdOrSlug(identifier);
  if (!current) return { ok: false, reason: "not_found" };

  const { data, error } = await supabase
    .from("flags")
    .update({
      status: next.status,
      moderator_id: next.moderatorId,
      ...(next.moderatorNotes === undefined
        ? {}
        : { moderator_notes: next.moderatorNotes }),
      ...(TERMINAL_STATUSES.includes(next.status)
        ? { resolved_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", current.id)
    .select(PUBLIC_FLAG_COLUMNS)
    .single();

  if (error) {
    // 23514 is the check_violation the state-machine trigger raises.
    if (error.code === "23514") {
      return { ok: false, reason: "illegal_transition" };
    }
    logger.error("Failed to transition flag", error, { id: current.id });
    throw error;
  }

  return {
    ok: true,
    flag: mapFlagRow(data),
    previousStatus: current.status,
  };
}

const TERMINAL_STATUSES: ReadonlyArray<FlagStatus> = [
  "accepted",
  "rejected",
  "withdrawn",
  "duplicate",
];

/**
 * The contributor's email for a resolution notification (ETNI-73).
 *
 * `flags.contributor_id` references `auth.users`, which carries no public
 * table of its own — the admin API is the only way to read an email off it,
 * and it is deliberately the service-role client, same as the rest of this
 * file's moderator-only reads.
 */
// @req REQ-015
export async function getContributorEmail(
  contributorId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(contributorId);

  if (error) {
    logger.error(
      "Failed to resolve contributor email for flag notification",
      error,
      { contributorId }
    );
    return null;
  }

  return data?.user?.email ?? null;
}

export interface ModerationQueueFilters {
  /** Absent or empty means every status — the console hides nothing by default. */
  statuses?: readonly FlagStatus[];
  kind?: FlagKind;
  entityType?: string;
  sort: "recent" | "oldest";
  /** 1-based, as it appears in the address. */
  page: number;
  pageSize: number;
}

export interface ModerationQueuePage {
  items: PublicFlag[];
  /** Reports in the current selection, not in the table behind it. */
  total: number;
}

/**
 * The console's reading of the queue.
 *
 * Distinct from `listFlags`, which serves the public API and pages by opaque
 * cursor. A moderator needs what a cursor cannot give: how many reports the
 * selection holds, and the ability to jump to a page rather than walk to it.
 * So this one pages by offset and asks for an exact count.
 *
 * It also defaults to *every* status. The queue used to serve `open` and
 * `under_review` only, which meant a moderator who had just accepted a report
 * could no longer find it, and nothing on screen said the other three states
 * existed.
 */
// @req REQ-042
export async function listFlagsForModeration(
  filters: ModerationQueueFilters
): Promise<ModerationQueuePage> {
  const supabase = createAdminClient();
  const page = Math.max(1, Math.trunc(filters.page) || 1);
  const from = (page - 1) * filters.pageSize;

  let query = supabase
    .from("flags")
    .select(PUBLIC_FLAG_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: filters.sort === "oldest" });

  if (filters.statuses?.length) {
    query = query.in("status", filters.statuses);
  }
  if (filters.kind) {
    query = query.eq("flag_kind", filters.kind);
  }
  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  const { data, count, error } = await query.range(
    from,
    from + filters.pageSize - 1
  );

  if (error) {
    // Never degrade to an empty page: a moderator would read "nothing to do".
    logger.error("Failed to read the moderation queue", error);
    throw new Error(`Failed to read the moderation queue: ${error.message}`);
  }

  return {
    items: (data ?? []).map(mapFlagRow),
    total: count ?? 0,
  };
}
