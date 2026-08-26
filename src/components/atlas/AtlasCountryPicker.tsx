"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AtlasTarget } from "@/lib/atlas/targets";
import type { CountryId } from "@/types/afrik";

/**
 * The only command on the stage that moves the camera.
 *
 * Markers are placed on the sphere, so a country that has rotated to the far
 * side has no button to click; dragging brings it round, but only for a reader
 * who can drag. This is the other half of that problem, and the reason it
 * lists the fiche's own countries rather than the continent's — offering all
 * 58 would be an interface telling the reader the people is everywhere.
 *
 * Written as a disclosure over a listbox rather than on the repo's shadcn
 * `Select`: that primitive is Radix, which the test suite has to mock away in
 * happy-dom, and mocking it would leave every claim below — the roles, Escape
 * returning focus, the arrow keys — asserted against a stub. It brings in no
 * competing library, which is what the charter actually asks for.
 */
// @req REQ-117
export function AtlasCountryPicker({
  targets,
  chosenCountryId,
  onChoose,
  label = "Choisir un pays de présence",
}: {
  targets: AtlasTarget[];
  chosenCountryId: CountryId | null;
  onChoose: (countryId: CountryId) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    // A reader who dismissed the list is left at the top of the document
    // otherwise, several tab stops from where they were.
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>("[role=option]")?.focus();
  }, [open]);

  // One choice is not a choice: 394 of the corpus's 789 people fiches declare
  // exactly one country, and a picker there would be furniture.
  if (targets.length < 2) return null;

  const chosen = targets.find((target) => target.countryId === chosenCountryId);

  const moveFocus = (from: HTMLElement, delta: number) => {
    const options = [
      ...(listRef.current?.querySelectorAll<HTMLButtonElement>(
        "[role=option]"
      ) ?? []),
    ];
    const index = options.indexOf(from as HTMLButtonElement);
    // Wrapping keeps the last option one press from the first, so a long list
    // never dead-ends at either edge.
    const next = options[(index + delta + options.length) % options.length];
    next?.focus();
  };

  return (
    <div data-atlas-picker="" className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-afh-xs rounded-afh-full border px-afh-sm py-afh-xs text-afh-small focus-visible:outline-none focus-visible:ring-2"
        style={{
          borderColor: "var(--afh-night-line)",
          backgroundColor: "var(--afh-night-surface)",
          color: "var(--afh-night-ink)",
        }}
      >
        <span>{chosen ? chosen.nameFr : label}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={label}
          className="absolute left-0 z-10 mt-afh-xs flex max-h-64 min-w-full flex-col overflow-y-auto rounded-afh-md border py-afh-xs"
          style={{
            borderColor: "var(--afh-night-line)",
            backgroundColor: "var(--afh-night-surface)",
            color: "var(--afh-night-ink)",
          }}
        >
          {targets.map((target) => (
            <button
              key={target.countryId}
              type="button"
              role="option"
              aria-selected={target.countryId === chosenCountryId}
              onClick={() => {
                onChoose(target.countryId);
                close(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  close(true);
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  moveFocus(event.currentTarget, 1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  moveFocus(event.currentTarget, -1);
                }
              }}
              className="px-afh-sm py-afh-xs text-left text-afh-small focus-visible:outline-none focus-visible:ring-2"
            >
              {target.nameFr}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
