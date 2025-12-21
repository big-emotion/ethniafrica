/**
 * API v2 - Single Language Family endpoint
 * GET /api/v2/language-families/[id]
 */

import { NextRequest } from "next/server";
import { getLanguageFamilyHandler } from "@/api/v2/handlers/languageFamilies";
import { validateLanguageFamilyId } from "@/api/v2/utils/validation";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const { id } = await params;

    logger.info("GET /api/v2/language-families/[id]", { id });

    // Validate FLG_ ID format
    if (!validateLanguageFamilyId(id)) {
      logger.warn("Invalid language family ID format", { id });
      return jsonWithCors(
        { error: "Invalid language family ID format" },
        { status: 400 }
      );
    }

    const family = await getLanguageFamilyHandler(id);

    if (!family) {
      logger.warn("Language family not found", { id });
      return jsonWithCors(
        { error: "Language family not found" },
        { status: 404 }
      );
    }

    const response = jsonWithCors({ data: family });
    if (response instanceof Response) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=86400, s-maxage=86400"
      );
    }

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/language-families/[id] completed", {
      id,
      duration,
      status: 200,
    });

    return response;
  } catch (error) {
    const { id } = await params;
    const duration = Date.now() - startTime;
    logger.error(`Error in GET /api/v2/language-families/${id}`, error, {
      id,
      duration,
    });
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
