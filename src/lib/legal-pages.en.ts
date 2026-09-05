/**
 * The English legal documents, a sidecar of legal-pages.ts.
 *
 * Kept out of `translations.ts` for the reason the French file records: a
 * legal notice inside the translations object travels into every client
 * bundle that reaches for any other string, and the quiz play island broke
 * its gzip budget carrying one. This file is read by three server-rendered
 * routes and by nothing a reader downloads.
 *
 * The text is agent-produced (DEC-048) and each document says so before its
 * first clause, together with the one thing a translated legal text owes the
 * reader: which version binds. The French prevails; counsel review of the
 * English wording is a follow-up, not a precondition for labelling it.
 *
 * Addresses, registration numbers, email and web addresses and the revision
 * date are the French file's, verbatim. The licence deed URL keeps its `.fr`
 * suffix because a URL is invariant (REQ-143), even where a `.en` deed exists.
 */

import type { LegalDocumentContent } from "@/components/layout/LegalDocument";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";
import type { legalPages } from "./legal-pages";

export interface MachineTranslatedLegalDocument extends LegalDocumentContent {
  provenance: Extract<TranslationKind, "machine">;
}

const FRENCH_PREVAILS_NOTICE = {
  title: "Translation notice",
  paragraphs: [
    "This English version is a machine translation of the French text, labelled as such. In case of discrepancy between the two versions, the French version prevails.",
  ],
} as const;

// @req REQ-145
export const legalPagesEn: Readonly<
  Record<keyof typeof legalPages, MachineTranslatedLegalDocument>
