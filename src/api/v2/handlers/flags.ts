import { z } from "zod";
import {
  createFlag,
  decodeFlagCursor,
  getAgeConfirmedAt,
  getAuthenticatedContributor,
  getContributorEmail,
  getFlagByIdOrSlug,
  getModeratorByAccessToken,
  listFlags,
  transitionFlag,
  type CreatedFlag,
  type FlagCreateInput,
  type FlagListFilters,
  type FlagListResult,
  type PublicFlag,
  type FlagStatus,
} from "@/api/v2/services/flags";
import { auditLog, type AuditLogInput } from "@/lib/audit/log";
import {
  API_ATTRIBUTION,
  API_LICENSE,
  createApiError,
  createApiResponse,
  type ApiEnvelope,
  type ApiError,
  type ApiErrorCode,
} from "@/api/v2/utils/response";
import { verifyAntibotProof } from "@/lib/api/antibot";
import type { Proof } from "@/lib/antibot/proofOfWork";
import {
  checkFlagRateLimit,
  type FlagRateLimitResult,
} from "@/lib/ratelimit/flagRateLimit";
import {
  sendFlagResolutionEmail,
  sendFlagVerificationEmail,
  type FlagResolutionRecipient,
  type FlagResolutionStatus,
  type FlagVerificationEmail,
} from "@/lib/email/flagNotification";
import {
  createReporterContact,
  getVerifiedReporterEmail,
} from "@/lib/flags/reporterContact";
import { logger } from "@/lib/api/logger";
import * as Sentry from "@sentry/nextjs";

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

/**
 * Nobody reads a fiche, finds an error and describes it in under three
 * seconds. Generous on purpose: the cost of refusing a real reader is far
 * higher than the cost of letting one fast bot through to the proof of work,
 * which will charge it anyway.
 */
const MIN_DWELL_MS = 3_000;

