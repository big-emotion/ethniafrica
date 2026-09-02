import { CONTACT_EMAIL, PRODUCT_NAME } from "@/lib/brand";
import { resendApiKey, sendViaResend } from "@/lib/email/resend";
import {
  CONTACT_CIVILITY_LABEL,
  subjectLabel,
  type ContactMessageInput,
} from "@/lib/validations/contact";

/**
 * Why the outcome is three-valued rather than a boolean.
 *
 * "Nothing is configured" and "the transport refused it" are the same thing
 * for the reader — their message did not leave — but not for whoever is on
 * call: the first is a deployment that is missing a secret, the second is a
 * transport that answered. Collapsing them is how a form ends up green in CI
 * and dead in production, which is exactly what `ANTIBOT_HMAC_SECRET` did.
 */
export type ContactSendOutcome = "sent" | "no-transport" | "send-failed";

/**
 * The line the recipient sees in their inbox list.
 *
 * The subject the reader chose leads, because that is what the single mailbox
 * sorts on; the name follows so two messages under one subject are still
 * distinguishable without opening either.
 */
function mailSubject(message: ContactMessageInput): string {
  return `[${PRODUCT_NAME}] ${subjectLabel(message.subject)} — ${message.firstName} ${message.lastName}`;
}

function mailBody(message: ContactMessageInput): string {
  const civility = message.civility
    ? CONTACT_CIVILITY_LABEL[message.civility]
    : null;
  const sender = [civility, message.firstName, message.lastName]
    .filter((part): part is string => part !== null)
    .join(" ");

  return [
    `De : ${sender}`,
    `Adresse : ${message.email}`,
    `Objet : ${subjectLabel(message.subject)}`,
    "---",
    message.message,
    "---",
    "Message envoyé depuis le formulaire de contact du site.",
  ].join("\n\n");
}

/**
 * Carry a reader's message to the atlas's contact mailbox.
 *
 * Unlike the flag notifications beside it, this send is **not** best-effort:
 * nothing else records the message, so a failure here loses it outright and
 * the caller has to be able to tell the reader so.
 */
// @req REQ-045
export async function sendContactMessage(
  message: ContactMessageInput
): Promise<ContactSendOutcome> {
  const apiKey = resendApiKey();
  if (!apiKey) return "no-transport";

  const sent = await sendViaResend(apiKey, {
    to: CONTACT_EMAIL,
    replyTo: message.email,
    subject: mailSubject(message),
    text: mailBody(message),
  });

  return sent ? "sent" : "send-failed";
}
