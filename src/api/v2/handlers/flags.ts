import { z } from "zod";
import {
  createFlag,
  decodeFlagCursor,
  getAgeConfirmedAt,
  getAuthenticatedContributor,
  getFlagByIdOrSlug,
  listFlags,
  type CreatedFlag,
  type FlagCreateInput,
  type FlagListFilters,
  type FlagListResult,
  type PublicFlag,
} from "@/api/v2/services/flags";
import {
  API_ATTRIBUTION,
  API_LICENSE,
  createApiError,
  createApiResponse,
  type ApiEnvelope,
  type ApiError,
} from "@/api/v2/utils/response";
import { verifyTurnstileToken } from "@/lib/api/turnstile";
import {
  checkFlagRateLimit,
  type FlagRateLimitResult,
} from "@/lib/ratelimit/flagRateLimit";

const FLAG_KINDS = [
  "inaccurate",
  "missing-source",
  "broken-url",
  "offensive",
  "correction-proposal",
  "other",
] as const;

const FLAG_STATUSES = [
  "open",
  "under_review",
  "accepted",
  "rejected",
  "withdrawn",
  "duplicate",
] as const;

const trimmedRequiredString = z.string().trim().min(1);

const flagCreateSchema = z.object({
  target_type: trimmedRequiredString,
  target_id: trimmedRequiredString,
  target_field_path: trimmedRequiredString.optional(),
  flag_kind: z.enum(FLAG_KINDS),
  reason_text: z.string().trim().min(10).max(2000),
  counter_source_url: z.string().trim().url().optional(),
  counter_source_citation: z.string().trim().max(2000).optional(),
  proposed_rewrite: z.string().trim().max(5000).optional(),
  turnstile_token: trimmedRequiredString,
});

