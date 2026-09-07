import type { FlagResolutionStatus } from "@/lib/email/flagNotification";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

/**
 * The reporter's e-mails in English — the sidecar of `flagNotification.ts`
 * (REQ-145): the three resolution mails and the address-verification mail.
 *
 * These are templates, not senders. The French module builds its links
 * itself, from `getPeopleRoute("fr", …)` and a `/fr/signalements/` path;
 * the English ones cannot yet — `Language` is still `"fr"` until the
 * bilingual foundation lands, and the English path segments are that PR's
 * decision. So the links arrive resolved, and the wiring PR is where the
 * sender learns which locale the reporter wrote in (the flags table records
 * none today).
 *
 * « Signalement » is a report, « fiche » stays a fiche — the word the atlas
 * uses for its records in English too. Agent-authored under DEC-048, hence
 * `machine`.
 */
export interface EmailContentEn {
  subject: string;
  text: string;
  provenance: Extract<TranslationKind, "machine">;
}

export interface FlagResolutionEmailEn {
  publicSlug: string;
  status: FlagResolutionStatus;
  moderatorNotes: string | null;
  /** The report's own page. */
  flagLink: string;
  /** The fiche the report targeted, when it has a page of its own. */
  ficheLink: string | null;
}

const paragraphs = (lines: Array<string | null>): string =>
  lines.filter((line): line is string => line !== null).join("\n\n");

// @req REQ-145
export function buildFlagResolutionEmailEn({
  publicSlug,
  status,
  moderatorNotes,
  flagLink,
  ficheLink,
}: FlagResolutionEmailEn): EmailContentEn {
  const notes = moderatorNotes?.trim() || null;
  const viewReport = `View your report: ${flagLink}`;

  if (status === "accepted") {
    return {
      subject: `Your report ${publicSlug} has been accepted`,
      text: paragraphs([
        `Your report ${publicSlug} has been accepted.`,
        notes ? `Moderator notes: ${notes}` : null,
        viewReport,
        ficheLink ? `View the updated fiche: ${ficheLink}` : null,
      ]),
      provenance: "machine",
    };
  }

  if (status === "rejected") {
    return {
      subject: `Your report ${publicSlug} has been reviewed`,
      text: paragraphs([
        `Your report ${publicSlug} has been reviewed.`,
        notes ? `Moderator notes: ${notes}` : null,
        viewReport,
      ]),
      provenance: "machine",
    };
  }

  // As in French, the original report travels in the moderator's notes: the
  // schema carries no dedicated "duplicate of" reference.
  return {
    subject: `Your report ${publicSlug} — duplicate detected`,
    text: paragraphs([
      `Your report ${publicSlug} has been identified as a duplicate of a report already handled.`,
      notes ? `Original report: ${notes}` : null,
      viewReport,
    ]),
    provenance: "machine",
  };
}

export interface FlagVerificationEmailEn {
  flagLink: string;
  verificationLink: string;
}

// @req REQ-145
export function buildFlagVerificationEmailEn({
  flagLink,
  verificationLink,
}: FlagVerificationEmailEn): EmailContentEn {
  return {
    subject: "Confirm your address to follow your report",
    text: paragraphs([
      "Your report has been recorded and can already be viewed:",
      flagLink,
      "To receive the moderation decision by e-mail, confirm this address:",
      verificationLink,
      "This link is valid for 24 hours and works only once. If you have not reported anything, ignore this message: without confirmation, this address will not be used again.",
      // The French signs off with PRODUCT_TAGLINE; its English form is a
      // brand decision the charter has not taken, so this is the plain
      // translation until it does.
      "EthniAfrica — Atlas of the Peoples of Africa",
    ]),
    provenance: "machine",
  };
}
