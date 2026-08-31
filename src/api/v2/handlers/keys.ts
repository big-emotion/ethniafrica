import { z } from "zod";
import { createApiKeySchema } from "@/api/v2/schemas/apiKeys";
import {
  createUserApiKey,
  getAuthenticatedUser,
  listUserApiKeys,
  revokeUserApiKey,
  type ApiKeySummary,
  type CreatedApiKey,
} from "@/api/v2/services/keyService";
import {
  createApiError,
  createApiResponse,
  type ApiEnvelope,
  type ApiError,
} from "@/api/v2/utils/response";

export interface KeyHandlerContext {
  accessToken: string | null;
}

export interface KeyHandlerResult<T> {
  status: number;
  body: T;
}

export interface KeyHandlerDependencies {
  getAuthenticatedUser: typeof getAuthenticatedUser;
  listUserApiKeys: typeof listUserApiKeys;
  createUserApiKey: typeof createUserApiKey;
  revokeUserApiKey: typeof revokeUserApiKey;
}

const defaultDependencies: KeyHandlerDependencies = {
  getAuthenticatedUser,
  listUserApiKeys,
  createUserApiKey,
  revokeUserApiKey,
};

function resolveDependencies(
  overrides: Partial<KeyHandlerDependencies>
): KeyHandlerDependencies {
  return { ...defaultDependencies, ...overrides };
}

function validationError(issues: z.ZodIssue[]): ApiEnvelope<null> {
  const errors: ApiError[] = issues.map((issue) => ({
    code: "VALIDATION_ERROR",
    message: issue.message,
    field: issue.path.join(".") || undefined,
  }));
  return createApiError(errors);
}

function unauthorized(): ApiEnvelope<null> {
  return createApiError({
    code: "UNAUTHORIZED",
    message: "Authentication required",
  });
}

async function requireUser(
  context: KeyHandlerContext,
  dependencies: KeyHandlerDependencies
): Promise<{ id: string } | null> {
  const accessToken = context.accessToken?.trim();
  if (!accessToken) return null;
  return dependencies.getAuthenticatedUser(accessToken);
}

// @req REQ-056
export async function handleKeyList(
  context: KeyHandlerContext,
  injectedDependencies: Partial<KeyHandlerDependencies> = {}
): Promise<KeyHandlerResult<ApiEnvelope<ApiKeySummary[]> | ApiEnvelope<null>>> {
  const dependencies = resolveDependencies(injectedDependencies);
  const user = await requireUser(context, dependencies);
  if (!user) {
    return { status: 401, body: unauthorized() };
  }

  const keys = await dependencies.listUserApiKeys(user.id);
  return { status: 200, body: createApiResponse(keys) };
}

// @req REQ-056
export async function handleKeyCreate(
  context: KeyHandlerContext,
  rawInput: unknown,
  injectedDependencies: Partial<KeyHandlerDependencies> = {}
): Promise<KeyHandlerResult<ApiEnvelope<CreatedApiKey> | ApiEnvelope<null>>> {
  const dependencies = resolveDependencies(injectedDependencies);
  const user = await requireUser(context, dependencies);
  if (!user) {
    return { status: 401, body: unauthorized() };
  }

  const parsed = createApiKeySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 400, body: validationError(parsed.error.issues) };
  }

  const created = await dependencies.createUserApiKey(
    user.id,
    parsed.data.label
  );
  return { status: 201, body: createApiResponse(created) };
}

// @req REQ-056
export async function handleKeyRevoke(
  context: KeyHandlerContext,
  keyId: string,
  injectedDependencies: Partial<KeyHandlerDependencies> = {}
): Promise<KeyHandlerResult<ApiEnvelope<null>>> {
  const dependencies = resolveDependencies(injectedDependencies);
  const user = await requireUser(context, dependencies);
  if (!user) {
    return { status: 401, body: unauthorized() };
  }

  const result = await dependencies.revokeUserApiKey(user.id, keyId);
  if (result === "not_found") {
    return {
      status: 404,
      body: createApiError({ code: "NOT_FOUND", message: "API key not found" }),
    };
  }

  return { status: 200, body: createApiResponse(null) };
}
