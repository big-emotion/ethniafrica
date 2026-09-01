import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/api/logger";
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

export interface FlagResolutionContributor {
  id: string;
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

async function sendViaResend(
  apiKey: string,
  to: string,
  content: EmailContent
): Promise<boolean> {
  const domain = process.env.NEXT_PUBLIC_CANONICAL_DOMAIN ?? "ethniafrica.com";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `EthniAfrica <notifications@${domain}>`,
        to,
        subject: content.subject,
        text: content.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error("Flag resolution email send failed", undefined, {
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
    logger.error("Flag resolution email send threw", error);
    Sentry.captureException(error);
    return false;
  }
}

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
  contributor: FlagResolutionContributor | null
): Promise<void> {
  try {
    if (!contributor) {
      // No contributor_id — never attributed, or erased since (Story 4.4).
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
    const sent = await sendViaResend(apiKey, contributor.email, content);
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
