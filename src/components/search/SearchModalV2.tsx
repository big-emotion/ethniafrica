"use client";

import { useState, useEffect } from "react";
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

// @req REQ-091
export const SearchModalV2 = ({
  open,
  onClose,
  language,
}: SearchModalV2Props) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const searchData = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        setResults(await search(searchQuery));
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const getNoResultsText = () => {
    if (!searchQuery.trim()) {
      return "Commencez à taper pour rechercher...";
    }
    if (searchQuery.length < 2) {
      return "Tapez au moins 2 caractères...";
    }
    return "Aucun résultat trouvé";
  };

  const hasResults = results.length > 0;

  // The raw query is what the canonical SERP resolves — a suggestion click
  // never reaches this, it navigates straight to its own fiche instead.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
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
              placeholder="Rechercher une famille, un peuple ou un pays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </form>

        <ScrollArea className="flex-1 px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2
                className="h-6 w-6 animate-spin text-afh-text-muted"
                aria-label="Chargement en cours"
              />
            </div>
          ) : hasResults ? (
            <ul className="space-y-1" data-testid="search-suggestions-list">
              {results.map((result, index) => (
                <li
                  key={`${result.type}-${result.id}-${index}`}
                  className="flex items-center gap-2 rounded-afh-lg px-2 min-h-11 hover:bg-afh-bg-warm"
                >
                  <SearchEntityMark type={result.type} />
                  <Link
                    href={ficheHrefFor(result, language)}
                    onClick={onClose}
                    className="flex-1 truncate text-afh-text"
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
