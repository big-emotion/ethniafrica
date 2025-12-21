/**
 * API v2 - Search endpoint
 * GET /api/v2/search?query=...&type=...&languageFamilyId=...&countryId=...
 */

import { NextRequest } from "next/server";
import { searchHandler } from "@/api/v2/handlers/search";
import type { SearchFilters } from "@/types/afrik";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: SearchFilters = {};

    const query = searchParams.get("query");
    if (query) filters.query = query;

    const type = searchParams.get("type");
    if (
      type &&
      ["country", "people", "language", "languageFamily"].includes(type)
    ) {
      filters.type = type as SearchFilters["type"];
    }

    const languageFamilyId = searchParams.get("languageFamilyId");
    if (languageFamilyId) filters.languageFamilyId = languageFamilyId;

    const countryId = searchParams.get("countryId");
    if (countryId) filters.countryId = countryId;

    logger.info("GET /api/v2/search", { filters });

    const results = await searchHandler(filters);
    const response = jsonWithCors({ data: results });
    if (response instanceof Response) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=86400, s-maxage=86400"
      );
    }

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/search completed", {
      filters,
      resultCount: results.length,
      duration,
      status: 200,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error in GET /api/v2/search", error, { duration });
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
