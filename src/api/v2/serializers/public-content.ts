const PROTECTED_FIELD_NAMES = new Set([
  "storage_bucket",
  "storage_path",
  "signed_url",
  "consent_evidence",
  "consent_document",
  "consent_documents",
  "consent_form",
  "restricted_transcript",
  "private_transcript",
  "private_identity",
  "speaker_identity",
  "narrator_identity",
  "contributor_id",
  "contributor_email",
  "actor_id",
  "moderator_id",
  "owner_id",
  "user_id",
  "legal_name",
  "identity_document",
  "identity_number",
  "email",
  "phone",
  "address",
  "date_of_birth",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFieldName(fieldName: string): string {
  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function isProtectedField(fieldName: string): boolean {
  const normalized = normalizeFieldName(fieldName);
  return (
    PROTECTED_FIELD_NAMES.has(normalized) ||
    normalized.startsWith("signed_") ||
    normalized.startsWith("consent_evidence_") ||
    normalized.startsWith("consent_document_") ||
    normalized.endsWith("_email") ||
    normalized.endsWith("_phone") ||
    normalized.endsWith("_address")
  );
}

function serializeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (isRecord(value)) {
    return serializePublicContent(value);
  }

  return value;
}

// @req REQ-096
export function serializePublicContent(
  content: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(content)
      .filter(([fieldName]) => !isProtectedField(fieldName))
      .map(([fieldName, value]) => [fieldName, serializeValue(value)])
  );
}
