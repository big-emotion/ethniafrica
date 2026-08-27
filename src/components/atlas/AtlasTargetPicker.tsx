"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { flagFromISO3 } from "@/lib/countryFlag";
import type { AtlasTarget } from "@/lib/atlas/targets";
import type { CountryId } from "@/types/afrik";

/**
 * Choosing a country from a list instead of from the globe.
 *
 * The country and people fiches put a pastille on each of their one or few
 * targets, which reads well when there are one or few. A family footprint
 * reaches seventeen countries, several of them small and adjacent — Togo and
 * Benin at this scale are two markers on top of each other — so the pastilles
 * would overlap into noise and the small countries would become unclickable.
 * A list has no such limit, orders itself by density, and is reachable from the
 * keyboard without hit-testing a sphere.
 */

export interface AtlasTargetPickerProps {
  /** In the footprint's own order: densest first. */
  targets: AtlasTarget[];
  /** How many member peoples each country carries, for the option's subtitle. */
  memberCountByCountry: Record<string, number>;
  chosenCountryId: CountryId | null;
  onChoose: (countryId: CountryId) => void;
  /**
   * What the fiche calls the area these countries belong to, written to follow
   * "de": a family has `l'empreinte`, a people has `présence`. The mockups
   * word the control differently because the entities are different things —
   * the same reason the globe takes its own `wholeAreaLabel`. It carries its
   * own elision, since "de l'empreinte" and "de présence" do not take the
   * same particle.
   */
  areaNoun?: string;
}

const LIST_STYLE: CSSProperties = {
  position: "absolute",
  zIndex: 7,
  top: "calc(100% + 6px)",
  left: 0,
  minWidth: 260,
  maxHeight: 280,
  overflowY: "auto",
  background: "var(--afh-bg)",
  border: "1px solid var(--afh-border)",
  borderRadius: "var(--afh-radius-base)",
  padding: 4,
};

// @req REQ-117
export function AtlasTargetPicker({
  targets,
  memberCountByCountry,
  chosenCountryId,
  onChoose,
  areaNoun = "l'empreinte",
}: AtlasTargetPickerProps) {
  const chooseLabel = `Choisir un pays de ${areaNoun}`;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const shouldFocusFirst = useRef(false);

  useEffect(() => {
    if (!open || !shouldFocusFirst.current) return;
    shouldFocusFirst.current = false;
    listRef.current?.querySelector<HTMLButtonElement>("[role=option]")?.focus();
  }, [open]);

  const close = ({ returnFocus }: { returnFocus: boolean }) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const chosen = targets.find((t) => t.countryId === chosenCountryId) ?? null;

  /** Arrow keys wrap, so the last option is one keystroke from the first. */
  const moveFocus = (from: HTMLElement, delta: number) => {
    const options = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ??
        []
    );
    const index = options.indexOf(from as HTMLButtonElement);
    if (index === -1) return;
    const next = (index + delta + options.length) % options.length;
    options[next]?.focus();
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        // The visible text becomes the chosen country, as in the mockup, but
        // the accessible name must not: a control named only by its current
        // value stops saying what it does, so a screen-reader user who lands
        // on it after choosing hears "Bénin, button" and nothing about what
        // pressing it would do.
        aria-label={chooseLabel}
        onClick={() => {
          shouldFocusFirst.current = !open;
          setOpen(!open);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          borderRadius: "var(--afh-radius-full)",
          border: "1px solid var(--afh-night-line)",
          background: "var(--afh-night-surface)",
          color: "var(--afh-night-ink)",
          font: "inherit",
          fontSize: "var(--afh-text-small)",
          cursor: "pointer",
        }}
      >
        {chosen ? chosen.nameFr : chooseLabel}
        <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={`Pays de ${areaNoun}`}
          style={LIST_STYLE}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close({ returnFocus: true });
              return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              moveFocus(
                event.target as HTMLElement,
                event.key === "ArrowDown" ? 1 : -1
              );
            }
          }}
        >
          {targets.map((target) => {
            const memberCount = memberCountByCountry[target.countryId] ?? 0;
            return (
              <button
                key={target.countryId}
                type="button"
                role="option"
                aria-selected={target.countryId === chosenCountryId}
                onClick={() => {
                  onChoose(target.countryId);
                  close({ returnFocus: false });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "7px 10px",
                  border: 0,
                  borderRadius: "var(--afh-radius-sm)",
                  background: "transparent",
                  color: "var(--afh-text)",
                  font: "inherit",
                  fontSize: "var(--afh-text-small)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true">{flagFromISO3(target.countryId)}</span>
                {target.nameFr}
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--afh-font-mono)",
                    fontSize: "var(--afh-text-nano)",
                    color: "var(--afh-text-muted)",
                  }}
                >
                  {memberCount} peuple{memberCount > 1 ? "s" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
