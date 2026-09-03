import type { SearchEntityType } from "@/types/afrik-frontend";

/**
 * What the product is allowed to say the search covers.
 *
 * One engine answers two surfaces — the home's band and /fr/recherche — and
 * each used to word its own scope. They drifted apart in the usual direction:
 * the band was widened to the kinds the engine actually returns while the SERP
 * kept promising the three `/api/v2/search` answered before migration 069.
 * A reader looking for a language or a surname was turned away by the surface
 * that could have answered.
 *
 * So the wording lives here rather than in either component, and neither
 * surface may restate it.
 */

/**
 * The visible label and the accessible name of the search field — the same
 * string, so what is read and what is heard cannot drift (WCAG 2.5.3).
 *
 * The rule is the whole point of this constant: **it names exactly the kinds
 * `SEARCH_RESULT_GROUPS` below can show, no more and no fewer.**
 *
 * Persons stay out of both. `persons` has no rows, and naming a kind the
 * corpus cannot answer with is the promise these surfaces may not break —
 * which is what the old three-kind rule was protecting all along. The neutral
 * accent a person takes in the palette (REQ-126) follows from that fact; it is
 * not the reason for it. A lens chip may name the kind anyway, because
 * `SearchLensBar` drops any chip whose count is zero. A sentence cannot
 * retract itself, so prose is held to the stricter rule.
 *
 * Note what this is *not* aligned with. The home's headline names five
 * **corpus classes**, and their fifth is appellations — the 3134 folded name
 * forms of the peoples. The panel's fifth is *Noms*, the 30 patronyme fiches.
 * Two different objects that are both names: the headline counts how peoples
 * are named, this returns records about family names. Four classes are
 * shared, the fifth is not, and collapsing them would have the panel claim
 * 3134 of something it returns 30 of.
 */
// @req REQ-002
export const SEARCH_LABEL =
  "Cherchez un peuple, une langue, un pays, une famille linguistique ou un nom";

/**
 * Concrete examples complement the scope named by the visible label.
 *
 * Four, not five: the label names the classes, and a placeholder long enough
 * to exemplify every one of them is truncated on a phone anyway. Each of these
 * is a row that exists — "Fulfulde" is what the corpus calls the language a
 * reader would type as "peul", and "Keïta" carries its diaeresis where
 * "Traore" is stored without one.
 */
// @req REQ-002
export const SEARCH_PLACEHOLDER = "Ex. Bafut, Fulfulde, Namibie, Keïta";

// Plural of the singular labels in SEARCH_ENTITY_ACCENT — a group heads a set.
// The accent still comes from that one table, so a kind's colour is assigned
// in a single place across the whole product.
// @req REQ-002
export const SEARCH_RESULT_GROUPS: {
  type: SearchEntityType;
  heading: string;
}[] = [
  { type: "people", heading: "Peuples" },
  { type: "language", heading: "Langues" },
  { type: "country", heading: "Pays" },
  { type: "languageFamily", heading: "Familles linguistiques" },
  { type: "patronyme", heading: "Noms" },
];
