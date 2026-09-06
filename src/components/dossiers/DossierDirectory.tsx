"use client";

import type { Language } from "@/types/shared";
import { useId, useState } from "react";
import { useModuleAvailability } from "@/components/hubs/ModuleAvailabilityProvider";
import { ActionLink } from "@/components/ui/ActionLink";
import { DossierNavigation } from "@/components/dossiers/DossierNavigation";
import { getDossiers } from "@/lib/dossiers/catalog";
import { getDossierThemes } from "@/lib/dossiers/themes";
import styles from "./dossiers.module.css";

// @req REQ-114
export function DossierDirectory({
  theme = "",
  language = "fr",
}: {
  theme?: string;
  language?: Language;
}) {
  const english = language === "en";
  const id = useId();
  const [query, setQuery] = useState("");
  const availability = useModuleAvailability();
  const dossiers = getDossiers({ theme, query, language }, availability);
  const anecdotes = getDossiers(
    { theme, format: "anecdote", language },
    availability
  );
  return (
    <div className={`${styles.directory} afh-accent-teal`}>
      <div className={styles.filters}>
        <label htmlFor={id} className="sr-only">
          {english ? "Search dossiers" : "Rechercher dans les dossiers"}
        </label>
        <input
          id={id}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={english ? "Search a subject…" : "Rechercher un sujet…"}
          className={styles.control}
        />
        <DossierNavigation selectedTheme={theme} language={language} />
      </div>
      <section
        aria-label={english ? "Dossiers to read" : "Dossiers à lire"}
        className={styles.results}
      >
        <p role="status" className={styles.status}>
          {dossiers.length === 0
            ? english
              ? "No dossiers match this search."
              : "Aucun dossier ne correspond à cette recherche."
            : `${dossiers.length} dossier${dossiers.length > 1 ? "s" : ""} ${english ? "to read" : "à lire"}`}
        </p>
        {dossiers.map((dossier) => (
          <article key={dossier.id} className={styles.dossier}>
            <p className={styles.eyebrow}>
              {
                getDossierThemes(language).find(
                  (candidate) => candidate.id === dossier.primaryTheme
                )?.label
              }
            </p>
            <h2>
              <ActionLink href={dossier.href}>{dossier.title}</ActionLink>
            </h2>
            <p>{dossier.summary}</p>
          </article>
        ))}
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
