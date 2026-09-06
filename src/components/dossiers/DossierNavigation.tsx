"use client";

import type { Language } from "@/types/shared";
import { useId } from "react";
import { useRouter } from "next/navigation";
import { useModuleAvailability } from "@/components/hubs/ModuleAvailabilityProvider";
import { ActionLink } from "@/components/ui/ActionLink";
import { getPublishedThemes } from "@/lib/dossiers/catalog";
import { getDossierThemeHref } from "@/lib/dossiers/themes";
import { getLocalizedRoute } from "@/lib/routing";
import styles from "./dossiers.module.css";

// @req REQ-114
export function DossierNavigation({
  selectedTheme = "",
  language = "fr",
  onNavigate,
}: {
  selectedTheme?: string;
  language?: Language;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const themes = getPublishedThemes(useModuleAvailability(), language);
  return (
    <nav
      aria-label={language === "en" ? "Dossier themes" : "Thèmes des dossiers"}
      className={styles.navigation}
    >
      <div className={styles.compactThemes}>
        <label htmlFor={id} className="sr-only">
          {language === "en" ? "Choose a theme" : "Choisir un thème"}
        </label>
        <select
          id={id}
          value={selectedTheme}
          className={styles.control}
          onChange={(event) => {
            router.push(
              event.target.value
                ? getDossierThemeHref(event.target.value, language)
                : getLocalizedRoute(language, "dossiersHub")
            );
            onNavigate?.();
          }}
        >
          <option value="">
            {language === "en" ? "All themes" : "Tous les thèmes"}
          </option>
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.themeGrid} data-testid="dossier-theme-grid">
        {themes.map((theme) => (
          <ActionLink
            key={theme.id}
            href={getDossierThemeHref(theme.id, language)}
            aria-current={selectedTheme === theme.id ? "page" : undefined}
            onClick={onNavigate}
          >
            {theme.label}
          </ActionLink>
        ))}
      </div>
    </nav>
  );
}
