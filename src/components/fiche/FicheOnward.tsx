"use client";

import { FicheSection } from "@/components/fiche/FicheSection";
import { ActionLink } from "@/components/ui/ActionLink";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { ONWARD_MAX_LINKS, type OnwardLink } from "@/lib/fiche/onwardLinks";
import { ficheCopy } from "@/lib/i18n/copy/fiche";
import type { FicheEntityType } from "@/types/fiche";
import type { Language } from "@/types/shared";

/**
 * The chapter that lets a reader leave a fiche for another one.
 *
 * Measured on production 2026-09-07: the fiches hold a reader for 251 to 276
 * seconds against 21 on the listings that point at them, and ten of them still
 * showed a 100 % exit rate. The reading was never the problem — the foot of
 * the document was, because nothing there pointed anywhere.
 *
 * Three decisions the art-director pass settled, each against a charter:
 *
 * **It is a chapter, not a footer widget.** Rendered through `FicheSection`, so
 * it announces itself on `data-fiche-section` and the reading rail carries it
 * (atlas charter §7). A reader eight thousand pixels down reaches the way out
 * without scrolling to it, which is the half of the fix the block alone cannot
 * do.
 *
 * **It names no accent.** It reads `var(--accent-ink)` through `ActionLink`
 * like everything else on the parchment. Painting each row in its target's
 * colour was the tempting move and is the wrong one: the site already runs
 * three different entity-to-hue mappings (atlas charter §2 — home positional,
 * facet, fiche), so a fourth inside one scroll teaches a code no reader can
 * learn. The kind of thing a link leads to is carried by a word instead.
 *
 * **Absent, never empty.** A fiche the corpus relates to nothing renders no
 * block at all. Atlas charter §4 — "say what the corpus does not have" —
 * governs a *field* of the fiche, where an absence is a fact about the people.
 * This is navigation, not a field; there is no fact to report, and §7 is the
 * rule that applies: a chapter the corpus does not produce is not in the DOM,
 * and therefore not in the rail either.
 *
 * It is a client component for one reason: `fiche:related_click` is the only
 * measurement that can say whether any of this worked. The links themselves are
 * still server-rendered anchors, so a crawler following the fiche's outbound
 * links — which is what the `noms` route's `follow: true` is for — sees them.
 */
export interface FicheOnwardProps {
  /** The kind of fiche the reader is leaving, recorded with the click. */
  from: FicheEntityType;
  links: readonly OnwardLink[];
  language: Language;
}

// @req REQ-091
// @req REQ-046
export function FicheOnward({ from, links, language }: FicheOnwardProps) {
  if (links.length === 0) return null;

  const copy = ficheCopy[language].onward;

  return (
    <FicheSection title={copy.title} testId="fiche-onward">
      <ul className="afh-onward">
        {/* The cap belongs to the block, not to one caller's arithmetic. Five
            routes compose these lists and a sixth would only have to forget:
            past five rows the chapter stops reading as an invitation and
            becomes a second listing, which is the shape these fiches already
            out-read ten to one. */}
        {links.slice(0, ONWARD_MAX_LINKS).map((link) => (
          <li key={link.href}>
            <span className="afh-parchment-eyebrow afh-onward-kind">
              {copy.kind[link.kind]}
            </span>
            {/* The display face, one step up. What a reader is being offered
                here is a name — a people, a country, a family — and a name on
                this site is set in the display face wherever it is the
                subject. In the body face at interface size it read as a menu
                entry, which is what the eyebrow above it already is. Dress
                only: the chapter's shape is held by `ficheOnwardCharter`. */}
            <ActionLink
              className="font-afh-display text-afh-h3 font-bold"
              href={link.href}
              onClick={() =>
                trackEvent("fiche:related_click", { from, to: link.kind })
              }
            >
              {link.name}
            </ActionLink>
          </li>
        ))}
      </ul>
    </FicheSection>
  );
}
