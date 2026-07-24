import { logger } from "@/lib/api/logger";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerificationResult = "verified" | "rejected" | "unavailable";

function isTurnstileResponse(value: unknown): value is { success: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof value.success === "boolean"
  );
}

// @req REQ-012
export async function verifyTurnstileToken(
  token: string,
  clientIp?: string
): Promise<TurnstileVerificationResult> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secret) {
    logger.warn("Turnstile verification is unavailable", {
      reason: "missing_secret",
    });
    return "unavailable";
  }

  const formData = new URLSearchParams({
    secret,
    response: token,
  });

  if (clientIp) {
    formData.set("remoteip", clientIp);
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      logger.warn("Turnstile verification is unavailable", {
        reason: "provider_error",
        status: response.status,
      });
      return "unavailable";
    }

    const payload: unknown = await response.json();

    if (!isTurnstileResponse(payload)) {
      logger.warn("Turnstile verification is unavailable", {
        reason: "malformed_response",
      });
      return "unavailable";
    }

    return payload.success ? "verified" : "rejected";
  } catch (error) {
    logger.error("Turnstile verification request failed", error);
    return "unavailable";
  }
}
