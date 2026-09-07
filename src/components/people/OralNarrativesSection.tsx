"use client";

import { useEffect, useState } from "react";

import { chapterAnchorId } from "@/lib/ficheChapters";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

/** The chapter this section is, in the fiche's reading rail. */
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
  language?: Language;
}

// @req REQ-095
export function OralNarrativesSection({
  peopleId,
  language = FALLBACK_LOCALE,
}: OralNarrativesSectionProps) {
  const copy = peopleCopy[language].oral;
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
      id={chapterAnchorId(copy.title)}
      data-fiche-section={copy.title}
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
          {copy.title}
        </h2>
        <p className="mt-1 text-afh-small text-[var(--country-text-soft)]">
          {copy.description}
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
                ? copy.attributed(narrative.narratorDisplayName)
                : copy.anonymous}
            </p>
            <p className="mt-1 text-afh-caption text-[var(--country-text-soft)]">
              {narrative.community} · {narrative.languageCode} ·{" "}
              {narrative.narrativeKind}
              {narrative.variantOf ? ` · ${copy.linkedVariant}` : ""}
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
