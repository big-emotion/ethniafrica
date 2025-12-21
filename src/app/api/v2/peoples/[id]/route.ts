/**
 * API v2 - Single People endpoint
 * GET /api/v2/peoples/[id]
 */

import { NextRequest } from "next/server";
import { getPeopleHandler } from "@/api/v2/handlers/peoples";
import { validatePeopleId } from "@/api/v2/utils/validation";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const { id } = await params;

    logger.info("GET /api/v2/peoples/[id]", { id });

    // Validate PPL_ ID format
    if (!validatePeopleId(id)) {
      logger.warn("Invalid people ID format", { id });
      return jsonWithCors(
        { error: "Invalid people ID format" },
        { status: 400 }
      );
    }

    const people = await getPeopleHandler(id);

    if (!people) {
      logger.warn("People not found", { id });
      return jsonWithCors({ error: "People not found" }, { status: 404 });
    }

    const response = jsonWithCors({ data: people });
    if (response instanceof Response) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=86400, s-maxage=86400"
      );
    }

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/peoples/[id] completed", {
      id,
      duration,
      status: 200,
    });

    return response;
  } catch (error) {
    const { id } = await params;
    const duration = Date.now() - startTime;
    logger.error(`Error in GET /api/v2/peoples/${id}`, error, { id, duration });
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
