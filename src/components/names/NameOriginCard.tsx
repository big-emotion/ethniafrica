/**
 * NameOriginCard — Epic 8 Story 8.8 (ETNI-472).
 *
 * Renders one name record: the name in Fraunces (weight 700) tagged with
 * `lang` from `languageOfOrigin` when known (UX-DR38), meaning + imposition
 * context in Nunito Sans body, and a required `confidenceChip` slot
 * (source-attached rule, UX-DR49 #2). Renders only the fields it is given —
 * never a placeholder, never an invented value.
 *
 * Note: the people's own endonym is always rendered through
 * `AutonymExonymHeading` (UX-DR49 #1); this card is for name-dossier
 * records, not the fiche header.
 */

import type { ReactNode } from "react";

import { NameTypeBadge } from "@/components/names/NameTypeBadge";
import type { NameRecordView } from "@/types/names";
import { bcp47LanguageTag } from "@/lib/languageTag";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

export interface NameOriginCardProps {
  record: NameRecordView;
  confidenceChip: ReactNode;
  language?: Language;
}

// @req REQ-056
export function NameOriginCard({
  record,
  confidenceChip,
  language = FALLBACK_LOCALE,
}: NameOriginCardProps) {
  const labels =
    language === "en"
      ? {
          meaning: "Meaning:",
          imposedBy: "Imposed by:",
          period: "Period:",
          problematic: "Why problematic:",
          contemporary: "Contemporary usage:",
        }
      : {
          meaning: "Signification :",
          imposedBy: "Imposé par :",
          period: "Période :",
          problematic: "Pourquoi problématique :",
          contemporary: "Usage contemporain :",
        };
  const {
    nameText,
    nameType,
    languageOfOrigin,
    meaning,
    imposedBy,
    impositionPeriod,
    whyProblematic,
    contemporaryUsage,
  } = record;

  const hasImpositionContext =
    Boolean(imposedBy) ||
    Boolean(impositionPeriod) ||
    Boolean(whyProblematic) ||
    Boolean(contemporaryUsage);

  return (
    <article className="rounded-lg border border-afh-border bg-afh-surface p-afh-lg">
      <div className="flex flex-wrap items-center gap-afh-sm">
        <span
          lang={bcp47LanguageTag(languageOfOrigin)}
          className="font-afh-display text-afh-h3 font-bold text-afh-text"
        >
          {nameText}
        </span>
        <NameTypeBadge
          nameType={nameType}
          imposed={Boolean(imposedBy)}
          language={language}
        />
      </div>

      {meaning ? (
        <p className="mt-afh-sm font-afh text-afh-body text-afh-text-soft">
          <strong>{labels.meaning}</strong> {meaning}
        </p>
      ) : null}

      {hasImpositionContext ? (
        <dl className="mt-afh-sm font-afh text-afh-body text-afh-text-soft">
          {imposedBy ? (
            <div>
              <dt className="inline font-semibold">{labels.imposedBy} </dt>
              <dd className="inline">{imposedBy}</dd>
            </div>
          ) : null}
          {impositionPeriod ? (
            <div>
              <dt className="inline font-semibold">{labels.period} </dt>
              <dd className="inline">{impositionPeriod}</dd>
            </div>
          ) : null}
          {whyProblematic ? (
            <div>
              <dt className="inline font-semibold">{labels.problematic} </dt>
              <dd className="inline">{whyProblematic}</dd>
            </div>
          ) : null}
          {contemporaryUsage ? (
            <div>
              <dt className="inline font-semibold">{labels.contemporary} </dt>
              <dd className="inline">{contemporaryUsage}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-afh-sm">{confidenceChip}</div>
    </article>
  );
}
