import { logger } from "@/lib/api/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SourceTier } from "@/types/sources";

const SOURCE_COLUMNS =
  "id, source_key, title, author, year, source_kind, tier, identifiers, publisher, url";
const WORKING_ASSET_BUCKET = "source-working-assets";

export type ReferenceSourceKind =
  | "intergovernmental"
  | "government"
  | "official_statistics"
  | "linguistic_reference"
  | "academic"
  | "community"
  | "repository"
  | "archive";

export type ReferenceLocatorType = "page" | "folio" | "section" | "timestamp";
export type WorkingAssetKind = "scan" | "ocr";

export interface ReferenceCreateInput {
  sourceKey: string;
  title: string;
  authors: string[];
  publicationYear: number;
  sourceKind: ReferenceSourceKind;
  tier: SourceTier;
  identifiers: Record<string, string>;
  publisher: string | null;
  url: string | null;
}

export interface ReferenceSource {
  id: string;
  source_key: string;
  title: string;
  author: string;
  year: number;
  source_kind: ReferenceSourceKind;
  tier: SourceTier;
  identifiers: Record<string, string>;
  publisher: string | null;
  url: string | null;
}

export interface ReferenceCreateResult {
  source: ReferenceSource;
  created: boolean;
}

export interface AssertionReferenceInput {
  locatorType: ReferenceLocatorType;
  locatorValue: string;
}

export interface CreatedAssertionReference {
  id: string;
  assertion_id: string;
  source_id: string;
  locator_type: ReferenceLocatorType;
  locator_value: string;
  review_status: "verified" | "review_required";
}

export interface ReferenceWorkingAssetInput {
  sourceId: string;
  assetKind: WorkingAssetKind;
  filename: string;
  contentType: string;
  byteSize: number;
  content: Uint8Array | ArrayBuffer | Blob;
}

export interface PrivateWorkingAsset {
  id: string;
  sourceId: string;
  assetKind: WorkingAssetKind;
  filename: string;
  contentType: string;
  byteSize: number;
  rightsStatus: "private";
  createdAt: string;
}

// @req REQ-093
export async function getAuthenticatedReferenceUser(
  accessToken: string
): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    if (error) {
      logger.error("Failed to authenticate reference contributor", error);
    }
    return null;
  }

  return { id: user.id };
}

// @req REQ-093
export async function searchReferences(
  search: string,
  limit: number
): Promise<ReferenceSource[]> {
  const term = escapeSearchTerm(search);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sources")
    .select(SOURCE_COLUMNS)
    .or(
      [
        `title.ilike.%${term}%`,
        `author.ilike.%${term}%`,
        `publisher.ilike.%${term}%`,
        `identifiers::text.ilike.%${term}%`,
      ].join(",")
    )
    .order("title")
    .limit(limit);

  if (error) {
    logger.error("Failed to search references", error);
    throw new Error(`Failed to search references: ${error.message}`);
  }

  return data ?? [];
}

// @req REQ-093
export async function createReference(
  input: ReferenceCreateInput
): Promise<ReferenceCreateResult> {
  const supabase = createAdminClient();
  const author = input.authors.join("; ");
  const existingByKey = await findReferenceBySourceKey(
    supabase,
    input.sourceKey
  );
  if (existingByKey) {
    return { source: existingByKey, created: false };
  }

  const existingByBibliography = await findReferenceByBibliography(
    supabase,
    input.title,
    author,
    input.publicationYear
  );
  if (existingByBibliography) {
    return { source: existingByBibliography, created: false };
  }

  const { data, error } = await supabase
    .from("sources")
    .insert({
      source_key: input.sourceKey,
      title: input.title,
      author,
      year: input.publicationYear,
      source_kind: input.sourceKind,
      tier: input.tier,
      identifiers: input.identifiers,
      publisher: input.publisher,
      url: input.url,
    })
    .select(SOURCE_COLUMNS)
    .single();

  if (error) {
    logger.error("Failed to create reference", error);
    throw new Error(`Failed to create reference: ${error.message}`);
  }

  return { source: data, created: true };
}

// @req REQ-093
export async function linkReferenceToAssertion(
  assertionId: string,
  sourceId: string,
  locator: AssertionReferenceInput
): Promise<CreatedAssertionReference> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("assertion_references")
    .insert({
      assertion_id: assertionId,
      source_id: sourceId,
      locator_type: locator.locatorType,
      locator_value: locator.locatorValue,
      review_status: "verified",
    })
    .select(
      "id, assertion_id, source_id, locator_type, locator_value, review_status"
    )
    .single();

  if (error) {
    logger.error("Failed to link reference to assertion", error);
    throw new Error(`Failed to link reference to assertion: ${error.message}`);
  }

  return data;
}

// @req REQ-093
export async function storeReferenceWorkingAsset(
  ownerId: string,
  input: ReferenceWorkingAssetInput
): Promise<PrivateWorkingAsset> {
  const supabase = createAdminClient();
  const filename = sanitizeFilename(input.filename);
  const objectPath = `${ownerId}/${crypto.randomUUID()}-${filename}`;
  const storage = supabase.storage.from(WORKING_ASSET_BUCKET);
  const { error: uploadError } = await storage.upload(
    objectPath,
    input.content,
    {
      contentType: input.contentType,
      upsert: false,
    }
  );

  if (uploadError) {
    logger.error("Failed to upload reference working asset", uploadError);
    throw new Error(
      `Failed to upload reference working asset: ${uploadError.message}`
    );
  }

  const { data, error } = await supabase
    .from("source_working_assets")
    .insert({
      source_id: input.sourceId,
      owner_id: ownerId,
      asset_kind: input.assetKind,
      bucket_id: WORKING_ASSET_BUCKET,
      object_path: objectPath,
      filename,
      content_type: input.contentType,
      byte_size: input.byteSize,
      rights_status: "private",
    })
    .select(
      "id, source_id, owner_id, asset_kind, filename, content_type, byte_size, rights_status, created_at"
    )
    .single();

  if (error) {
    await storage.remove([objectPath]);
    logger.error("Failed to persist reference working asset metadata", error);
    throw new Error(
      `Failed to persist reference working asset metadata: ${error.message}`
    );
  }

  return {
    id: data.id,
    sourceId: data.source_id,
    assetKind: data.asset_kind,
    filename: data.filename,
    contentType: data.content_type,
    byteSize: data.byte_size,
    rightsStatus: "private",
    createdAt: data.created_at,
  };
}

async function findReferenceBySourceKey(
  supabase: ReturnType<typeof createAdminClient>,
  sourceKey: string
): Promise<ReferenceSource | null> {
  const { data, error } = await supabase
    .from("sources")
    .select(SOURCE_COLUMNS)
    .eq("source_key", sourceKey)
    .maybeSingle();

  if (error) {
    logger.error("Failed to find reference by source key", error);
    throw new Error(`Failed to find reference by source key: ${error.message}`);
  }

  return data;
}

async function findReferenceByBibliography(
  supabase: ReturnType<typeof createAdminClient>,
  title: string,
  author: string,
  year: number
): Promise<ReferenceSource | null> {
  const { data, error } = await supabase
    .from("sources")
    .select(SOURCE_COLUMNS)
    .eq("title", title)
    .eq("author", author)
    .eq("year", year)
    .maybeSingle();

  if (error) {
    logger.error("Failed to find reference by bibliography", error);
    throw new Error(
      `Failed to find reference by bibliography: ${error.message}`
    );
  }

  return data;
}

function escapeSearchTerm(value: string): string {
  return value.replace(/[%,()]/g, " ").trim();
}

function sanitizeFilename(filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || "asset";
}
