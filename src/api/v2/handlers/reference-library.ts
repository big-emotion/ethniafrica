import { z } from "zod";
import {
  createReference,
  getAuthenticatedReferenceUser,
  linkReferenceToAssertion,
  searchReferences,
  storeReferenceWorkingAsset,
  type AssertionReferenceInput,
  type CreatedAssertionReference,
  type PrivateWorkingAsset,
  type ReferenceCreateInput,
  type ReferenceCreateResult,
  type ReferenceSource,
  type ReferenceWorkingAssetInput,
} from "@/api/v2/services/reference-library";
import {
  createApiError,
  createApiResponse,
  type ApiEnvelope,
  type ApiError,
} from "@/api/v2/utils/response";
import { sourceTierSchema } from "@/lib/sources/authorized-source-catalog";

const sourceKinds = [
  "intergovernmental",
  "government",
  "official_statistics",
  "linguistic_reference",
  "academic",
  "community",
  "repository",
  "archive",
] as const;

const locatorTypes = ["page", "folio", "section", "timestamp"] as const;
const assetKinds = ["scan", "ocr"] as const;
const requiredString = z.string().trim().min(1);
const uuid = z.string().uuid();

// @req REQ-012
export const referenceSearchSchema = z.object({
  q: requiredString.max(200),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// @req REQ-012
export const referenceCreateSchema = z.object({
  source_key: requiredString.max(160),
  title: requiredString.max(1000),
  authors: z.array(requiredString.max(300)).min(1).max(20),
  publication_year: z.coerce.number().int().min(1000).max(9999),
  source_kind: z.enum(sourceKinds),
  tier: sourceTierSchema,
  identifiers: z.record(requiredString.max(300)).default({}),
  publisher: z.string().trim().max(500).nullable().optional().default(null),
  url: z.string().trim().url().nullable().optional().default(null),
});

// @req REQ-012
export const assertionReferenceCreateSchema = z.object({
  assertion_id: uuid,
  source_id: uuid,
  locator_type: z.enum(locatorTypes),
  locator_value: requiredString.max(500),
});

const assetContentSchema = z.custom<ReferenceWorkingAssetInput["content"]>(
  (value) =>
    value instanceof Uint8Array ||
    value instanceof ArrayBuffer ||
    (typeof Blob !== "undefined" && value instanceof Blob),
  "Asset content must be binary data"
);

// @req REQ-012
export const referenceWorkingAssetCreateSchema = z.object({
  source_id: uuid,
  asset_kind: z.enum(assetKinds),
  filename: requiredString.max(255),
  content_type: requiredString.max(255),
  byte_size: z.coerce
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
  content: assetContentSchema,
});

export interface ReferenceLibraryHandlerContext {
  accessToken: string | null;
}

export interface ReferenceLibraryHandlerDependencies {
  getAuthenticatedReferenceUser: (
    accessToken: string
  ) => Promise<{ id: string } | null>;
  searchReferences: (
    search: string,
    limit: number
  ) => Promise<ReferenceSource[]>;
  createReference: (
    input: ReferenceCreateInput
  ) => Promise<ReferenceCreateResult>;
  linkReferenceToAssertion: (
    assertionId: string,
    sourceId: string,
    locator: AssertionReferenceInput
  ) => Promise<CreatedAssertionReference>;
  storeReferenceWorkingAsset: (
    ownerId: string,
    input: ReferenceWorkingAssetInput
  ) => Promise<PrivateWorkingAsset>;
}

export interface ReferenceLibraryHandlerResult<T> {
  status: number;
  body: T;
}

const defaultDependencies: ReferenceLibraryHandlerDependencies = {
  getAuthenticatedReferenceUser,
  searchReferences,
  createReference,
  linkReferenceToAssertion,
  storeReferenceWorkingAsset,
};

function resolveDependencies(
  dependencies: Partial<ReferenceLibraryHandlerDependencies>
): ReferenceLibraryHandlerDependencies {
  return { ...defaultDependencies, ...dependencies };
}

function validationError(issues: z.ZodIssue[]): ApiEnvelope<null> {
  const errors: ApiError[] = issues.map((issue) => ({
    code: "VALIDATION_ERROR",
    message: issue.message,
    field: issue.path.join(".") || undefined,
  }));
  return createApiError(errors);
}

function unauthenticated(): ReferenceLibraryHandlerResult<ApiEnvelope<null>> {
  return {
    status: 401,
    body: createApiError({
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    }),
  };
}

async function authenticate(
  context: ReferenceLibraryHandlerContext,
  dependencies: ReferenceLibraryHandlerDependencies
): Promise<{ id: string } | null> {
  const accessToken = context.accessToken?.trim();
  if (!accessToken) return null;
  return dependencies.getAuthenticatedReferenceUser(accessToken);
}

// @req REQ-012
export async function handleReferenceSearch(
  rawQuery: unknown,
  context: ReferenceLibraryHandlerContext,
  injectedDependencies: Partial<ReferenceLibraryHandlerDependencies> = {}
): Promise<
  ReferenceLibraryHandlerResult<
    ApiEnvelope<ReferenceSource[]> | ApiEnvelope<null>
  >
> {
  const dependencies = resolveDependencies(injectedDependencies);
  if (!(await authenticate(context, dependencies))) return unauthenticated();

  const parsed = referenceSearchSchema.safeParse(rawQuery);
  if (!parsed.success) {
    return { status: 400, body: validationError(parsed.error.issues) };
  }

  const references = await dependencies.searchReferences(
    parsed.data.q,
    parsed.data.limit
  );
  return { status: 200, body: createApiResponse(references) };
}

// @req REQ-012
export async function handleReferenceCreate(
  rawInput: unknown,
  context: ReferenceLibraryHandlerContext,
  injectedDependencies: Partial<ReferenceLibraryHandlerDependencies> = {}
): Promise<
  ReferenceLibraryHandlerResult<
    ApiEnvelope<ReferenceCreateResult> | ApiEnvelope<null>
  >
> {
  const dependencies = resolveDependencies(injectedDependencies);
  if (!(await authenticate(context, dependencies))) return unauthenticated();

  const parsed = referenceCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 400, body: validationError(parsed.error.issues) };
  }

  const result = await dependencies.createReference({
    sourceKey: parsed.data.source_key,
    title: parsed.data.title,
    authors: parsed.data.authors,
    publicationYear: parsed.data.publication_year,
    sourceKind: parsed.data.source_kind,
    tier: parsed.data.tier,
    identifiers: parsed.data.identifiers,
    publisher: parsed.data.publisher,
    url: parsed.data.url,
  });
  return {
    status: result.created ? 201 : 200,
    body: createApiResponse(result),
  };
}

