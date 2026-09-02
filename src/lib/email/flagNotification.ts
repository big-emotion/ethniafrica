import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/api/logger";
import { sendViaResend } from "@/lib/email/resend";
import type { Language } from "@/types/shared";
import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";

const FR: Language = "fr";

export type FlagResolutionStatus = "accepted" | "rejected" | "duplicate";

export interface FlagResolutionInput {
  public_slug: string;
  status: FlagResolutionStatus;
  moderator_notes: string | null;
  target_type: string | null;
  target_id: string | null;
}

/**
 * Whoever the decision is owed to.
 *
 * It used to be a contributor, with an id, because an address could only come
 * from an account. An accountless reporter who verified their address is owed
 * the same message and has no id at all — so the recipient is the address, and
 * nothing else.
 */
export interface FlagResolutionRecipient {
  email: string;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function flagPageUrl(publicSlug: string): string {
  return `${siteUrl()}/fr/signalements/${publicSlug}`;
}

/**
 * Only the three entity types a flag can target and that have a fiche route
 * resolve to a link — `fiche_section`, `assertion`, `source` and `general`
 * describe something narrower than a single fiche, so the email omits the
 * line rather than link to the wrong page.
 */
function ficheUrl(
  targetType: string | null,
  targetId: string | null
): string | null {
  if (!targetType || !targetId) return null;
  switch (targetType) {
    case "people":
      return `${siteUrl()}${getPeopleRoute(FR, targetId)}`;
    case "country":
      return `${siteUrl()}${getCountryRoute(FR, targetId)}`;
    case "language_family":
      return `${siteUrl()}${getFamilyRoute(FR, targetId)}`;
    default:
      return null;
  }
}

interface EmailContent {
  subject: string;
  text: string;
}

function buildEmailContent(flag: FlagResolutionInput): EmailContent {
  const flagLink = flagPageUrl(flag.public_slug);
  const notes = flag.moderator_notes?.trim() || null;

  if (flag.status === "accepted") {
    const fiche = ficheUrl(flag.target_type, flag.target_id);
    return {
      subject: `Votre signalement ${flag.public_slug} a été accepté`,
      text: [
        `Votre signalement ${flag.public_slug} a été accepté.`,
        notes ? `Notes du modérateur : ${notes}` : null,
        `Voir votre signalement : ${flagLink}`,
        fiche ? `Voir la fiche mise à jour : ${fiche}` : null,
      ]
        .filter((line): line is string => line !== null)
        .join("\n\n"),
    };
  }

  if (flag.status === "rejected") {
    return {
      subject: `Votre signalement ${flag.public_slug} a été examiné`,
      text: [
        `Votre signalement ${flag.public_slug} a été examiné.`,
        notes ? `Notes du modérateur : ${notes}` : null,
        `Voir votre signalement : ${flagLink}`,
      ]
        .filter((line): line is string => line !== null)
        .join("\n\n"),
    };
  }

  // duplicate — the schema carries no dedicated "duplicate of" reference, so
  // the original flag it points to travels the same way the moderator
  // records it everywhere else in this flow: in moderator_notes.
  return {
    subject: `Votre signalement ${flag.public_slug} — doublon détecté`,
    text: [
      `Votre signalement ${flag.public_slug} a été identifié comme un doublon d'un signalement déjà traité.`,
      notes ? `Signalement d'origine : ${notes}` : null,
      `Voir votre signalement : ${flagLink}`,
    ]
      .filter((line): line is string => line !== null)
      .join("\n\n"),
  };
}

const sendNotification = (apiKey: string, to: string, content: EmailContent) =>
  sendViaResend(apiKey, { to, subject: content.subject, text: content.text });

/**
 * Notify a contributor that their flag reached a terminal decision.
 *
 * Best-effort by design (ETNI-73): the flag's state transition already
 * committed by the time this runs, and nothing here may roll it back, so
 * every failure path logs and reports to Sentry rather than throwing.
 *
 * `RESEND_API_KEY` is the only transport this repo can actually drive today
 * — Supabase Auth's admin API sends its own fixed auth templates (magic
 * link, invite…), not arbitrary content, so there is no generic "Supabase
 * SMTP" call to fall back to. Unset, this logs and skips rather than
 * fabricating a send.
 */
// @req REQ-015
export async function sendFlagResolutionEmail(
  flag: FlagResolutionInput,
  recipient: FlagResolutionRecipient | null
): Promise<void> {
  try {
    if (!recipient) {
      // Nobody to write to: the report was never attributed, the contributor
      // was erased (Story 4.4), or the reader left no address — or left one
      // and never proved it, which is the same thing as far as writing goes.
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      logger.warn(
        "Flag resolution email not sent: no email transport configured",
        { flagSlug: flag.public_slug, status: flag.status }
      );
      return;
    }

    const content = buildEmailContent(flag);
    const sent = await sendNotification(apiKey, recipient.email, content);
    if (sent) {
      logger.info("Flag resolution email sent", {
        flagSlug: flag.public_slug,
        status: flag.status,
      });
    }
  } catch (error) {
    logger.error("Unexpected error sending flag resolution email", error, {
      flagSlug: flag.public_slug,
    });
    Sentry.captureException(error);
  }
}

/** What the verification e-mail needs to say who it is about. */
// @req REQ-012
export interface FlagVerificationEmail {
  email: string;
  token: string;
  publicSlug: string;
}

/**
 * Ask a reader to confirm the address they left on a report.
 *
 * This is the one message the atlas will ever send to an unproven address, and
 * it exists precisely so there is never a second: anyone can type someone
 * else's address into the report form, and only the person holding the inbox
 * can turn it into a channel.
 *
 * The report is already published by the time this is sent. The link decides
 * whether a decision comes back, never whether the report counts.
 */
// @req REQ-012
export async function sendFlagVerificationEmail({
  email,
  token,
  publicSlug,
}: FlagVerificationEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn(
      "Flag verification email not sent: no email transport configured",
      { flagSlug: publicSlug }
    );
    return false;
  }

  const verificationLink = `${siteUrl()}/fr/signalements/verifier?token=${encodeURIComponent(token)}`;

  return sendNotification(apiKey, email, {
    subject: "Confirmez votre adresse pour suivre votre signalement",
    text: [
      "Votre signalement est bien enregistré et déjà consultable :",
      flagPageUrl(publicSlug),
      "Pour recevoir la décision de la modération par e-mail, confirmez cette adresse :",
      verificationLink,
      "Ce lien est valable 24 heures et ne fonctionne qu'une fois. Si vous n'avez rien signalé, ignorez ce message : sans confirmation, cette adresse ne sera plus utilisée.",
      "EthniAfrica — Atlas des Peuples d'Afrique",
    ].join("\n\n"),
  });
}
