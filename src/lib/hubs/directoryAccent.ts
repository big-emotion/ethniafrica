/**
 * One accent per entity, and where the atlas reads it.
 *
 * This lived in `DirectoryHero.tsx`, beside a component that rendered a
 * directory page's frame. The three directories became three facets of one
 * hub and that component lost its last caller — but the table did not: it is
 * what `FacetHubShell` paints the facet's subtree with, and what each
 * `FacetDefinition` names its hue by. Deleting the file would have taken the
 * live half with the dead half, so the table moved here first.
 *
 * The name still says "directory" on purpose. It is the *scale* the charter
 * §3.2/§7 fixed for a listing surface, distinct from
 * `FicheSequence.ACCENT_CLASS_BY_ENTITY`: a fiche reserves terre for
 * IdentityPanel's colonial marker, and a listing has no such marker, so
 * peoples takes terre here instead. Renaming it to "facet" would suggest the
 * two scales had merged.
 */
export type DirectoryEntityType =
  "people" | "country" | "language-family" | "language" | "patronyme";

/**
 * The scale is one class per entity, and it stopped being one *hue* per entity
 * when the name axis joined. The categorical set is closed at four (brand
 * charter §5.2) and the four are spoken for, so `.afh-accent-name` aliases
 * ocre — which `color.css` already decided for the name fiche, with the reason
 * written beside it: aliasing keeps the set at four, and the distinct selector
 * is what lets a "no foreign accent on this page" check tell a name's own
 * scope from a country's leaking into it.
 */
// @req REQ-114
export const DIRECTORY_ACCENT_CLASS: Record<DirectoryEntityType, string> = {
  people: "afh-accent-terre",
  country: "afh-accent-ocre",
  "language-family": "afh-accent-teal",
  // Aliases pervenche, as `color.css` decided for the language fiche: a
  // language sits directly under a family in the AFRIK hierarchy, and no fifth
  // hue has been through CVD validation.
  language: "afh-accent-language",
  patronyme: "afh-accent-name",
};
