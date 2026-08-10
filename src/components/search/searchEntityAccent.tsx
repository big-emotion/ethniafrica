import { cn } from "@/lib/utils";
import type { SearchEntityType } from "@/types/afrik-frontend";

// Charter V2 §4 (ETNI-798 accent scope) — search result cards mark their
// entity type with one of the four --afh-cat-* accents. The mark is always
// paired with the text label below (never color alone), reusing the same
// people/country/language-family accent assignment as the fiche sequence
// (src/components/fiche/FicheSequence.tsx) so a peuple/pays/famille reads
// the same accent everywhere in the product.
export const SEARCH_ENTITY_ACCENT: Record<
  SearchEntityType,
  { label: string; markClassName: string }
> = {
  people: {
    label: "Peuple",
    markClassName: "bg-[var(--afh-cat-ocre)]",
  },
  country: {
    label: "Pays",
    markClassName: "bg-[var(--afh-cat-teal)]",
  },
  languageFamily: {
    label: "Famille linguistique",
    markClassName: "bg-[var(--afh-cat-perv)]",
  },
  language: {
    label: "Langue",
    markClassName: "bg-[var(--afh-cat-terre)]",
  },
};

export function getSearchEntityLabel(type: SearchEntityType): string {
  return SEARCH_ENTITY_ACCENT[type]?.label ?? type;
}

interface SearchEntityMarkProps {
  type: SearchEntityType;
  className?: string;
}

// Decorative color mark — the accompanying text label (Badge) carries the
// meaning, so this is aria-hidden.
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
