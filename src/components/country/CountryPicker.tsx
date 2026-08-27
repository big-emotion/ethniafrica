"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface CountryPickerEntry {
  /** ISO 3166-1 alpha-3 — the fiche's own id. */
  id: string;
  nameFr: string;
  flag: string;
}

export interface CountryPickerProps {
  countries: CountryPickerEntry[];
  currentCountryId: string;
}

/**
 * Choosing another country is a move in the reading, not a preview: the 54
 * fiches all exist, so a reader who picks one wants it, and the picker
 * navigates rather than re-aiming the camera on the page they are on (D1).
 *
 * The list comes from the corpus, never from the admin-0 geometry. The two
 * sets do not coincide — three geometric entries have no fiche, and six
 * fiches have no geometry — so a picker fed by the asset would offer three
 * dead ends and hide six real countries.
 */
// @req REQ-116
export function CountryPicker({
  countries,
  currentCountryId,
}: CountryPickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = countries.find((country) => country.id === currentCountryId);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (id: string) => {
    setOpen(false);
    if (id !== currentCountryId) {
      // The unversioned form: a bare slug renders directly, while the
      // @latest form would cost a redirect on every choice.
      router.push(`/fr/pays/${id}`);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      event.preventDefault();
    }
  };

  return (
    <div ref={containerRef} onKeyDown={onKeyDown} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="flex items-center gap-2 rounded-full border border-afh-border bg-afh-surface px-3 py-1.5 text-sm text-afh-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <span aria-hidden="true">{current?.flag}</span>
        <span>{current?.nameFr ?? currentCountryId}</span>
        <span className="text-xs text-afh-text-soft">Changer de pays</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Pays"
          className="absolute z-20 mt-1 max-h-80 w-64 overflow-y-auto rounded-afh-lg border bg-[var(--country-card)] py-1 shadow-lg"
        >
          {countries.map((country) => {
            const isCurrent = country.id === currentCountryId;
            return (
              <li key={country.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  {...(isCurrent ? { "aria-current": "page" as const } : {})}
                  onClick={() => choose(country.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--country-bg-warm)] focus-visible:outline-none focus-visible:bg-[var(--country-bg-warm)]"
                >
                  <span aria-hidden="true">{country.flag}</span>
                  <span className="flex-1">{country.nameFr}</span>
                  <span className="font-mono text-xs opacity-60">
                    {country.id}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