// @req REQ-012
export async function handleAssertionReferenceCreate(
  rawInput: unknown,
  context: ReferenceLibraryHandlerContext,
  injectedDependencies: Partial<ReferenceLibraryHandlerDependencies> = {}
): Promise<
  ReferenceLibraryHandlerResult<
    ApiEnvelope<CreatedAssertionReference> | ApiEnvelope<null>
  >
> {
  const dependencies = resolveDependencies(injectedDependencies);
  if (!(await authenticate(context, dependencies))) return unauthenticated();

  const parsed = assertionReferenceCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 400, body: validationError(parsed.error.issues) };
  }

  const result = await dependencies.linkReferenceToAssertion(
    parsed.data.assertion_id,
    parsed.data.source_id,
    {
      locatorType: parsed.data.locator_type,
      locatorValue: parsed.data.locator_value,
    }
  );
  return { status: 201, body: createApiResponse(result) };
}

// @req REQ-012
export async function handleReferenceWorkingAssetCreate(
  rawInput: unknown,
  context: ReferenceLibraryHandlerContext,
  injectedDependencies: Partial<ReferenceLibraryHandlerDependencies> = {}
): Promise<
  ReferenceLibraryHandlerResult<
    ApiEnvelope<PrivateWorkingAsset> | ApiEnvelope<null>
  >
> {
  const dependencies = resolveDependencies(injectedDependencies);
  const user = await authenticate(context, dependencies);
  if (!user) return unauthenticated();

  const parsed = referenceWorkingAssetCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 400, body: validationError(parsed.error.issues) };
  }

  const asset = await dependencies.storeReferenceWorkingAsset(user.id, {
    sourceId: parsed.data.source_id,
    assetKind: parsed.data.asset_kind,
    filename: parsed.data.filename,
    contentType: parsed.data.content_type,
    byteSize: parsed.data.byte_size,
    content: parsed.data.content,
  });
  return { status: 201, body: createApiResponse(asset) };
}
