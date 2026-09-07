import Link from "next/link";

import { Card } from "@/components/ui/card";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";
import { getCountryCommonName } from "@/lib/countryNames";
import { formatNumber } from "@/lib/languageTag";
import { getLocalizedSearchResultName } from "@/lib/search/localizedResult";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

// The corpus enumerates five naming systems today; a sixth would reach the
// reader as its raw key unless the fallback catches it, and a raw key is the
// one thing this row must never print (REQ-124, amendment of 2026-09-05).
const NAME_SYSTEM_LABELS: Record<string, string> =
  translations.fr.patronymes.nameSystemLabels;
const UNKNOWN_NAME_SYSTEM_LABEL = "Non déterminé";
const NAME_SYSTEM_LABELS_EN: Record<string, string> = {
  clan_name: "Clan name",
  non_hereditary_patronymic: "Non-hereditary patronymic",
  nisba: "Nisba",
  praise_name: "Praise name (jamu)",
  totemic_clan: "Totemic clan",
};

// The panel is an 18–20 rem side column above 760 px; a name attested in
// fifteen countries would push the sources below the fold, so the chips stop
// here and the heading keeps the true total.
const CHIP_LIMIT = 5;

export interface DominantAnswerPanelProps {
  result: SearchResult;
  language: Language;
}

function countLabel(
  language: Language,
  count: number,
  singular: string,
  plural: string
): string {
  return `${formatNumber(language, count)} ${count === 1 ? singular : plural}`;
}

interface FactRow {
  testId: string;
  label: string;
  value: string;
}

/**
 * Facts the "En bref" card can show, one field set per entity type. Every
 * type used to share the people set (population, confidence, country ids,
 * exonyms, sources); a patronyme or language pivot never carries those, so
 * the card rendered its title over a permanently empty `<dl>` — falsely
 * implying the corpus knows nothing about the entity. `country` and
 * `languageFamily` results carry nothing beyond name/id yet
 * (`mapSearchEnvelope`), so their row list stays empty rather than
 * fabricating a field; the panel then renders nothing for them (see below).
 */
