/**
 * API v2 — Revisions feed
 * GET /api/v2/feed/revisions
 *
 * @swagger
 * /api/v2/feed/revisions:
 *   get:
 *     summary: Cursor-paginated feed of recent revisions
 *     description: >
 *       Returns a cursor-paginated Atom + JSON feed of recent published revisions,
 *       filterable by `since`. Enables alerting and mirroring integrations to
 *       discover updated fiches without polling every endpoint (FR38 preparation,
 *       AR19, NFR32).
 *       Response body is byte-identical across replays for the same cursor (NFR32).
 *       Cache-Control: s-maxage=60 for edge caching (AR18).
 *     tags: [API v2 - Feed]
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO 8601 datetime — only return revisions published at or after this timestamp
 *         example: "2026-05-01T00:00:00.000Z"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of revisions per page
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Opaque cursor from the previous page's next_cursor value
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, atom]
 *           default: json
 *         description: Response format — json (default) or atom (Atom 1.0 feed)
 *     responses:
 *       200:
 *         description: >
 *           Feed of revisions. JSON envelope when format=json; Atom 1.0 XML when
 *           format=atom (Content-Type: application/atom+xml).
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=60, stale-while-revalidate=30"
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeedRevisionListResponse'
 *           application/atom+xml:
 *             schema:
 *               type: string
 *               description: Valid Atom 1.0 feed with one entry per revision
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       429:
 *         description: Rate limit exceeded (> 60 req/min for anonymous clients)
 *         headers:
 *           Retry-After:
 *             schema:
 *               type: integer
 *           X-RateLimit-Limit:
 *             schema:
 *               type: integer
 *           X-RateLimit-Remaining:
 *             schema:
 *               type: integer
 *           X-RateLimit-Reset:
 *             schema:
 *               type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest, NextResponse } from "next/server";
import { listFeedRevisionsHandler } from "@/api/v2/handlers/feedRevisionsHandler";
import { listFeedRevisions } from "@/api/v2/services/feedRevisions";
import { buildAtomFeed } from "@/lib/api/atomSerializer";
import { createApiError } from "@/api/v2/utils/response";
import {
  jsonWithCors,
  corsOptionsResponse,
  applyCorsHeaders,
} from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const CACHE_CONTROL = "s-maxage=60, stale-while-revalidate=30";

function validateIso8601(value: string): boolean {
  return !isNaN(Date.parse(value));
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;

    const rawLimit = searchParams.get("limit");
    const limitNum = rawLimit ? parseInt(rawLimit, 10) : DEFAULT_LIMIT;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > MAX_LIMIT) {
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: `limit must be between 1 and ${MAX_LIMIT}`,
          field: "limit",
        }),
        { status: 400 }
      );
    }

    const rawSince = searchParams.get("since");
    if (rawSince !== null && !validateIso8601(rawSince)) {
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "since must be a valid ISO 8601 datetime",
          field: "since",
        }),
        { status: 400 }
      );
    }
    const since = rawSince ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;

    const rawFormat = searchParams.get("format") ?? "json";
    if (rawFormat !== "json" && rawFormat !== "atom") {
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "format must be 'json' or 'atom'",
          field: "format",
        }),
        { status: 400 }
      );
    }

    logger.info("GET /api/v2/feed/revisions", {
      since,
      limit: limitNum,
      cursor,
      format: rawFormat,
    });

    if (rawFormat === "atom") {
      const { items } = await listFeedRevisions(limitNum, since, cursor);
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const feedUrl = `${baseUrl}/api/v2/feed/revisions`;

      // NFR32: updated is derived from data, never from Date.now()
      const updated =
        items.length > 0 && items[0].published_at
          ? items[0].published_at
          : "1970-01-01T00:00:00.000Z";

      const xml = buildAtomFeed(items, { baseUrl, feedUrl, updated });

      const response = new NextResponse(xml, {
        status: 200,
        headers: {
          "Content-Type": "application/atom+xml; charset=utf-8",
          "Cache-Control": CACHE_CONTROL,
        },
      });
      applyCorsHeaders(response);

      logger.info("GET /api/v2/feed/revisions completed", {
        format: "atom",
        duration: Date.now() - startTime,
        status: 200,
      });
      return response;
    }

    const envelope = await listFeedRevisionsHandler(limitNum, since, cursor);
    const response = jsonWithCors(envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/feed/revisions completed", {
      format: "json",
      duration: Date.now() - startTime,
      status: 200,
    });
    return response;
  } catch (error) {
    logger.error("Error in GET /api/v2/feed/revisions", error, {
      duration: Date.now() - startTime,
    });
    return jsonWithCors(
      createApiError({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
