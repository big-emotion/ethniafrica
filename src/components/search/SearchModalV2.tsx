"use client";

import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Language } from "@/types/shared";
import { search } from "@/lib/afrikLoader";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import type { SearchResult, SearchEntityType } from "@/types/afrik-frontend";

// Selecting a result no longer travels back up to the host: each card is a
// link and navigates on its own, so the modal only needs to close itself.
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchEntityType | "all">("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setResults([]);
      setActiveTab("all");
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
        const searchFilters: { type?: SearchEntityType } =
          activeTab !== "all" ? { type: activeTab } : {};
        const data = await search(searchQuery, searchFilters);
        setResults(data);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, activeTab]);

  const getTabLabels = () => {
    return {
      all: "Tout",
      families: "Familles",
      languages: "Langues",
      peoples: "Peuples",
      countries: "Pays",
      persons: "Personnes",
    };
  };

  const tabLabels = getTabLabels();

  const dialogTitle = "Recherche";

  const getPlaceholder = () => {
    return "Rechercher une famille, un peuple ou un pays...";
  };

  const getNoResultsText = () => {
    if (!searchQuery.trim()) {
      return "Commencez à taper pour rechercher...";
    }
    if (searchQuery.length < 2) {
      return "Tapez au moins 2 caractères...";
    }
    return "Aucun résultat trouvé";
  };

  const hasQuery = searchQuery.trim().length >= 2;
  const showNoResultsGuidance = !loading && hasQuery && results.length === 0;
  const showPrompt = !loading && !hasQuery && results.length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-afh-border">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 pb-2 space-y-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-afh-text-muted"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder={getPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as SearchEntityType | "all")}
          >
            <TabsList className="flex flex-wrap h-auto w-full gap-2 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="rounded-full border border-afh-border px-4 data-[state=active]:border-transparent data-[state=active]:bg-[var(--accent-tint)]"
              >
                {tabLabels.all}
              </TabsTrigger>
              <TabsTrigger
                value="languageFamily"
                className="rounded-full border border-afh-border px-4 data-[state=active]:border-transparent data-[state=active]:bg-[var(--accent-tint)]"
              >
                {tabLabels.families}
              </TabsTrigger>
              <TabsTrigger
                value="language"
                className="rounded-full border border-afh-border px-4 data-[state=active]:border-transparent data-[state=active]:bg-[var(--accent-tint)]"
              >
                {tabLabels.languages}
              </TabsTrigger>
              <TabsTrigger
                value="people"
                className="rounded-full border border-afh-border px-4 data-[state=active]:border-transparent data-[state=active]:bg-[var(--accent-tint)]"
              >
                {tabLabels.peoples}
              </TabsTrigger>
              <TabsTrigger
                value="country"
                className="rounded-full border border-afh-border px-4 data-[state=active]:border-transparent data-[state=active]:bg-[var(--accent-tint)]"
              >
                {tabLabels.countries}
              </TabsTrigger>
              <TabsTrigger
                value="person"
                className="rounded-full border border-afh-border px-4 data-[state=active]:border-transparent data-[state=active]:bg-[var(--accent-tint)]"
              >
                {tabLabels.persons}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1 px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2
                className="h-6 w-6 animate-spin text-afh-text-muted"
                aria-label="Chargement en cours"
              />
            </div>
          ) : showNoResultsGuidance ? (
            <EmptyState
              message={`Aucun résultat pour « ${searchQuery.trim()} ».`}
              variant="search"
              lang={language}
            />
          ) : showPrompt ? (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
              <Search
                className="h-12 w-12 text-afh-text-muted opacity-50"
                aria-hidden="true"
              />
              <p className="text-afh-text-soft">{getNoResultsText()}</p>
            </div>
          ) : (
            <div className="space-y-2" data-testid="search-results-list">
              {results.map((result, index) => (
                <SearchResultCard
                  key={`${result.type}-${result.id}-${index}`}
                  result={result}
                  language={language}
                  onNavigate={onClose}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
