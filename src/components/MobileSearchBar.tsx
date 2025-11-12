"use client";

import { Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";

interface MobileSearchBarProps {
  onSearchClick: () => void;
  isSearchOpen: boolean;
  language: Language;
}

export const MobileSearchBar = ({
  onSearchClick,
  isSearchOpen,
  language,
}: MobileSearchBarProps) => {
  const isMobile = useIsMobile();
  const t = getTranslation(language);

  if (!isMobile) return null;

  const placeholder =
    language === "en"
      ? "Search for an ethnicity or country..."
      : language === "fr"
      ? "Rechercher une ethnie ou un pays..."
      : language === "es"
      ? "Buscar una etnia o país..."
      : "Pesquisar uma etnia ou país...";

  return (
    <div className="fixed top-[57px] left-0 right-0 z-40 bg-card border-b shadow-sm lg:hidden">
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-3 bg-background rounded-lg px-4 py-3 cursor-pointer border hover:bg-muted/50 transition-colors"
          onClick={onSearchClick}
        >
          <Search className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 text-muted-foreground text-sm">
            {placeholder}
          </span>
        </div>
      </div>
    </div>
  );
};
