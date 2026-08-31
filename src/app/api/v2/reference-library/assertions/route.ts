import { NextRequest } from "next/server";
import { handleAssertionReferenceCreate } from "@/api/v2/handlers/reference-library";
import { corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";
import {
  getReferenceAccessToken,
  internalErrorResponse,
  responseFromReferenceHandler,
  validationErrorResponse,
} from "@/app/api/v2/reference-library/route-utils";

// @req REQ-093
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse("Request body must be valid JSON");
  }

  try {
    const result = await handleAssertionReferenceCreate(body, {
      accessToken: getReferenceAccessToken(request),
    });
    return responseFromReferenceHandler(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/reference-library/assertions", error);
    return internalErrorResponse();
  }
}

// @req REQ-093
export function OPTIONS() {
  return corsOptionsResponse();
}
