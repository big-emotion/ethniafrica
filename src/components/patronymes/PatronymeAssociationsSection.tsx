import Link from "next/link";
import type { ReactNode } from "react";

import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheFieldList, type FicheField } from "@/components/fiche/FicheProse";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { resolveChapter } from "@/lib/fieldProvenance";
import { readGaps } from "@/lib/patronymes/content";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * AC4 — a non-hereditary patronymic works differently by region, so the
 * fiche says so explicitly, and offers the peoples and countries the term
 * reaches rather than leave the reader to infer a footprint from silence.
 *
 * The reach is two chapters of the strict model, `peoples` and `countries`,
 * and it now renders as two labelled fields rather than as two `<h3>` + `<ul>`
 * stacks. That was the whole defect: neither the headings nor the lists
 * carried a class, so a sub-heading came out at body size and a list of linked
 * peoples came out as an unmarked column of lines — two flat runs with nothing
 * saying they were two different things, let alone what tied them together.
 *
 * Each field resolves its own silence. A dossier that documents its peoples
 * and explains in `gaps[]` why it names no country now prints the editor's own
 * wording under « Pays », instead of one blanket sentence covering both.
 */
// @req REQ-133
export function PatronymeAssociationsSection({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  const { associatedPeoples, associatedCountries, nameSystem, content } =
    patronyme;
  const isNonHereditary = nameSystem === "non_hereditary_patronymic";
  const gaps = readGaps(content);

  /** The editor's own wording for an empty chapter, when they wrote one. */
  const gapNode = (fieldPath: string) => {
    const chapter = resolveChapter("name", fieldPath, null, gaps);
    return chapter.state === "documented-gap" ? (
      <FieldProvenanceMarker state={chapter.state} reason={chapter.reason} />
    ) : undefined;
  };

  const entityLinks = (
    entities: readonly { id: string; label: string; href: string }[]
  ): ReactNode => (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-afh-small">
      {entities.map((entity) => (
        <Link key={entity.id} href={entity.href} className="hover:underline">
          {entity.label}
        </Link>
      ))}
    </span>
  );

  const peoplesNode =
    associatedPeoples.length > 0
      ? entityLinks(
          associatedPeoples.map((people) => ({
            id: people.id,
            label: people.nameMain,
            href: getPeopleRoute("fr", people.id),
          }))
        )
      : gapNode("peoples");

  const countriesNode =
    associatedCountries.length > 0
      ? entityLinks(
          associatedCountries.map((country) => ({
            id: country.id,
            label: country.nameFr,
            href: getCountryRoute("fr", country.id),
          }))
        )
      : gapNode("countries");

  const fields: FicheField[] = [
    { label: t.associatedPeoplesLabel, node: peoplesNode },
    { label: t.associatedCountriesLabel, node: countriesNode },
  ];

  return (
    <FicheSection title={t.associationsTitle}>
      {isNonHereditary ? (
        <p className="afh-parchment-note">{t.nonHereditaryGuidance}</p>
      ) : null}
      {peoplesNode || countriesNode ? (
        <FicheFieldList fields={fields} />
      ) : (
        <FieldProvenanceMarker state="missing" />
      )}
    </FicheSection>
  );
}
