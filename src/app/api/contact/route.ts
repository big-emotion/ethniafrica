import { NextRequest } from "next/server";

import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";
import { CONTACT_EMAIL } from "@/lib/brand";
import { sendContactMessage } from "@/lib/email/contactMessage";
import { contactMessageSchema } from "@/lib/validations/contact";

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
      { error: "INVALID_JSON", message: "Requête illisible." },
      { status: 400 }
    );
  }

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
    const { fieldErrors } = parsed.error.flatten();
    return jsonWithCors(
      {
        error: "VALIDATION_ERROR",
        message: "Le formulaire comporte des champs à corriger.",
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
        message: `L'envoi est momentanément indisponible. Écrivez-nous directement à ${CONTACT_EMAIL}.`,
        contactEmail: CONTACT_EMAIL,
      },
      { status: 503 }
    );
  }

  if (outcome === "send-failed") {
    return jsonWithCors(
      {
        error: "EMAIL_SEND_FAILED",
        message: `Votre message n'a pas pu être envoyé. Écrivez-nous directement à ${CONTACT_EMAIL}.`,
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
