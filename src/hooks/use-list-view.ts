import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/shared";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeString, getNormalizedFirstLetter } from "@/lib/normalize";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface UseListViewOptions<T> {
  language: Language;
  items: T[];
  getDisplayName: (item: T) => string;
  getSearchableFields?: (item: T) => string[];
  itemsPerPage?: number;
  maxItemsMobile?: number;
}

interface UseListViewReturn<T> {
  search: string;
  setSearch: (value: string) => void;
  selectedLetter: string | null;
  setSelectedLetter: (letter: string | null) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  filteredItems: T[];
  paginatedItems: T[];
  totalPages: number;
  availableLetters: string[];
  alphabet: string[];
  isMobile: boolean;
  formatNumber: (num: number) => string;
}

export function useListView<T>({
  language,
  items,
  getDisplayName,
  getSearchableFields,
  itemsPerPage = 10,
  maxItemsMobile = 10,
}: UseListViewOptions<T>): UseListViewReturn<T> {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState<string>("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeString(search);
    return items.filter((item) => {
      const fields = getSearchableFields
        ? getSearchableFields(item)
        : [getDisplayName(item)];

      const matchesSearch = fields.some((field) =>
        normalizeString(field).includes(normalizedSearch)
      );

      if (selectedLetter) {
        const normalizedFirstLetter = getNormalizedFirstLetter(
          getDisplayName(item)
        );
        return matchesSearch && normalizedFirstLetter === selectedLetter;
      }

      return matchesSearch;
    });
  }, [items, search, selectedLetter, getDisplayName, getSearchableFields]);

  const paginatedItems = useMemo(() => {
    if (isMobile) {
      return filteredItems.slice(0, maxItemsMobile);
    }
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, isMobile, itemsPerPage, maxItemsMobile]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [selectedLetter, search]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    items.forEach((item) => {
      const normalizedFirstLetter = getNormalizedFirstLetter(
        getDisplayName(item)
      );
      if (/[A-Z]/.test(normalizedFirstLetter)) {
        letters.add(normalizedFirstLetter);
      }
    });
    return Array.from(letters).sort();
  }, [items, getDisplayName]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(
      language === "en"
        ? "en-US"
        : language === "fr"
          ? "fr-FR"
          : language === "es"
            ? "es-ES"
            : "pt-PT"
    ).format(Math.round(num));
  };

  return {
    search,
    setSearch,
    selectedLetter,
    setSelectedLetter,
    currentPage,
    setCurrentPage,
    filteredItems,
    paginatedItems,
    totalPages,
    availableLetters,
    alphabet: ALPHABET,
    isMobile,
    formatNumber,
  };
}
