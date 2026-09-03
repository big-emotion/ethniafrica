"use client";

import { useEffect, useState } from "react";

import { chapterAnchorId } from "@/lib/ficheChapters";

/** The chapter this section is, in the fiche's reading rail. */
const CHAPTER_TITLE = "Crédits médias";

interface PublicMedia {
  id: string;
  author: string | null;
  licenceUri: string;
  sourcePageUrl: string | null;
  period: string | null;
  depictionTiming: string;
}

interface MediaCreditSectionProps {
  peopleId: string;
}

// @req REQ-128
export function MediaCreditSection({ peopleId }: MediaCreditSectionProps) {
  const [media, setMedia] = useState<PublicMedia[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch(
      `/api/v2/media?entityType=people&entityId=${encodeURIComponent(peopleId)}`
    )
      .then(async (response) => {
        if (!response.ok) return [];
        const body = await response.json();
        return (body.data ?? []) as PublicMedia[];
      })
      .then((data) => {
        if (!cancelled) setMedia(data);
      })
      .catch(() => {
        if (!cancelled) setMedia([]);
      });

    return () => {
      cancelled = true;
    };
  }, [peopleId]);

  if (media.length === 0) return null;

  return (
    <section
      id={chapterAnchorId(CHAPTER_TITLE)}
      data-fiche-section={CHAPTER_TITLE}
      aria-labelledby="media-credit-title"
      className="people-fade-in space-y-3 overflow-hidden rounded-[var(--country-radius-xl)] p-[18px] md:rounded-[20px] md:p-6 xl:rounded-[22px] xl:p-7"
      style={{
        background: "var(--country-card)",
        border: "1px solid var(--country-border)",
      }}
    >
      <div>
        <h2
          id="media-credit-title"
          className="text-afh-small font-bold text-[var(--country-text)]"
        >
          {CHAPTER_TITLE}
        </h2>
        <p className="mt-1 text-afh-small text-[var(--country-text-soft)]">
          Auteur, licence et page d&apos;origine de chaque image ou vidéo
          attachée à cette fiche.
        </p>
      </div>
      <ul className="space-y-3">
        {media.map((entry) => (
          <li
            key={entry.id}
            className="rounded-[var(--country-radius-md)] border border-[var(--country-border)] p-3 md:p-4"
          >
            <p className="text-afh-small font-semibold text-[var(--country-text)]">
              {entry.author ?? "Auteur inconnu"}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-2 text-afh-caption text-[var(--country-text-soft)]">
              <a
                href={entry.licenceUri}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Licence
              </a>
              {entry.sourcePageUrl && (
                <a
                  href={entry.sourcePageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Page source
                </a>
              )}
              {entry.period && <span>{entry.period}</span>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
