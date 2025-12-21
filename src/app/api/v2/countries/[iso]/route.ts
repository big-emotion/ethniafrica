/**
 * API v2 - Single Country endpoint
 * GET /api/v2/countries/[iso]
 */

import { NextRequest } from "next/server";
import { getCountryHandler } from "@/api/v2/handlers/countries";
import { validateCountryId } from "@/api/v2/utils/validation";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ iso: string }> }
) {
  const startTime = Date.now();
  try {
    const { iso } = await params;

    logger.info("GET /api/v2/countries/[iso]", { iso });

    // Validate ISO code format
    if (!validateCountryId(iso)) {
      logger.warn("Invalid country ISO code format", { iso });
      return jsonWithCors(
        { error: "Invalid country ISO code format" },
        { status: 400 }
      );
    }

    const country = await getCountryHandler(iso);

    if (!country) {
      logger.warn("Country not found", { iso });
      return jsonWithCors({ error: "Country not found" }, { status: 404 });
    }

    const response = jsonWithCors({ data: country });
    if (response instanceof Response) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=86400, s-maxage=86400"
      );
    }

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/countries/[iso] completed", {
      iso,
      duration,
      status: 200,
    });

    return response;
  } catch (error) {
    const { iso } = await params;
    const duration = Date.now() - startTime;
    logger.error(`Error in GET /api/v2/countries/${iso}`, error, {
      iso,
      duration,
    });
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
