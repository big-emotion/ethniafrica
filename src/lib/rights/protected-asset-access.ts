// @req REQ-096
export const PROTECTED_ASSET_SIGNED_URL_TTL_SECONDS = 300;

type QueryResult = {
  data: unknown;
  error: unknown;
};

type Query = {
  select(columns: string): {
    eq(
      column: string,
      value: string
    ): {
      maybeSingle(): Promise<QueryResult>;
    };
  };
  insert(values: Record<string, unknown>): Promise<QueryResult>;
};

export type ProtectedAssetAccessClient = {
  from(table: string): Query;
  storage: {
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number
      ): Promise<{ data: unknown; error: unknown }>;
    };
  };
};

export type ProtectedAssetAccessInput = {
  client: ProtectedAssetAccessClient;
  actorId: string;
  recordId: string;
  now?: Date;
};

type UnknownRecord = Record<string, unknown>;
type SignableProtectedAsset = UnknownRecord & {
  storage_bucket: string;
  storage_path: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasEditorialRole(value: unknown): boolean {
  return (
    isRecord(value) && (value.role === "moderator" || value.role === "admin")
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isEffectiveDate(value: unknown, now: Date): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (!isNonEmptyString(value)) {
    return true;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) || time <= now.getTime();
}

function isEmbargoActive(value: unknown, now: Date): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (!isNonEmptyString(value)) {
    return true;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) || time > now.getTime();
}

function hasActiveConsent(value: UnknownRecord, now: Date): boolean {
  return (
    (value.consent_scope === "editorial" || value.consent_scope === "public") &&
    isRecord(value.consent_evidence) &&
    Object.keys(value.consent_evidence).length > 0 &&
    !isEffectiveDate(value.withdrawn_at, now) &&
    !isEffectiveDate(value.retention_until, now)
  );
}

function canIssueSignedUrl(
  value: unknown,
  now: Date
): value is SignableProtectedAsset {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.record_type === "reference_asset" &&
    isNonEmptyString(value.storage_bucket) &&
    isNonEmptyString(value.storage_path) &&
    isNonEmptyString(value.rights_basis) &&
    value.community_review_status === "approved" &&
    hasActiveConsent(value, now) &&
    !isEmbargoActive(value.embargo_until, now)
  );
}

function hasSignedUrl(value: unknown): value is { signedUrl: string } {
  return isRecord(value) && isNonEmptyString(value.signedUrl);
}

/**
 * Grants a short-lived download URL only after server-side authorization and
 * protected-record state checks have succeeded.
 */
// @req REQ-096
export async function issueProtectedAssetSignedUrl({
  client,
  actorId,
  recordId,
  now = new Date(),
}: ProtectedAssetAccessInput): Promise<string | null> {
  try {
    const roleResult = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", actorId)
      .maybeSingle();

    if (roleResult.error || !hasEditorialRole(roleResult.data)) {
      return null;
    }

    const recordResult = await client
      .from("protected_records")
      .select(
        "record_type, storage_bucket, storage_path, rights_basis, consent_scope, consent_evidence, embargo_until, retention_until, withdrawn_at, community_review_status"
      )
      .eq("id", recordId)
      .maybeSingle();

    if (recordResult.error || !canIssueSignedUrl(recordResult.data, now)) {
      return null;
    }

    const auditResult = await client.from("protected_record_audit").insert({
      protected_record_id: recordId,
      actor_id: actorId,
      action: "protected_record.access_authorized",
    });

    if (auditResult.error) {
      return null;
    }

    const signedUrlResult = await client.storage
      .from(recordResult.data.storage_bucket)
      .createSignedUrl(
        recordResult.data.storage_path,
        PROTECTED_ASSET_SIGNED_URL_TTL_SECONDS
      );

    return signedUrlResult.error || !hasSignedUrl(signedUrlResult.data)
      ? null
      : signedUrlResult.data.signedUrl;
  } catch {
    return null;
  }
}
