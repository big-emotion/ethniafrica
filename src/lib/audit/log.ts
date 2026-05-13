/**
 * Audit log emission helper.
 *
 * Writes a row to the `audit_log` table (created by migration
 * `008_module_zero_fabric.sql`). The table is protected by RLS — only admins
 * can SELECT and writes are denied by default — so this helper uses the
 * admin (service-role) Supabase client.
 *
 * Failures are swallowed by design: an audit failure must never break the
 * underlying privileged action. Errors are surfaced via the project logger.
 *
 * Story: ETNI-176 / AR25, AR28, NFR42.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/api/logger";
import { truncateIp } from "./ip";

export type AuditLogInput = {
  /** UUID of the acting user, or null for unauthenticated / system actions. */
  actorId: string | null;
  /** Dot-namespaced action name, e.g. "contribution.approve". */
  action: string;
  /** Logical entity affected: "contribution" | "user" | "api_key" | ... */
  targetType?: string;
  /** Identifier of the target entity (UUID, ISO code, slug, ...). */
  targetId?: string;
  /** Serializable JSON snapshot of the entity before the change. */
  before?: unknown;
  /** Serializable JSON snapshot of the entity after the change. */
  after?: unknown;
  /** Raw client IP — will be truncated to /24 (v4) or /48 (v6). */
  ip?: string | null;
  /** Raw User-Agent header value. */
  userAgent?: string | null;
};

type AuditLogRow = {
  action: string;
  entity_type?: string;
  entity_id?: string;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
};

function buildMetadata(
  input: Pick<AuditLogInput, "before" | "after" | "userAgent">
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  if (input.before !== undefined) {
    metadata.before = input.before;
  }
  if (input.after !== undefined) {
    metadata.after = input.after;
  }
  if (input.userAgent !== undefined && input.userAgent !== null) {
    metadata.userAgent = input.userAgent;
  }
  return metadata;
}

function buildRow(input: AuditLogInput): AuditLogRow {
  const row: AuditLogRow = {
    action: input.action,
    actor_id: input.actorId,
    metadata: buildMetadata(input),
    ip_address: truncateIp(input.ip),
  };

  if (input.targetType !== undefined) {
    row.entity_type = input.targetType;
  }
  if (input.targetId !== undefined) {
    row.entity_id = input.targetId;
  }

  return row;
}

async function write(input: AuditLogInput): Promise<void> {
  let row: AuditLogRow;
  try {
    row = buildRow(input);
  } catch (buildError) {
    logger.error("Failed to build audit_log row", buildError, {
      action: input.action,
    });
    return;
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_log").insert(row);
    if (error) {
      logger.error("Failed to insert audit_log row", error, {
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
      });
    }
  } catch (insertError) {
    logger.error("Audit log write threw", insertError, {
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
    });
  }
}

export const auditLog = {
  write,
};
