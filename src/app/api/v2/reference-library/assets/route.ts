import { NextRequest } from "next/server";
import { handleReferenceWorkingAssetCreate } from "@/api/v2/handlers/reference-library";
import { corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";
import {
  getReferenceAccessToken,
  internalErrorResponse,
  responseFromAssetHandler,
  validationErrorResponse,
} from "@/app/api/v2/reference-library/route-utils";

function formValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function assetInput(formData: FormData) {
  const value = formData.get("file");
  const file = value instanceof Blob ? value : null;
  const filename =
    file && "name" in file && typeof file.name === "string" ? file.name : "";

  return {
    source_id:
      formValue(formData, "sourceId") ?? formValue(formData, "source_id"),
    asset_kind:
      formValue(formData, "assetKind") ?? formValue(formData, "asset_kind"),
    filename,
    content_type: file?.type || "",
    byte_size: file?.size ?? 0,
    content: file,
  };
}

// @req REQ-093
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return validationErrorResponse("Request body must be valid form data");
  }

  try {
    const result = await handleReferenceWorkingAssetCreate(
      assetInput(formData),
      {
        accessToken: getReferenceAccessToken(request),
      }
    );
    return responseFromAssetHandler(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/reference-library/assets", error);
    return internalErrorResponse();
  }
}

// @req REQ-093
export function OPTIONS() {
  return corsOptionsResponse();
}
