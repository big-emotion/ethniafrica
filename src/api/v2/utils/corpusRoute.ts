/**
 * The shape shared by the v2 routes that serve one corpus record by id.
 *
 * Eight route files carried the same thirty lines — id-format refusal, `?lang`
 * refusal, 404 envelope, 500 envelope, timing logs — and diverged only where
 * the parameters below say. The route file keeps its OpenAPI block, its
 * validator and its handler; the handler and the service below it are
 * untouched, so the route → handler → service split stays where it was.
 */
import { NextRequest } from "next/server";

import { createApiError } from "@/api/v2/utils/response";
import { validateLang } from "@/api/v2/utils/validation";
import { jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

/**
 * The shared-cache lifetime of corpus data (the people-data class, AR18).
 * An hour, not `immutable`: every sync can rewrite any record, and an
 * immutable response is one a shared cache never asks about again.
 */
// @req REQ-084
export const CORPUS_CACHE_CONTROL = "s-maxage=3600";

type Locale = NonNullable<ReturnType<typeof validateLang>>;
type ErrorCode = Exclude<
  Parameters<typeof createApiError>[0],
  readonly unknown[]
>["code"];

export type DetailOutcome =
  | { ok: true; envelope: unknown }
  | { ok: false; code: ErrorCode; message: string };

/** Adapts a handler that answers `null` for a missing record. */
// @req REQ-084
export function orNotFound(envelope: unknown, message: string): DetailOutcome {
  return envelope === null
    ? { ok: false, code: "NOT_FOUND", message }
    : { ok: true, envelope };
}

export interface CorpusDetailRoute<Param extends string> {
  /** As the logs name it, e.g. `/api/v2/peoples/[id]`. */
  path: string;
  param: Param;
  isValidId: (value: string) => boolean;
  invalidIdMessage: string;
  /** The migrations detail route has always answered a malformed id with 422. */
  invalidIdStatus?: 400 | 422;
  /** A route that does not serve `?lang` never validates it. */
  servesLang: boolean;
  /** Left unset, the response carries no Cache-Control at all, as before. */
  cacheControl?: string;
  rejectedLog: string;
  resolve: (id: string, lang: Locale) => Promise<DetailOutcome>;
}

// @req REQ-084
export function corpusDetailRoute<Param extends string>(
  route: CorpusDetailRoute<Param>
) {
  return async function GET(
    request: NextRequest,
    { params }: { params: Promise<Record<Param, string>> }
  ): Promise<Response> {
    const startTime = Date.now();
    const id = (await params)[route.param];
    const logContext = { [route.param]: id };

    try {
      logger.info(`GET ${route.path}`, logContext);

      if (!route.isValidId(id)) {
        logger.warn(route.invalidIdMessage, logContext);
        return jsonWithCors(
          createApiError({
            code: "VALIDATION_ERROR",
            message: route.invalidIdMessage,
            field: route.param,
          }),
          { status: route.invalidIdStatus ?? 400 }
        );
      }

      let lang: Locale = "fr";
      if (route.servesLang) {
        const requested = request.nextUrl.searchParams.get("lang");
        const validated = validateLang(requested);
        if (validated === null) {
          logger.warn("Unsupported lang requested", {
            ...logContext,
            lang: requested,
          });
          return jsonWithCors(
            createApiError({
              code: "VALIDATION_ERROR",
              message: "Unsupported lang: expected fr or en",
              field: "lang",
            }),
            { status: 400 }
          );
        }
        lang = validated;
      }

      const outcome = await route.resolve(id, lang);

      if (outcome.ok === false) {
        logger.warn(route.rejectedLog, { ...logContext, code: outcome.code });
        return jsonWithCors(
          createApiError({ code: outcome.code, message: outcome.message }),
          { status: 404 }
        );
      }

      const response = route.cacheControl
        ? jsonWithCors(outcome.envelope, {
            headers: { "Cache-Control": route.cacheControl },
          })
        : jsonWithCors(outcome.envelope);

      logger.info(`GET ${route.path} completed`, {
        ...logContext,
        duration: Date.now() - startTime,
        status: 200,
      });

      return response;
    } catch (error) {
      logger.error(
        `Error in GET ${route.path.replace(`[${route.param}]`, id)}`,
        error,
        { ...logContext, duration: Date.now() - startTime }
      );
      return jsonWithCors(
        createApiError({
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        }),
        { status: 500 }
      );
    }
  };
}
