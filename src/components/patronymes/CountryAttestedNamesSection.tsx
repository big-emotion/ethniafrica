import Link from "next/link";

import type {
  CountryPatronymes,
  PatronymeLinkSummary,
  PatronymeReachSummary,
} from "@/api/v2/services/patronymeFicheLinks";
import { FicheFieldList, type FicheField } from "@/components/fiche/FicheProse";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { getPatronymeRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

export interface CountryAttestedNamesSectionProps {
  /** The country's two name lists, `null` when the read failed. */
  patronymes: CountryPatronymes | null;
  language: Language;
}

/**
 * « Noms du pays » — the names a country answers for (REQ-133, REQ-154).
 *
 * Two labelled lists in one chapter, never a sum. They assert different
 * things: the direct link says a source attests the name in this country, the
 * people route says the peoples who bear it live here. Neither contains the
 * other — 2 countries are reachable only directly (Ethiopia and Eritrea, whose
 * non-hereditary patronymics designate no group at all) and 6 only through
 * their peoples. `docs/design/name-to-country-linking.md` carries the argument.
 *
 * They are two `<dt>` fields rather than two sibling chapters for two reasons.
 * A `<dt>` is out of the document outline, so the fiche keeps the one heading
 * level there is under an `h2`; and on the ~50 country fiches where both lists
 * are empty, two sibling chapters would put two adjacent gap notices in the
 * reading rail and advertise the corpus as thinner than it is. One chapter
 * states the silence once.
 */
type CountryName = PatronymeLinkSummary | PatronymeReachSummary;

function initial(name: string): string {
  return (
    name
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .match(/^[A-Z]/)?.[0] ?? "#"
  );
}

function nameGloss(name: CountryName, language: Language): string {
  const copy = getTranslation(language).patronymes;
  const system = copy.nameSystemLabels[name.nameSystem];
  if (!("viaPeoples" in name) || name.viaPeoples.length === 0) return system;
  const peoples = name.viaPeoples.map((people) => people.nameMain).join(", ");
  return `${system} · ${copy.onFiche.reachViaPrefix} ${peoples}`;
}

function CountryNameIndex({
  names,
  language,
  register,
  registerLabel,
}: {
  names: readonly CountryName[];
  language: Language;
  register: "attested" | "reach";
  registerLabel: string;
}) {
  const copy = getTranslation(language).patronymes;
  const sorted = [...names].sort((a, b) =>
    a.nameMain.localeCompare(b.nameMain, language, { sensitivity: "base" })
  );
  const groups = new Map<string, CountryName[]>();
  for (const name of sorted) {
    const letter = initial(name.nameMain);
    const group = groups.get(letter) ?? [];
    group.push(name);
    groups.set(letter, group);
  }

  return (
    <>
      <nav
        aria-label={`${copy.onFiche.countryAlphabeticalIndexLabel} — ${registerLabel}`}
        className="mb-afh-md flex flex-wrap gap-afh-xs text-start"
      >
        {Array.from(groups.keys()).map((letter) => (
          <a
            key={letter}
            href={`#country-name-${register}-${letter.toLowerCase()}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-afh-sm border border-afh-border text-afh-body font-semibold text-afh-text hover:underline"
          >
            {letter}
          </a>
        ))}
      </nav>
      {Array.from(groups, ([letter, entries]) => (
        <div key={letter} className="mb-afh-md">
          <h3
            id={`country-name-${register}-${letter.toLowerCase()}`}
            className="mb-afh-xs text-afh-body font-semibold text-afh-text"
            style={{
              scrollMarginTop:
                "calc(var(--afh-header-height) + var(--afh-chapter-bar-height) + var(--afh-space-md))",
            }}
          >
            {letter}
          </h3>
          <ul className="afh-prose-list">
            {entries.map((name, index) => {
              const gloss = nameGloss(name, language);
              const previous = entries[index - 1];
              const previousGloss = previous
                ? nameGloss(previous, language)
                : null;
              return (
                <li key={name.id}>
                  <Link
                    href={getPatronymeRoute(language, name.id)}
                    className="font-semibold hover:underline"
                    style={{ color: "var(--afh-text)" }}
                  >
                    {name.nameMain}
                  </Link>{" "}
                  {gloss !== previousGloss ? (
                    <span className="text-afh-small">{gloss}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

// @req REQ-133
// @req REQ-154
export function CountryAttestedNamesSection({
  patronymes,
  language,
}: CountryAttestedNamesSectionProps) {
  const copy = getTranslation(language).patronymes.onFiche;
  // These ids were already published through FicheSection's title-derived
  // anchor. Keep shared links working when the visible title changes.
  const chapterId =
    language === "fr" ? "chapitre-noms-attestes" : "chapitre-attested-names";

  if (patronymes === null) {
    return (
      <FicheSection title={copy.countryTitle} id={chapterId}>
        <FieldProvenanceMarker
          state="documented-gap"
          reason={copy.countryUnavailable}
          language={language}
        />
      </FicheSection>
    );
  }

  const { attested, borneByPeoples } = patronymes;

  if (attested.length === 0 && borneByPeoples.length === 0) {
    return (
      <FicheSection title={copy.countryTitle} id={chapterId}>
        <FieldProvenanceMarker
          state="documented-gap"
          reason={copy.countryEmpty}
          language={language}
        />
      </FicheSection>
    );
  }

  // An empty list drops its own label rather than printing a second gap
  // notice: the chapter has already stated what it holds, and a country whose
  // peoples add nothing is not owed a sentence about it.
  const fields: FicheField[] = [];
  if (attested.length > 0) {
    fields.push({
      label: copy.attestedLabel,
      node: (
        <CountryNameIndex
          names={attested}
          language={language}
          register="attested"
          registerLabel={copy.attestedLabel}
        />
      ),
    });
  }
  if (borneByPeoples.length > 0) {
    fields.push({
      label: copy.reachLabel,
      node: (
        <CountryNameIndex
          names={borneByPeoples}
          language={language}
          register="reach"
          registerLabel={copy.reachLabel}
        />
      ),
    });
  }

  return (
    <FicheSection title={copy.countryTitle} id={chapterId}>
      <FicheFieldList fields={fields} language={language} />
    </FicheSection>
  );
}