> = {
  legalNotice: {
    provenance: "machine",
    eyebrow: "Essential information",
    title: "Legal notice",
    lastUpdated: "Last updated: 25 July 2026",
    introduction:
      "This page presents the publisher, the publication director and the host of EthniAfrica.",
    sections: [
      FRENCH_PREVAILS_NOTICE,
      {
        title: "Site publisher",
        paragraphs: [
          "EthniAfrica is published by BIG EMOTION, a SASU (société par actions simplifiée à associé unique — a single-shareholder simplified joint-stock company) with a share capital of €500.",
          "Registered office: 14 rue Bausset, 75015 Paris, France. Paris Trade and Companies Register (RCS): 983 423 351. Intra-Community VAT number: FR30983423351.",
          "Contact: hello@big-emotion.com.",
        ],
      },
      {
        title: "Publication director",
        paragraphs: ["Jean-Noé Kollo, President of BIG EMOTION."],
      },
      {
        title: "Design and development",
        paragraphs: [
          "The design and development of the site were entrusted to the BIG EMOTION agency.",
          "Website: big-emotion.com.",
          "Email: hello@big-emotion.com.",
        ],
      },
      {
        title: "Hosting",
        paragraphs: [
          "The site is hosted and delivered by Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States. The application services and the project’s data are configured according to the regions documented in EthniAfrica’s infrastructure.",
        ],
      },
      {
        title: "Corpus licence",
        paragraphs: [
          "The EthniAfrica corpus — the records on peoples, countries and language families, together with the site’s editorial texts and the data derived from them — is made available under the Creative Commons Attribution–ShareAlike 4.0 International licence (CC BY-SA 4.0).",
          "This licence permits reproduction, modification and reuse, including for commercial purposes, on two conditions: crediting EthniAfrica and the address of the record reused, and placing any derivative work under the same licence. The citation block on every record provides the attribution wording to copy.",
          "The full text of the licence is available at creativecommons.org/licenses/by-sa/4.0/deed.fr.",
        ],
      },
      {
        title: "What the licence does not cover",
        paragraphs: [
          "The site’s source code is not covered by this licence. It remains the property of BIG EMOTION and no right of reuse is granted in respect of it.",
          "Data, quotations, trademarks, documents and visuals originating from third parties remain the property of their holders and keep their own terms of use, which the site indicates case by case. Their presence on EthniAfrica entails no transfer of rights, and the licence above does not extend to them.",
          "Facts themselves are not protectable by copyright. The database built by the project does, however, enjoy a distinct protection under Article L. 341-1 of the French Intellectual Property Code, for the benefit of BIG EMOTION as its producer; substantial extraction of its content remains subject to the licence above.",
        ],
      },
      {
        title: "Editorial responsibility",
        paragraphs: [
          "EthniAfrica documents historical, linguistic and cultural realities that may evolve or be the subject of debate. The project publishes its sources and makes reports visible in order to allow correction and documented discussion.",
        ],
      },
    ],
  },
  dataPolicy: {
    provenance: "machine",
    eyebrow: "Privacy and transparency",
    title: "Data policy",
    lastUpdated: "Last updated: 25 July 2026",
    introduction:
      "EthniAfrica limits the collection of personal data to what is strictly necessary and clearly distinguishes account data, editorial contributions and technical measurements.",
    sections: [
      FRENCH_PREVAILS_NOTICE,
      {
        title: "Data controller",
        paragraphs: [
          "The data controller is BIG EMOTION, 14 rue Bausset, 75015 Paris, France. For any question or request concerning personal data: contact@ethniafrica.com.",
        ],
      },
      {
        title: "Data processed",
        paragraphs: [
          "When an account is created, EthniAfrica may process an email address, a display name, the information needed for authentication and the confirmation of age.",
          "Contributions, corrections and reports are kept with the information needed to examine them and for editorial transparency. Technical logs may contain limited information related to the operation and security of the service.",
          "Consent preferences are stored in the browser to remember the choices made.",
        ],
      },
      {
        title: "Purposes and legal bases",
        paragraphs: [
          "Account data serves to provide access to the contribution features. Reports and editorial logs answer the project’s legitimate interest in reliability, security and transparency.",
          "Plausible audience measurement is activated only after consent. The functional preference controls whether a user context is attached to Sentry; without it, that context is erased. Technical diagnostics strictly necessary for security and stability may be processed on the basis of legitimate interest.",
          "Consent choices can be changed at any time from “Cookie settings” in the footer.",
        ],
      },
      {
        title: "Services and processors",
        paragraphs: [
          "Supabase provides authentication and database hosting. Vercel provides the hosting and delivery of the application.",
          "Plausible Analytics provides, after consent, audience statistics without advertising cookies. Sentry may receive a limited technical context, stripped of personally identifiable data, in order to diagnose errors.",
          "No personal data is sold, rented or used for advertising profiling.",
        ],
      },
      {
        title: "Retention periods",
        paragraphs: [
          "The contributor profile is kept for as long as the account remains active, then deleted within thirty days of a closure request.",
          "Contributions and reports may be kept in the editorial log; they are anonymised when an account is erased. Sentry error logs are kept for thirty days at most. Consent preferences expire after twelve months.",
        ],
      },
      {
        title: "Minors",
        paragraphs: [
          "The contribution features are reserved for persons aged at least sixteen. Between thirteen and fifteen, participation requires the explicit and verifiable consent of a parent or legal guardian, in accordance with the applicable legislation.",
        ],
      },
      {
        title: "Rights and complaints",
        paragraphs: [
          "Depending on their situation, every person has rights of access, rectification, erasure, objection, restriction and portability. These rights can be exercised by writing to contact@ethniafrica.com.",
          "A complaint may also be lodged with the Commission nationale de l’informatique et des libertés (CNIL), the French data protection authority, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France.",
        ],
      },
    ],
  },
  accessibility: {
    provenance: "machine",
    eyebrow: "An atlas open to everyone",
    title: "Accessibility",
    lastUpdated: "Last updated: 25 July 2026",
    introduction:
      "EthniAfrica aims for an experience that is usable on mobile, by keyboard and with assistive technologies. This statement describes the current state of the site without overstating it.",
    sections: [
      FRENCH_PREVAILS_NOTICE,
      {
        title: "Compliance status",
        paragraphs: [
          "EthniAfrica has not yet undergone a complete accessibility audit by a third party. The site therefore claims no rate of compliance with the RGAA or the WCAG at this stage.",
        ],
      },
      {
        title: "Measures already in place",
        paragraphs: [
          "The main interfaces use structured headings, explicit labels, identifiable navigation regions and keyboard-accessible controls.",
          "Components are designed mobile-first, contrasts are checked in the design system and essential animations honour the reduced-motion preference.",
        ],
      },
      {
        title: "Known limitations",
        paragraphs: [
          "Some charts, historical content and older journeys may still need an alternative description or improved keyboard navigation.",
          "The team continues to assess the journeys and corrects as a priority the obstacles that prevent access to information or to a feature.",
        ],
      },
      {
        title: "Report an obstacle",
        paragraphs: [
          "To report an accessibility problem, write to contact@ethniafrica.com, stating the page concerned, the device or assistive technology used and the difficulty encountered.",
        ],
      },
    ],
  },
};