function factRowsFor(result: SearchResult, language: Language): FactRow[] {
  const en = language === "en";
  switch (result.type) {
    case "people":
      return [
        result.population != null
          ? {
              testId: "dominant-answer-population",
              label: "Population",
              value: formatNumber(language, Math.round(result.population)),
            }
          : null,
        result.confidence != null
          ? {
              testId: "dominant-answer-confidence",
              label: en ? "Confidence" : "Confiance",
              value: `${formatNumber(language, Math.round(result.confidence * 100))} %`,
            }
          : null,
        (result.countryIds?.length ?? 0) > 0
          ? {
              testId: "dominant-answer-countries",
              label: en ? "Countries" : "Pays",
              value: countLabel(
                language,
                result.countryIds!.length,
                en ? "country" : "pays",
                en ? "countries" : "pays"
              ),
            }
          : null,
        (result.exonyms?.length ?? 0) > 0
          ? {
              testId: "dominant-answer-exonyms",
              label: en ? "Exonyms" : "Exonymes",
              value: countLabel(
                language,
                result.exonyms!.length,
                en ? "exonym" : "exonyme",
                en ? "exonyms" : "exonymes"
              ),
            }
          : null,
        result.sourceCount != null
          ? {
              testId: "dominant-answer-sources",
              label: "Sources",
              value: countLabel(
                language,
                result.sourceCount,
                "source",
                "sources"
              ),
            }
          : null,
      ].filter((row): row is FactRow => row !== null);

    case "patronyme":
      return [
        result.nameSystem
          ? {
              testId: "dominant-answer-name-system",
              label: en ? "Naming system" : "Système de nom",
              value:
                (en
                  ? NAME_SYSTEM_LABELS_EN[result.nameSystem]
                  : NAME_SYSTEM_LABELS[result.nameSystem]) ??
                (en ? "Undetermined" : UNKNOWN_NAME_SYSTEM_LABEL),
            }
          : null,
        (result.associatedPeopleIds?.length ?? 0) > 0
          ? {
              testId: "dominant-answer-associated-peoples",
              label: en ? "Associated peoples" : "Peuples associés",
              value: countLabel(
                language,
                result.associatedPeopleIds!.length,
                en ? "people" : "peuple",
                en ? "peoples" : "peuples"
              ),
            }
          : null,
        (result.attestedCountryIds?.length ?? 0) > 0
          ? {
              testId: "dominant-answer-attested-countries",
              label: en ? "Attested countries" : "Pays attestés",
              value: countLabel(
                language,
                result.attestedCountryIds!.length,
                en ? "country" : "pays",
                en ? "countries" : "pays"
              ),
            }
          : null,
        result.sourceCount != null
          ? {
              testId: "dominant-answer-sources",
              label: "Sources",
              value: countLabel(
                language,
                result.sourceCount,
                "source",
                "sources"
              ),
            }
          : null,
      ].filter((row): row is FactRow => row !== null);

    case "language":
      return [
        result.languageFamilyName
          ? {
              testId: "dominant-answer-family",
              label: en ? "Family" : "Famille",
              value:
                en && result.languageFamilyNameEn
                  ? result.languageFamilyNameEn
                  : result.languageFamilyName,
            }
          : null,
        result.isoCode639_3
          ? {
              testId: "dominant-answer-iso-code",
              label: "Code ISO 639-3",
              value: result.isoCode639_3,
            }
          : null,
        (result.speakerPeopleIds?.length ?? 0) > 0
          ? {
              testId: "dominant-answer-speaker-peoples",
              label: en ? "Speaker peoples" : "Peuples locuteurs",
              value: countLabel(
                language,
                result.speakerPeopleIds!.length,
                en ? "people" : "peuple",
                en ? "peoples" : "peuples"
              ),
            }
          : null,
        result.sourceCount != null
          ? {
              testId: "dominant-answer-sources",
              label: "Sources",
              value: countLabel(
                language,
                result.sourceCount,
                "source",
                "sources"
              ),
            }
          : null,
      ].filter((row): row is FactRow => row !== null);

    default:
      // `country` and `languageFamily` carry no facts beyond name/id yet.
      return [];
  }
}

interface FicheChipProps {
  href: string;
  label: string;
}

/** Form D (actions charter §5): a value among several, on the page accent. */
function FicheChip({ href, label }: FicheChipProps) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "inline-flex min-h-11 items-center rounded-afh-full border border-[var(--accent)] px-afh-md text-afh-small font-semibold text-[color:var(--accent)] no-underline hover:underline",
          CHARTER_FOCUS_RING
        )}
      >
        {label}
      </Link>
    </li>
  );
}

function remainderMention(language: Language, hidden: number): string {
  if (language === "en") {
    return `and ${formatNumber(language, hidden)} other${hidden === 1 ? "" : "s"}`;
  }
  return hidden === 1
    ? "et 1 autre"
    : `et ${formatNumber(language, hidden)} autres`;
}

function sectionHeading(
  language: Language,
  title: string,
  count: number
): string {
  return `${title} (${formatNumber(language, count)})`;
}

const SECTION_CLASS = "mt-afh-lg border-t border-afh-border pt-afh-md";
const SECTION_HEADING_CLASS =
  "font-afh-display text-afh-small font-semibold text-afh-text";

interface ChipSectionProps {
  language: Language;
  title: string;
  /** The corpus total, which the chips may not reach (see below). */
  total: number;
  chips: FicheChipProps[];
}

/**
 * `total` and `chips.length` differ for two reasons: the chip row is capped
 * at `CHIP_LIMIT`, and an associated people whose fiche is missing is counted
 * but never listed (its id must not surface). The remainder mention covers
 * both.
 */
