/**
 * API v2 - Language Families endpoint
 * GET /api/v2/language-families?page=1&perPage=20
 */

import { NextRequest } from "next/server";
import { listLanguageFamiliesHandler } from "@/api/v2/handlers/languageFamilies";
import { validatePage, validatePerPage } from "@/api/v2/utils/validation";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = validatePage(searchParams.get("page"));
    const perPage = validatePerPage(searchParams.get("perPage"));

    logger.info("GET /api/v2/language-families", { page, perPage });

    const response = await listLanguageFamiliesHandler(page, perPage);
    const corsResponse = jsonWithCors(response);
    if (corsResponse instanceof Response) {
      corsResponse.headers.set(
        "Cache-Control",
        "public, max-age=86400, s-maxage=86400"
      );
    }

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/language-families completed", {
      page,
      perPage,
      duration,
      status: 200,
    });

    return corsResponse;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error in GET /api/v2/language-families", error, { duration });
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
