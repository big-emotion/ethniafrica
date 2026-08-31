import { NextRequest } from "next/server";
import {
  handleReferenceCreate,
  handleReferenceSearch,
} from "@/api/v2/handlers/reference-library";
import { corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";
import {
  getReferenceAccessToken,
  internalErrorResponse,
  responseFromReferenceHandler,
  validationErrorResponse,
} from "@/app/api/v2/reference-library/route-utils";

// @req REQ-093
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await handleReferenceSearch(
      {
        q: searchParams.get("q") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
      },
      { accessToken: getReferenceAccessToken(request) }
    );
    return responseFromReferenceHandler(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/reference-library", error);
    return internalErrorResponse();
  }
}

// @req REQ-093
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse("Request body must be valid JSON");
  }

  try {
    const result = await handleReferenceCreate(body, {
      accessToken: getReferenceAccessToken(request),
    });
    return responseFromReferenceHandler(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/reference-library", error);
    return internalErrorResponse();
  }
}

// @req REQ-093
export function OPTIONS() {
  return corsOptionsResponse();
}