function ChipSection({ language, title, total, chips }: ChipSectionProps) {
  if (chips.length === 0) {
    return null;
  }
  const shown = chips.slice(0, CHIP_LIMIT);
  const hidden = total - shown.length;

  return (
    <section className={SECTION_CLASS}>
      <h3 className={SECTION_HEADING_CLASS}>
        {sectionHeading(language, title, total)}
      </h3>
      <ul className="mt-afh-sm flex flex-wrap gap-afh-xs">
        {shown.map((chip) => (
          <FicheChip key={chip.href} {...chip} />
        ))}
      </ul>
      {hidden > 0 && (
        <p className="mt-afh-xs text-afh-caption text-afh-fg-muted">
          {remainderMention(language, hidden)}
        </p>
      )}
    </section>
  );
}

// @req REQ-124
export function DominantAnswerPanel({
  result,
  language,
}: DominantAnswerPanelProps) {
  const factRows = factRowsFor(result, language);
  const externalLinks = (result.externalLinks ?? []).filter(
    ({ title, url }) => title.trim().length > 0 && url.trim().length > 0
  );

  // Nothing this type's fact set covers is populated: a titled card over an
  // empty `<dl>` would read as "the corpus knows nothing", which is false —
  // it just doesn't know facts of *this* shape. Render nothing instead.
  if (factRows.length === 0) {
    return null;
  }

  const attestedCountryIds = result.attestedCountryIds ?? [];
  const associatedPeoples = result.associatedPeoples ?? [];

  return (
    <aside
      aria-label={language === "en" ? "Dominant answer" : "Réponse dominante"}
      className="h-fit"
    >
      <Card className="border-l-4 border-l-[var(--accent)] p-afh-md">
        <p className="text-afh-eyebrow font-bold uppercase tracking-[0.11em] text-afh-fg-muted">
          {language === "en" ? "At a glance" : "En bref"}
        </p>
        <h2 className="mt-afh-xs font-afh-display text-afh-h3 font-semibold text-afh-text">
          {getLocalizedSearchResultName(result, language)}
        </h2>

        <dl className="mt-afh-md grid grid-cols-2 gap-afh-sm">
          {factRows.map((row) => (
            <div
              key={row.testId}
              className="min-w-0 border-t border-afh-border pt-afh-xs"
            >
              <dt className="text-afh-caption text-afh-fg-muted">
                {row.label}
              </dt>
              <dd
                data-testid={row.testId}
                className="min-w-0 break-words text-afh-small font-semibold text-afh-text"
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <ChipSection
          language={language}
          title={language === "en" ? "Attested countries" : "Pays attestés"}
          total={attestedCountryIds.length}
          chips={attestedCountryIds.map((iso3) => ({
            href: getCountryRoute(language, iso3),
            label: getCountryCommonName(language, iso3, iso3),
          }))}
        />

        <ChipSection
          language={language}
          title={language === "en" ? "Associated peoples" : "Peuples associés"}
          total={result.associatedPeopleIds?.length ?? 0}
          chips={associatedPeoples.map(({ id, name }) => ({
            href: getPeopleRoute(language, id),
            label: name,
          }))}
        />

        {externalLinks.length > 0 && (
          <section className={SECTION_CLASS}>
            <h3 className={SECTION_HEADING_CLASS}>
              {sectionHeading(
                language,
                "Sources",
                result.sourceCount ?? externalLinks.length
              )}
            </h3>
            <div className="mt-afh-sm max-h-[12rem] overflow-y-auto">
              <ul className="space-y-afh-xs">
                {externalLinks.map(({ title, url }) => (
                  <li key={`${title}-${url}`}>
                    <a
                      href={url}
                      title={title}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-block rounded-afh-sm text-afh-small text-afh-text underline underline-offset-2 ${CHARTER_FOCUS_RING}`}
                    >
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </Card>
    </aside>
  );
}