const flagCreateSchema = z.object({
  target_type: trimmedRequiredString,
  target_id: trimmedRequiredString,
  target_field_path: trimmedRequiredString.optional(),
  flag_kind: z.enum(FLAG_KINDS),
  reason_text: z.string().trim().min(10).max(2000),
  counter_source_url: z.string().trim().url().optional(),
  counter_source_citation: z.string().trim().max(2000).optional(),
  proposed_rewrite: z.string().trim().max(5000).optional(),
  /**
   * Optional, and the only personal datum a report can carry. It buys the
   * reader a decision in their inbox and nothing else — it is not attribution,
   * not an account, and never appears on the public queue.
   */
  reporter_email: z.string().trim().email().max(320).optional(),
  antibot: z.object({
    salt: trimmedRequiredString,
    nonce: trimmedRequiredString,
    difficultyBits: z.number().int().positive(),
    expiresAt: z.number().int().positive(),
    signature: trimmedRequiredString,
  }),
  /** Hidden field. A human never fills it; a naive bot fills everything. */
  website: z.string().max(0).optional(),
  /** Milliseconds the form was open. Instant submissions are not readers. */
  elapsedMs: z.number().int().nonnegative().optional(),
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

type AntibotVerdict = "verified" | "rejected" | "unavailable";

export interface FlagHandlerDependencies {
  getAuthenticatedContributor: (
    accessToken: string
  ) => Promise<{ id: string } | null>;
  getAgeConfirmedAt: (contributorId: string) => Promise<string | null>;
  verifyAntibotProof: (proof: Proof) => Promise<AntibotVerdict>;
  checkFlagRateLimit: (contributorId: string) => Promise<FlagRateLimitResult>;
  createFlag: (
    contributorId: string | null,
    input: FlagCreateInput
  ) => Promise<CreatedFlag>;
  listFlags: (filters: FlagListFilters) => Promise<FlagListResult>;
  getFlagByIdOrSlug: (identifier: string) => Promise<PublicFlag | null>;
  decodeFlagCursor: (
    cursor: string
  ) => { createdAt: string; id: string } | null;
  createReporterContact: (
    flagId: string,
    email: string
  ) => Promise<string | null>;
  sendFlagVerificationEmail: (
    input: FlagVerificationEmail
  ) => Promise<void | boolean>;
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
  verifyAntibotProof,
  checkFlagRateLimit,
  createFlag,
  listFlags,
  getFlagByIdOrSlug,
  decodeFlagCursor,
  createReporterContact,
  sendFlagVerificationEmail,
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

function errorResponse(code: ApiErrorCode, message: string): ApiEnvelope<null> {
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

  const parsed = flagCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: 400,
      body: validationError(parsed.error.issues),
    };
  }

  /**
   * Who the report is credited to — never whether it is accepted.
   *
   * A report is a message *about* the corpus, not a signed contribution *to*
   * it, so it does not carry the CC-BY-SA consent that publishing a name
   * does. The proof of work verified below is the control. See
   * `docs/design/moderation-charter.md` §2.
   *
   * Attribution needs both a resolvable session and a confirmed age: the
   * confirmation is what licenses publishing that name. Missing either, the
   * report is recorded anonymously — a state `PublicFlagsQueue` already
   * renders — rather than refused. Refusing was a dead end in practice, since
   * `age_confirmed_at` is only ever written by the registration callback and
   * an account created through the sign-in page can never obtain it.
   */
  const contributor = accessToken
    ? await dependencies.getAuthenticatedContributor(accessToken)
    : null;
  const attributedTo =
    contributor && (await dependencies.getAgeConfirmedAt(contributor.id))
      ? contributor.id
      : null;

  /**
   * The two free filters, before the proof of work is even looked at.
   *
   * A filled honeypot or an instant submission is a bot, and answering it the
   * same way a failed proof is answered tells it nothing about which of its
   * mistakes gave it away.
   */
  if (
    parsed.data.website ||
    (parsed.data.elapsedMs ?? Infinity) < MIN_DWELL_MS
  ) {
    return {
      status: 403,
      body: errorResponse("UNAUTHORIZED", "vérification anti-robot échouée"),
    };
  }

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
  // The cast is the price of `strictNullChecks: false`: zod infers every
  // property of a parsed object as optional, so a schema that guarantees these
  // five fields still types them as maybe-absent. Validation above is the real
  // guarantee.
  const verdict = await dependencies.verifyAntibotProof(
    parsed.data.antibot as Proof
  );

  if (verdict === "rejected") {
    return {
      status: 403,
      body: errorResponse("UNAUTHORIZED", "vérification anti-bot échouée"),
    };
  }

  if (verdict === "unavailable") {
    return {
      status: 503,
      body: errorResponse(
        "UNAVAILABLE",
        "vérification anti-bot temporairement indisponible, veuillez réessayer plus tard"
      ),
    };
  }

  /**
   * An anonymous report has no contributor to key the bucket on, so it is
   * keyed on the caller's address. The `ip:` prefix keeps that namespace
   * apart from contributor UUIDs, which could otherwise collide.
   *
   * An address the platform did not forward falls into one shared bucket.
   * That is deliberate: a caller the atlas cannot tell apart from any other
   * is exactly the caller a shared limit should hold back. Rate limiting is
   * off entirely until Upstash is configured (ETNI-64), and anonymous
   * reporting is what turns that ticket from a refinement into a prerequisite.
   */
  const rateLimitKey = attributedTo ?? `ip:${context.clientIp ?? "unknown"}`;
  const limitResult = await dependencies.checkFlagRateLimit(rateLimitKey);
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

  const flag = await dependencies.createFlag(attributedTo, flagInput);

  /**
   * Best-effort from here on. The report is committed, so nothing below may
   * change the answer the reader gets: a lost address is a reader who hears
   * nothing back, while a failed 201 is a reader who files the same report
   * three times.
   */
  if (parsed.data.reporter_email) {
    try {
      const token = await dependencies.createReporterContact(
        flag.id,
        parsed.data.reporter_email
      );
      if (token) {
        await dependencies.sendFlagVerificationEmail({
          email: parsed.data.reporter_email,
          token,
          publicSlug: flag.public_slug,
        });
      }
    } catch (error) {
      logger.error("Failed to set up a reporter contact", error, {
        flagId: flag.id,
      });
      Sentry.captureException(error);
    }
  }

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

const flagTransitionSchema = z.object({
  status: z.enum(FLAG_STATUSES),
  moderator_notes: z.string().trim().max(5000).optional(),
});

export interface FlagTransitionDependencies {
  getModeratorByAccessToken: (
    accessToken: string
  ) => Promise<{ id: string } | null>;
  transitionFlag: (
    identifier: string,
    next: { status: FlagStatus; moderatorId: string; moderatorNotes?: string }
  ) => Promise<
    | { ok: true; flag: PublicFlag; previousStatus: FlagStatus }
    | { ok: false; reason: "not_found" | "illegal_transition" }
  >;
  writeAuditLog: (input: AuditLogInput) => Promise<void>;
  getContributorEmail: (contributorId: string) => Promise<string | null>;
  getVerifiedReporterEmail: (flagId: string) => Promise<string | null>;
  sendFlagResolutionEmail: (
    flag: {
      public_slug: string;
      status: FlagResolutionStatus;
      moderator_notes: string | null;
      target_type: string | null;
      target_id: string | null;
    },
    recipient: FlagResolutionRecipient | null
  ) => Promise<void>;
}

const defaultTransitionDependencies: FlagTransitionDependencies = {
  getModeratorByAccessToken,
  transitionFlag,
  writeAuditLog: (input) => auditLog.write(input),
  getContributorEmail,
  getVerifiedReporterEmail,
  sendFlagResolutionEmail,
};

/**
 * The three terminal states a moderator's decision resolves a report to —
 * `withdrawn` is terminal too, but the contributor withdrew it themselves,
 * so there is no decision to notify them of (ETNI-73).
 */
const NOTIFIABLE_STATUSES: ReadonlyArray<FlagStatus> = [
  "accepted",
  "rejected",
  "duplicate",
];

/**
 * Drive one report through the state machine (ETNI-72).
 *
 * The machine itself is enforced by the `flags_enforce_state_machine` trigger
 * (migration 022) and is not restated here: the handler proposes a move and
 * reports the refusal. What the handler owns is the authorization, and it is
 * the only check there is — RLS deliberately gives a contributor no path to a
 * status change, so a moderator write travels on the service-role client and
 * nothing below this function will ask again who the caller is.
 *
 * See docs/design/moderation-charter.md §4.
 */
// @req REQ-042
export async function handleFlagTransition(
  identifier: string,
  rawInput: unknown,
  context: FlagHandlerContext,
  injectedDependencies: Partial<FlagTransitionDependencies> = {}
): Promise<FlagHandlerResult<ApiEnvelope<PublicFlag> | ApiEnvelope<null>>> {
  const dependencies = {
    ...defaultTransitionDependencies,
    ...injectedDependencies,
  };
  const accessToken = context.accessToken?.trim();

  // Refuse by default: no token, or a token that resolves to no moderator
  // role, are the same answer. Neither says why, so a probe learns nothing
  // about which flags exist.
  const moderator = accessToken
    ? await dependencies.getModeratorByAccessToken(accessToken)
    : null;
  if (!moderator) {
    return {
      status: 403,
      body: errorResponse("UNAUTHORIZED", "Moderator role required"),
    };
  }

  const parsed = flagTransitionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 400, body: validationError(parsed.error.issues) };
  }

  const result = await dependencies.transitionFlag(identifier, {
    status: parsed.data.status,
    moderatorId: moderator.id,
    ...(parsed.data.moderator_notes === undefined
      ? {}
      : { moderatorNotes: parsed.data.moderator_notes }),
  });

  // `in`, not `!result.ok`: with strictNullChecks off the compiler does not
  // narrow this union on its boolean discriminant, and silently types the
  // failure branch as the success one.
  if ("reason" in result) {
    return result.reason === "not_found"
      ? {
          status: 404,
          body: errorResponse("NOT_FOUND", "Flag not found"),
        }
      : {
          status: 409,
          body: errorResponse(
            "ILLEGAL_TRANSITION",
            `Cette transition n'est pas permise depuis l'état courant.`
          ),
        };
  }

  await dependencies.writeAuditLog({
    actorId: moderator.id,
    action: "flag.transition",
    targetType: "flag",
    targetId: identifier,
    before: { status: result.previousStatus },
    after: { status: result.flag.status },
    ip: context.clientIp ?? null,
  });

  /**
   * Best-effort resolution email (ETNI-73). The transition above already
   * committed, so nothing here may roll it back — every failure, including
   * one from the dependency itself, is caught, logged and reported rather
   * than allowed to fail the response.
   */
  if (NOTIFIABLE_STATUSES.includes(result.flag.status)) {
    try {
      const contributorId = result.flag.contributor_id;
      const contributorEmail = contributorId
        ? await dependencies.getContributorEmail(contributorId)
        : null;

      /**
       * An accountless report can now be answered too. The reader may have
       * left an address and proved it by following the link; an address left
       * and never proved is deliberately not used, because it may belong to
       * someone who never reported anything.
       */
      const email =
        contributorEmail ??
        (await dependencies.getVerifiedReporterEmail(result.flag.id));
      const recipient: FlagResolutionRecipient | null = email
        ? { email }
        : null;

      await dependencies.sendFlagResolutionEmail(
        {
          public_slug: result.flag.public_slug,
          status: result.flag.status as FlagResolutionStatus,
          moderator_notes: parsed.data.moderator_notes ?? null,
          target_type: result.flag.target_type,
          target_id: result.flag.target_id,
        },
        recipient
      );
    } catch (error) {
      logger.error("Flag resolution notification failed", error, {
        flagId: result.flag.id,
      });
      Sentry.captureException(error);
    }
  }

  return { status: 200, body: createApiResponse(result.flag) };
}
