import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getGroupedModules } from "@/lib/hubs/moduleGroups";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";
import {
  ACCENT_BY_ACCESS_MODE,
  type AccessMode,
} from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

export interface AccessModeHubProps {
  language: Language;
  mode: AccessMode;
  modules: HubModule[];
  /**
   * The scene specific to this axis — a map for Explorer, a time axis for
   * Comprendre, a face-off for Jouer. It renders inside the accented
   * section so it reads --accent off the right axis, and after the module
   * list so the keyboard reaches the unconditional links first.
   */
  children?: ReactNode;
}

/**
 * Renders, for a given access mode, the modules it groups (REQ-114): a
 * live module is a link to its route, an unavailable module is an inert
 * entry carrying a "Bientôt" chip and no anchor element (REQ-106).
 *
 * One list contract, three scenes. The three hubs used to render the same
 * `<ul>` under three different labels, which gave a reader no way to tell
 * Explorer from Comprendre. Letting each route pass its own scene while
 * the rows stay here keeps the unavailable contract and the accessibility
 * work in exactly one place.
 *
 * An axis whose modules carry a shelf renders one titled section per shelf
 * — Jouer holds eleven games, which is a wall rather than a list. Nothing
 * is nested away: the hub is the path without JavaScript and the one a
 * crawler walks, so every module keeps its own row, under a heading.
 * Explorer and Comprendre carry no shelf and stay flat.
 */
// @req REQ-114 @req REQ-106
export function AccessModeHub({
  language,
  mode,
  modules,
  children,
}: AccessModeHubProps) {
  const t = getTranslation(language);
  const hubStrings = t.hubs[mode];
  const accentClass = ACCENT_BY_ACCESS_MODE[mode];
  const shelves = getGroupedModules(modules);

  // One row, wherever it is rendered: a shelf's list and the flat list must
  // agree on the link and the unavailable contract, so neither can drift.
  const renderModuleRow = (module: HubModule) => {
    const href = getModuleHref(module, language);

    return (
      <li key={module.id} data-testid={`hub-module-${module.id}`}>
        {module.available && href ? (
          <Link
            href={href}
            data-testid={`hub-module-link-${module.id}`}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-[14px] border p-4 no-underline"
            style={{
              borderColor: "var(--accent)",
              // --accent-tint is the accent over parchment and no night
              // scope rebinds it, so on night this row was a #f1d9ae card
              // under cream ink — 1.12:1, measured on /fr/explorer. A wash
              // takes the colour of whatever is behind it and so reads on
              // both surfaces.
              backgroundColor:
                "color-mix(in srgb, var(--accent) 16%, var(--afh-surface))",
              color: "var(--afh-text)",
            }}
          >
            {module.name}
          </Link>
        ) : (
          <div
            data-testid={`hub-module-unavailable-${module.id}`}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-[14px] border p-4"
            style={{
              borderColor: "var(--afh-text-soft)",
              color: "var(--afh-text-soft)",
            }}
          >
            <span>{module.name}</span>
            <span
              className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-afh-caption font-medium"
              style={{
                backgroundColor: "var(--afh-surface)",
                color: "var(--afh-text-soft)",
              }}
            >
              {t.hubs.unavailableLabel}
            </span>
          </div>
        )}
      </li>
    );
  };

  return (
    <section
      data-testid={`access-mode-hub-${mode}`}
      className={accentClass}
      aria-labelledby={`access-mode-hub-${mode}-title`}
    >
      <h1
        id={`access-mode-hub-${mode}-title`}
        className="text-afh-h2 font-semibold"
        style={{ color: "var(--afh-text)" }}
      >
        {hubStrings.title}
      </h1>
      <p
        data-testid={`access-mode-hub-${mode}-blurb`}
        className="mt-2 max-w-[58ch] text-afh-small"
        style={{ color: "var(--afh-text-soft)" }}
      >
        {hubStrings.blurb}
      </p>
      <div
        className={cn(
          "mt-6",
          // At 430px the scene simply follows the list. From 800px the
          // grid places the list left and the scene right — placement
          // only, never `order:`, so DOM order and visual order agree at
          // both widths (WCAG 1.3.2 / 2.4.3).
          children &&
            "min-[800px]:grid min-[800px]:grid-cols-[22rem_minmax(0,1fr)] min-[800px]:items-start min-[800px]:gap-8"
        )}
      >
        <div className="flex flex-col gap-3">
          {shelves.length > 0 ? (
            shelves.map((shelf) => (
              <section
                key={shelf.group.id}
                data-testid={`hub-shelf-${shelf.group.id}`}
                aria-labelledby={`hub-shelf-${shelf.group.id}-title`}
                className="flex flex-col gap-3"
              >
                <h2
                  id={`hub-shelf-${shelf.group.id}-title`}
                  className="mt-2 text-afh-small font-semibold uppercase tracking-wide"
                  style={{ color: "var(--afh-fg-muted)" }}
                >
                  {shelf.group.label}
                </h2>
                <ul className="flex flex-col gap-3" role="list">
                  {shelf.modules.map(renderModuleRow)}
                </ul>
              </section>
            ))
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {modules.map(renderModuleRow)}
            </ul>
          )}
        </div>
        {children ? (
          <div
            data-testid={`access-mode-hub-${mode}-scene`}
            className="mt-8 min-[800px]:mt-0"
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
