"use client";

import { useEffect, useState } from "react";

import { chapterAnchorId } from "@/lib/ficheChapters";

/** The chapter this section is, in the fiche's reading rail. */
const CHAPTER_TITLE = "Voix & récits";

interface PublicOralNarrative {
  id: string;
  narratorDisplayName: string | null;
  community: string;
  languageCode: string;
  narrativeKind: string;
  summary: string | null;
  variantOf: string | null;
}

interface OralNarrativesSectionProps {
  peopleId: string;
}

// @req REQ-095
export function OralNarrativesSection({
  peopleId,
}: OralNarrativesSectionProps) {
  const [narratives, setNarratives] = useState<PublicOralNarrative[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch(
      `/api/v2/oral-narratives?entityType=people&entityId=${encodeURIComponent(peopleId)}`
    )
      .then(async (response) => {
        if (!response.ok) return [];
        const body = await response.json();
        return (body.data ?? []) as PublicOralNarrative[];
      })
      .then((data) => {
        if (!cancelled) setNarratives(data);
      })
      .catch(() => {
        if (!cancelled) setNarratives([]);
      });

    return () => {
      cancelled = true;
    };
  }, [peopleId]);

  if (narratives.length === 0) return null;

  return (
    <section
      id={chapterAnchorId(CHAPTER_TITLE)}
      data-fiche-section={CHAPTER_TITLE}
      aria-labelledby="oral-narratives-title"
      className="people-fade-in space-y-3 overflow-hidden rounded-[var(--country-radius-xl)] p-[18px] md:rounded-[20px] md:p-6 xl:rounded-[22px] xl:p-7"
      style={{
        background: "var(--country-card)",
        border: "1px solid var(--country-border)",
      }}
    >
      <div>
        <h2
          id="oral-narratives-title"
          className="text-afh-small font-bold text-[var(--country-text)]"
        >
          {CHAPTER_TITLE}
        </h2>
        <p className="mt-1 text-afh-small text-[var(--country-text-soft)]">
          Des récits attribués, présentés sans les confondre avec des faits
          historiques établis.
        </p>
      </div>
      <ul className="space-y-3">
        {narratives.map((narrative) => (
          <li
            key={narrative.id}
            className="rounded-[var(--country-radius-md)] border border-[var(--country-border)] p-3 md:p-4"
          >
            <p className="text-afh-small font-semibold text-[var(--country-text)]">
              {narrative.narratorDisplayName
                ? `Récit attribué à ${narrative.narratorDisplayName}.`
                : "Récit attribué à une personne ayant choisi de rester anonyme."}
            </p>
            <p className="mt-1 text-afh-caption text-[var(--country-text-soft)]">
              {narrative.community} · {narrative.languageCode} ·{" "}
              {narrative.narrativeKind}
              {narrative.variantOf ? " · Variante liée" : ""}
            </p>
            {narrative.summary && (
              <p className="mt-3 text-afh-small leading-6 text-[var(--country-text)]">
                {narrative.summary}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
