"use client";

import type { Language } from "@/types/shared";
import { useId, useMemo, useState } from "react";
import { useModuleAvailability } from "@/components/hubs/ModuleAvailabilityProvider";
import { ActionLink } from "@/components/ui/ActionLink";
import { DossierNavigation } from "@/components/dossiers/DossierNavigation";
import { getDossiers } from "@/lib/dossiers/catalog";
import { getDossierThemes } from "@/lib/dossiers/themes";
import { HUB_PAGE_SIZE, pageOf } from "@/lib/dossiers/paging";
import type { DossierIndexEntry } from "@/lib/dossiers/menu";
import { getTranslation } from "@/lib/translations";
import styles from "./dossiers.module.css";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr");

/**
 * The reading list of the dossiers axis.
 *
 * The corpus arrives as a prop rather than being read here: this is a client
 * component — the search field is live — and the dossiers are JSON files on
 * disk. The hub page reads them and hands them down, which is also what keeps
 * this component renderable in a test without a filesystem.
 *
 * It paginates in the browser rather than through the address bar, because the
 * whole index is already in the page: the server sends every dossier so the
 * search can answer without a round trip, and once the list is here, slicing it
 * is arithmetic. What the reader must never meet is the ungoverned list — the
 * axis is heading for hundreds of readings, and a hub that prints all of them
 * is the same failure the menu had.
 */
// @req REQ-114 @req REQ-108
export function DossierDirectory({
  theme = "",
  language = "fr",
  corpus = [],
}: {
  theme?: string;
  language?: Language;
  /** Every dossier of the corpus, newest first. Empty in a bare render. */
  corpus?: DossierIndexEntry[];
}) {
  const english = language === "en";
  const id = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const availability = useModuleAvailability();
  const pager = getTranslation(language).hubs.dossiers.pager;

  // The axis's own surfaces — the pillar, the map, the static page — still
  // come from the registry; only the readings moved to the corpus.
  const surfaces = getDossiers({ theme, query, language }, availability);
  const anecdotes = getDossiers(
    { theme, format: "anecdote", language },
    availability
  );

  const readings = useMemo(() => {
    const needle = normalize(query.trim());
    const offered = corpus.filter((entry) => entry.offered);
    if (!needle) return offered;
    return offered.filter((entry) =>
      normalize(`${entry.title} ${entry.summary}`).includes(needle)
    );
  }, [corpus, query]);

  const matches = [
    ...surfaces.map((dossier) => ({
      key: dossier.id,
      href: dossier.href,
      title: dossier.title,
      summary: dossier.summary,
      eyebrow: getDossierThemes(language).find(
        (candidate) => candidate.id === dossier.primaryTheme
      )?.label,
    })),
    ...readings.map((entry) => ({
      key: entry.id,
      href: entry.href,
      title: entry.title,
      summary: entry.summary,
      eyebrow:
        getTranslation(language).hubs.moduleGroupNames[
          `dossiers-${entry.rubric}`
        ],
    })),
  ];

  const shown = pageOf(matches, page);
  const pageCount = Math.max(1, Math.ceil(matches.length / HUB_PAGE_SIZE));

  /**
   * Whether there is a catalogue here at all.
   *
   * Read off the unfiltered set, not off the matches: an empty result under a
   * query is a search that found nothing, and an empty result under no query
   * is an axis with nothing in it. The two owe the reader different sentences
   * — "aucun dossier ne correspond" sends them back to refine a search that
   * cannot succeed — and telling them apart is what the freeze needs.
   */
  const catalogueIsEmpty =
    getDossiers({ language }, availability).length === 0 &&
    corpus.every((entry) => !entry.offered);

  return (
    <div className={`${styles.directory} afh-accent-teal`}>
      {/* A search field and a theme list over an empty catalogue are two
          controls that can only fail. They come back with the readings. */}
      {catalogueIsEmpty ? null : (
        <div className={styles.filters}>
          <label htmlFor={id} className="sr-only">
            {english ? "Search dossiers" : "Rechercher dans les dossiers"}
          </label>
          <input
            id={id}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              // A search that lands the reader on page four of its own results
              // shows them an empty list and no reason for it.
              setPage(1);
            }}
            placeholder={english ? "Search a subject…" : "Rechercher un sujet…"}
            className={styles.control}
          />
          <DossierNavigation selectedTheme={theme} language={language} />
        </div>
      )}
      <section
        aria-label={english ? "Dossiers to read" : "Dossiers à lire"}
        className={styles.results}
      >
        <p role="status" className={styles.status}>
          {catalogueIsEmpty
            ? getTranslation(language).hubs.dossiers.frozenStatus
            : matches.length === 0
              ? english
                ? "No dossiers match this search."
                : "Aucun dossier ne correspond à cette recherche."
              : `${matches.length} dossier${matches.length > 1 ? "s" : ""} ${english ? "to read" : "à lire"}`}
        </p>
        {shown.map((dossier) => (
          <article key={dossier.key} className={styles.dossier}>
            <p className={styles.eyebrow}>{dossier.eyebrow}</p>
            <h2>
              <ActionLink href={dossier.href}>{dossier.title}</ActionLink>
            </h2>
            <p>{dossier.summary}</p>
          </article>
        ))}
        {pageCount > 1 && (
          <nav className={styles.pager} aria-label={pager.label}>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              {pager.previous}
            </button>
            <span aria-live="polite">{pager.position(page, pageCount)}</span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
              disabled={page === pageCount}
            >
              {pager.next}
            </button>
          </nav>
        )}
      </section>
      {anecdotes.length > 0 && (
        <aside
          className={styles.shortReads}
          aria-label={english ? "Short reads" : "Lectures courtes"}
        >
          <h2>
            {english ? "Time for an anecdote" : "Le temps d’une anecdote"}
          </h2>
          <p>
            {english
              ? "Short, sourced stories about names in Africa."
              : "Des histoires courtes et sourcées autour des noms d’Afrique."}
          </p>
          <ActionLink href={anecdotes[0].href}>
            {english ? "Read the anecdotes" : "Lire les anecdotes"}
          </ActionLink>
        </aside>
      )}
    </div>
  );
}
