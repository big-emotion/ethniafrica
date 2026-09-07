import { NextRequest } from "next/server";

import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";
import { CONTACT_EMAIL } from "@/lib/brand";
import { sendContactMessage } from "@/lib/email/contactMessage";
import { contactMessageSchema } from "@/lib/validations/contact";
import { contactCopy } from "@/lib/i18n/copy/contact";
import { isTranslationLocale } from "@/lib/i18n/translationLocale";
import type { Language } from "@/types/shared";

function requestLanguage(body: unknown): Language {
  if (body === null || typeof body !== "object" || !("language" in body)) {
    return "fr";
  }
  const language = String(body.language);
  return isTranslationLocale(language) ? language : "fr";
}

/**
 * The contact form's only endpoint.
 *
 * It sits outside `/api/v2` deliberately: the v2 surface is the public,
 * key-gated read API of the corpus, and this is a write from the site's own
 * form with nothing to publish. `/api/contributions` is the precedent, and
 * this route copies its shape — honeypot first, then the schema, then the
 * side effect.
 *
 * Nothing is persisted. A row would be a second inbox nobody reads, and the
 * message is already durable in the mailbox it lands in.
 */
// @req REQ-045
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonWithCors(
      { error: "INVALID_JSON", message: contactCopy.fr.server.invalidJson },
      { status: 400 }
    );
  }

  const language = requestLanguage(body);
  const copy = contactCopy[language].server;

  // A bot that filled the hidden field is answered exactly as a reader is:
  // told the message went, told nothing about why it did not.
  if (
    body !== null &&
    typeof body === "object" &&
    "honeypot" in body &&
    typeof body.honeypot === "string" &&
    body.honeypot !== ""
  ) {
    return jsonWithCors({ success: true }, { status: 201 });
  }

  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    const { fieldErrors: schemaFieldErrors } = parsed.error.flatten();
    const fieldErrors =
      language === "fr"
        ? schemaFieldErrors
        : Object.fromEntries(
            Object.keys(schemaFieldErrors).map((field) => [
              field,
              [copy.fieldErrors[field as keyof typeof copy.fieldErrors]],
            ])
          );
    return jsonWithCors(
      {
        error: "VALIDATION_ERROR",
        message: copy.validationFailed,
        fieldErrors,
      },
      { status: 400 }
    );
  }

  const outcome = await sendContactMessage(parsed.data);

  if (outcome === "no-transport") {
    logger.warn("Contact message not sent: no email transport configured", {
      subject: parsed.data.subject,
    });
    return jsonWithCors(
      {
        error: "EMAIL_TRANSPORT_UNAVAILABLE",
        message: copy.transportUnavailable(CONTACT_EMAIL),
        contactEmail: CONTACT_EMAIL,
      },
      { status: 503 }
    );
  }

  if (outcome === "send-failed") {
    return jsonWithCors(
      {
        error: "EMAIL_SEND_FAILED",
        message: copy.sendFailed(CONTACT_EMAIL),
        contactEmail: CONTACT_EMAIL,
      },
      { status: 502 }
    );
  }

  logger.info("Contact message sent", { subject: parsed.data.subject });
  return jsonWithCors({ success: true }, { status: 201 });
}

// @req REQ-045
export async function OPTIONS() {
  return corsOptionsResponse();
}