const flagListSchema = z.object({
  status: z.enum(FLAG_STATUSES).optional(),
  kind: z.enum(FLAG_KINDS).optional(),
  target_type: trimmedRequiredString.optional(),
  cursor: trimmedRequiredString.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const flagDetailSchema = z.object({
  identifier: trimmedRequiredString,
});

type TurnstileVerificationResult = "verified" | "rejected" | "unavailable";

export interface FlagHandlerDependencies {
  getAuthenticatedContributor: (
    accessToken: string
  ) => Promise<{ id: string } | null>;
  getAgeConfirmedAt: (contributorId: string) => Promise<string | null>;
  verifyTurnstileToken: (
    token: string,
    clientIp?: string
  ) => Promise<TurnstileVerificationResult>;
  checkFlagRateLimit: (contributorId: string) => Promise<FlagRateLimitResult>;
  createFlag: (
    contributorId: string,
    input: FlagCreateInput
  ) => Promise<CreatedFlag>;
  listFlags: (filters: FlagListFilters) => Promise<FlagListResult>;
  getFlagByIdOrSlug: (identifier: string) => Promise<PublicFlag | null>;
  decodeFlagCursor: (
    cursor: string
  ) => { createdAt: string; id: string } | null;
}

export interface FlagHandlerContext {
  accessToken: string | null;
  clientIp?: string;
}

export interface FlagCursorPagination {
  limit: number;
  next_cursor: string | null;
}

export interface FlagListEnvelope {
  data: PublicFlag[];
  meta: {
    license: string;
    attribution: string;
    pagination: FlagCursorPagination;
  };
  errors: never[];
}

export interface FlagHandlerResult<T> {
  status: number;
  body: T;
  headers?: Record<string, string>;
}

const defaultDependencies: FlagHandlerDependencies = {
  getAuthenticatedContributor,
  getAgeConfirmedAt,
  verifyTurnstileToken,
  checkFlagRateLimit,
  createFlag,
  listFlags,
  getFlagByIdOrSlug,
  decodeFlagCursor,
};

function resolveDependencies(
  dependencies: Partial<FlagHandlerDependencies>
): FlagHandlerDependencies {
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

function errorResponse(code: string, message: string): ApiEnvelope<null> {
  return createApiError({ code, message });
}

function rateLimitHeaders(result: {
  retryAfter: number;
  limit?: number;
  remaining?: number;
  reset?: number;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "Retry-After": String(result.retryAfter),
  };

  if (result.limit !== undefined) {
    headers["X-RateLimit-Limit"] = String(result.limit);
  }
  if (result.remaining !== undefined) {
    headers["X-RateLimit-Remaining"] = String(result.remaining);
  }
  if (result.reset !== undefined) {
    headers["X-RateLimit-Reset"] = String(result.reset);
  }

  return headers;
}

// @req REQ-012
export async function handleFlagCreate(
  rawInput: unknown,
  context: FlagHandlerContext,
  injectedDependencies: Partial<FlagHandlerDependencies> = {}
): Promise<FlagHandlerResult<ApiEnvelope<CreatedFlag> | ApiEnvelope<null>>> {
  const dependencies = resolveDependencies(injectedDependencies);
  const accessToken = context.accessToken?.trim();

  if (!accessToken) {
    return {
      status: 401,
      body: errorResponse("UNAUTHENTICATED", "Authentication required"),
    };
  }

  const contributor =
    await dependencies.getAuthenticatedContributor(accessToken);
  if (!contributor) {
    return {
      status: 401,
      body: errorResponse("UNAUTHENTICATED", "Authentication required"),
    };
  }

  const parsed = flagCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: 400,
      body: validationError(parsed.error.issues),
    };
  }

  const ageConfirmedAt = await dependencies.getAgeConfirmedAt(contributor.id);
  if (!ageConfirmedAt) {
    return {
      status: 403,
      body: errorResponse(
        "AGE_CONFIRMATION_REQUIRED",
        "Age confirmation required (FR45). Complete your profile at /fr/compte/profil."
      ),
    };
  }

  const { turnstile_token } = parsed.data;
  const flagInput: FlagCreateInput = {
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    target_field_path: parsed.data.target_field_path,
    flag_kind: parsed.data.flag_kind,
    reason_text: parsed.data.reason_text,
    counter_source_url: parsed.data.counter_source_url,
    counter_source_citation: parsed.data.counter_source_citation,
    proposed_rewrite: parsed.data.proposed_rewrite,
  };
  const turnstileResult = await dependencies.verifyTurnstileToken(
    turnstile_token,
    context.clientIp
  );

  if (turnstileResult === "rejected") {
    return {
      status: 403,
      body: errorResponse("UNAUTHORIZED", "Anti-bot verification failed"),
    };
  }

  if (turnstileResult === "unavailable") {
    return {
      status: 503,
      body: errorResponse(
        "UNAVAILABLE",
        "Anti-bot verification is temporarily unavailable. Please retry later."
      ),
    };
  }

  const limitResult = await dependencies.checkFlagRateLimit(contributor.id);
  if ("retryAfter" in limitResult) {
    return {
      status: 429,
      body: errorResponse(
        "RATE_LIMITED",
        `Flag submission rate limit exceeded. Retry after ${limitResult.retryAfter} seconds.`
      ),
      headers: rateLimitHeaders(limitResult),
    };
  }

  const flag = await dependencies.createFlag(contributor.id, flagInput);
  return {
    status: 201,
    body: createApiResponse(flag),
  };
}

// @req REQ-014
export async function handleFlagList(
  rawQuery: Record<string, string | undefined>,
  injectedDependencies: Partial<FlagHandlerDependencies> = {}
): Promise<FlagHandlerResult<FlagListEnvelope | ApiEnvelope<null>>> {
  const dependencies = resolveDependencies(injectedDependencies);
  const parsed = flagListSchema.safeParse(rawQuery);

  if (!parsed.success) {
    return {
      status: 400,
      body: validationError(parsed.error.issues),
    };
  }

  if (
    parsed.data.cursor &&
    !dependencies.decodeFlagCursor(parsed.data.cursor)
  ) {
    return {
      status: 400,
      body: validationError([
        {
          code: z.ZodIssueCode.custom,
          path: ["cursor"],
          message: "Invalid cursor",
        },
      ]),
    };
  }

  const filters: FlagListFilters = {
    limit: parsed.data.limit,
  };
  if (parsed.data.status) filters.status = parsed.data.status;
  if (parsed.data.kind) filters.kind = parsed.data.kind;
  if (parsed.data.target_type) filters.target_type = parsed.data.target_type;
  if (parsed.data.cursor) filters.cursor = parsed.data.cursor;

  const result = await dependencies.listFlags(filters);
  return {
    status: 200,
    body: {
      data: result.items,
      meta: {
        license: API_LICENSE,
        attribution: API_ATTRIBUTION,
        pagination: {
          limit: parsed.data.limit,
          next_cursor: result.next_cursor,
        },
      },
      errors: [],
    },
  };
}

// @req REQ-014
export async function handleFlagDetail(
  identifier: string,
  injectedDependencies: Partial<FlagHandlerDependencies> = {}
): Promise<FlagHandlerResult<ApiEnvelope<PublicFlag> | ApiEnvelope<null>>> {
  const dependencies = resolveDependencies(injectedDependencies);
  const parsed = flagDetailSchema.safeParse({ identifier });

  if (!parsed.success) {
    return {
      status: 400,
      body: validationError(parsed.error.issues),
    };
  }

  const flag = await dependencies.getFlagByIdOrSlug(parsed.data.identifier);
  if (!flag) {
    return {
      status: 404,
      body: errorResponse("NOT_FOUND", "Flag not found"),
    };
  }

  return {
    status: 200,
    body: createApiResponse(flag),
  };
}
