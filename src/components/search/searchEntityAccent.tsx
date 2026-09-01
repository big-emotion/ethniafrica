import { cn } from "@/lib/utils";
import type { SearchEntityType } from "@/types/afrik-frontend";

// Charter V2 §4 (ETNI-798 accent scope) — search result cards mark their
// entity type with one of the four --afh-cat-* accents. The mark is always
// paired with the text label below (never color alone), reusing the same
// people/country/language-family accent assignment as the fiche sequence
// (src/components/fiche/FicheSequence.tsx) so a peuple/pays/famille reads
// the same accent everywhere in the product.
// `accentScopeClassName` is the wrapper class from src/styles/tokens/color.css
// that rebinds --accent / --accent-tint for a subtree. A card that carries it
// can then read var(--accent) and never name a --afh-cat-* token itself, which
// is what keeps the accent assignment in this one table.
// @req REQ-091
export const SEARCH_ENTITY_ACCENT: Record<
  SearchEntityType,
  { label: string; markClassName: string; accentScopeClassName: string }
> = {
  people: {
    label: "Peuple",
    markClassName: "bg-[var(--afh-cat-ocre)]",
    accentScopeClassName: "afh-accent-ocre",
  },
  country: {
    label: "Pays",
    markClassName: "bg-[var(--afh-cat-teal)]",
    accentScopeClassName: "afh-accent-teal",
  },
  languageFamily: {
    label: "Famille linguistique",
    markClassName: "bg-[var(--afh-cat-perv)]",
    accentScopeClassName: "afh-accent-perv",
  },
  language: {
    label: "Langue",
    markClassName: "bg-[var(--afh-cat-terre)]",
    accentScopeClassName: "afh-accent-terre",
  },
  // REQ-126: a person is not a fifth corpus entity kind, so it does not take
  // a fifth --afh-cat-* hue — see the .afh-accent-neutral comment in
  // color.css for why that distinction is load-bearing here.
  person: {
    label: "Personne",
    markClassName: "bg-afh-text-muted",
    accentScopeClassName: "afh-accent-neutral",
  },
  // ETNI-1463: a name (patronyme) is not a fifth corpus entity kind either —
  // it reuses person's neutral treatment for the same reason (see above).
  patronyme: {
    label: "Nom",
    markClassName: "bg-afh-text-muted",
    accentScopeClassName: "afh-accent-neutral",
  },
};

// @req REQ-091
export function getSearchEntityLabel(type: SearchEntityType): string {
  return SEARCH_ENTITY_ACCENT[type]?.label ?? type;
}

interface SearchEntityMarkProps {
  type: SearchEntityType;
  className?: string;
}

// Decorative color mark — the accompanying text label (Badge) carries the
// meaning, so this is aria-hidden.
// @req REQ-091
export function SearchEntityMark({ type, className }: SearchEntityMarkProps) {
  const accent = SEARCH_ENTITY_ACCENT[type];
  return (
    <span
      aria-hidden="true"
      data-testid="search-entity-mark"
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        accent?.markClassName ?? "bg-afh-text-muted",
        className
      )}
    />
  );
}
