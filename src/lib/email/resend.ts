import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/api/logger";
import { CANONICAL_DOMAIN } from "@/lib/brand";

/**
 * The one HTTP call this repository makes to send a mail.
 *
 * It was written twice inside `flagNotification.ts` before the contact form
 * needed a third caller. Kept private there, a second sender would have had
 * to copy the failure handling too — and the whole value of that handling is
 * that it is identical everywhere: a send that fails must never throw into a
 * flow whose state has already committed.
 *
 * Resend is the only transport this repository can drive. Supabase Auth's
 * admin API sends its own fixed templates, not arbitrary content, so there is
 * no generic SMTP fall-back to reach for.
 */
export interface ResendMessage {
  to: string;
  subject: string;
  text: string;
  /**
   * Where an answer goes when it is not to us. The From is always our own
   * transport, so without this a recipient can read a message and have no way
   * to reply to whoever wrote it.
   */
  replyTo?: string;
  /** The local part of the From address, e.g. `notifications`. */
  fromMailbox?: string;
  /** What the recipient sees the mail is from, before the address. */
  fromName?: string;
}

// @req REQ-015
// @req REQ-045
export function resendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY;
}

/** True when the mail left, false when it did not — never a throw. */
// @req REQ-015
// @req REQ-045
export async function sendViaResend(
  apiKey: string,
  message: ResendMessage
): Promise<boolean> {
  const domain = process.env.NEXT_PUBLIC_CANONICAL_DOMAIN ?? CANONICAL_DOMAIN;
  const mailbox = message.fromMailbox ?? "notifications";
  const fromName = message.fromName ?? "EthniAfrica";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${mailbox}@${domain}>`,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error("Resend email send failed", undefined, {
        status: response.status,
        body,
      });
      Sentry.captureException(
        new Error(`Resend email send failed with status ${response.status}`)
      );
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Resend email send threw", error);
    Sentry.captureException(error);
    return false;
  }
}
