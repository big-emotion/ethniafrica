import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors } from "@/lib/api/cors";

// @req REQ-093
export const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

interface HandlerResult<T> {
  status: number;
  body: T;
}

// @req REQ-093
export function getReferenceAccessToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  return authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

// @req REQ-093
export function responseFromReferenceHandler<T>(result: HandlerResult<T>) {
  return jsonWithCors(result.body, {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}

function redactAssetValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAssetValue);
  if (!value || typeof value !== "object") return value;

  return Object.entries(value).reduce<Record<string, unknown>>(
    (redacted, [key, nestedValue]) => {
      if (
        key === "content" ||
        key === "object_path" ||
        key === "objectPath" ||
        key === "path"
      ) {
        return redacted;
      }
      redacted[key] = redactAssetValue(nestedValue);
      return redacted;
    },
    {}
  );
}

// @req REQ-093
export function responseFromAssetHandler<T>(result: HandlerResult<T>) {
  return jsonWithCors(redactAssetValue(result.body), {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}

// @req REQ-093
export function validationErrorResponse(message: string) {
  return jsonWithCors(createApiError({ code: "VALIDATION_ERROR", message }), {
    status: 400,
    headers: NO_STORE_HEADERS,
  });
}

// @req REQ-093
export function internalErrorResponse() {
  return jsonWithCors(
    createApiError({
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    }),
    { status: 500, headers: NO_STORE_HEADERS }
  );
}
