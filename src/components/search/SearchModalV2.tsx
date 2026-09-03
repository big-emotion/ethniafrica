"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Language } from "@/types/shared";
import { search } from "@/lib/afrikLoader";
import { ficheHrefFor } from "@/components/search/SearchResultCard";
import {
  SearchEntityMark,
  getSearchEntityLabel,
} from "@/components/search/searchEntityAccent";
import { getLocalizedRoute } from "@/lib/routing";
import { useAutocomplete } from "@/hooks/use-autocomplete";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/afrik-frontend";

// ETNI-1809 (parent ETNI-1796): the overlay used to duplicate the full SERP —
// lenses, result cards, near-miss leads — as a second, competing results
// surface. It is now suggest-only: it fetches the same corpus results to
// power a lightweight suggestions dropdown, but a query is only ever
// resolved on the canonical SERP (/fr/atlas/recherche) or on the fiche a
// suggestion points straight at.
interface SearchModalV2Props {
  open: boolean;
  onClose: () => void;
  language: Language;
}

/**
 * The same ceiling the SERP's own suggest applies. The overlay used to render
 * every hit the corpus returned: it is reachable from the masthead on every
 * page and by a keyboard shortcut, which made it the most reachable search
 * bar on the site and the only one that answered no arrow key at all.
 */
const SUGGESTIONS_PER_KEYSTROKE = 6;

const fetchSuggestionsFromCorpus = (query: string): Promise<SearchResult[]> =>
  search(query);

// @req REQ-091
export const SearchModalV2 = ({
  open,
  onClose,
  language,
}: SearchModalV2Props) => {
  const router = useRouter();

  const goToFiche = (result: SearchResult) => {
    router.push(ficheHrefFor(result, language));
    onClose();
  };

  const suggest = useAutocomplete<SearchResult>({
    fetchSuggestions: fetchSuggestionsFromCorpus,
    onSelect: goToFiche,
    limit: SUGGESTIONS_PER_KEYSTROKE,
  });

  const { clear } = suggest;
  useEffect(() => {
    if (!open) clear();
  }, [open, clear]);

  const getNoResultsText = () => {
    const trimmed = suggest.query.trim();
    if (!trimmed) {
      return "Commencez à taper pour rechercher...";
    }
    if (suggest.query.length < 2) {
      return "Tapez au moins 2 caractères...";
    }
    return "Aucun résultat trouvé";
  };

  const hasResults = suggest.options.length > 0;

  // The raw query is what the canonical SERP resolves — a suggestion click
  // never reaches this, it navigates straight to its own fiche instead.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = suggest.query.trim();
    if (!trimmed) return;
    router.push(
      `${getLocalizedRoute(language, "search")}?${new URLSearchParams({ q: trimmed })}`
    );
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-afh-border">
          <DialogTitle>Recherche</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-afh-text-muted"
              aria-hidden="true"
            />
            <Input
              type="text"
              {...suggest.comboboxProps}
              placeholder="Rechercher une famille, un peuple ou un pays..."
              value={suggest.query}
              onChange={(e) => suggest.setQuery(e.target.value)}
              onKeyDown={suggest.handleKeyDown}
              className="pl-10"
              autoFocus
            />
          </div>
        </form>

        <ScrollArea className="flex-1 px-6 pb-6">
          {suggest.pending ? (
            <div className="flex items-center justify-center h-64">
              <Loader2
                className="h-6 w-6 animate-spin text-afh-text-muted"
                aria-label="Chargement en cours"
              />
            </div>
          ) : hasResults ? (
            <ul
              id={suggest.listboxId}
              role="listbox"
              aria-label="Suggestions de recherche"
              className="space-y-1"
              data-testid="search-suggestions-list"
            >
              {suggest.options.map((result, index) => (
                <li
                  key={`${result.type}-${result.id}-${index}`}
                  {...suggest.getOptionProps(index)}
                  className={cn(
                    "flex items-center gap-2 rounded-afh-lg px-2 min-h-11 hover:bg-afh-bg-warm",
                    index === suggest.activeIndex && "bg-afh-bg-warm"
                  )}
                >
                  <SearchEntityMark type={result.type} />
                  <Link
                    href={ficheHrefFor(result, language)}
                    onClick={onClose}
                    className="flex-1 truncate text-afh-text"
                    tabIndex={-1}
                  >
                    {result.name}
                  </Link>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-afh-caption text-afh-text-soft"
                  >
                    {getSearchEntityLabel(result.type)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
              <Search
                className="h-12 w-12 text-afh-text-muted opacity-50"
                aria-hidden="true"
              />
              <p className="text-afh-text-soft">{getNoResultsText()}</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
