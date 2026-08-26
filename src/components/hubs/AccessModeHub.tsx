import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getLocalizedRoute } from "@/lib/routing";
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

  return (
    <section
      data-testid={`access-mode-hub-${mode}`}
      className={accentClass}
      aria-labelledby={`access-mode-hub-${mode}-title`}
    >
      <h1
        id={`access-mode-hub-${mode}-title`}
        className="text-2xl font-semibold"
        style={{ color: "var(--afh-text)" }}
      >
        {hubStrings.title}
      </h1>
      <p
        data-testid={`access-mode-hub-${mode}-blurb`}
        className="mt-2 max-w-[58ch] text-base"
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
        <ul className="flex flex-col gap-3" role="list">
          {modules.map((module) => {
            // A game has no PageType of its own — it is addressed by slug
            // under the Jouer hub — so the slug wins over any page.
            const href = module.gameSlug
              ? `/${language}/jouer/${module.gameSlug}`
              : module.page
                ? getLocalizedRoute(language, module.page)
                : null;

            return (
              <li key={module.id} data-testid={`hub-module-${module.id}`}>
                {module.available && href ? (
                  <Link
                    href={href}
                    data-testid={`hub-module-link-${module.id}`}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-[14px] border p-4 no-underline"
                    style={{
                      borderColor: "var(--accent)",
                      backgroundColor: "var(--accent-tint)",
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
                      className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium"
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
          })}
        </ul>

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
