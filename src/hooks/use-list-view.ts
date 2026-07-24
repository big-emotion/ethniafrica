"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizeString, getNormalizedFirstLetter } from "@/lib/normalize";

export interface UseListViewOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T[]>;
  getDisplayName: (item: T) => string;
  /** Custom filter applied in addition to the letter/search filters. */
  filterFn?: (item: T, normalizedSearch: string) => boolean;
  itemsPerPage?: number;
  /** When true, returns only the first `itemsPerPage` items (mobile). */
  isMobile?: boolean;
}

export interface UseListViewResult<T> {
  items: T[];
  filteredItems: T[];
  paginatedItems: T[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  search: string;
  setSearch: (search: string) => void;
  selectedLetter: string | null;
  setSelectedLetter: (letter: string | null) => void;
  availableLetters: string[];
  isLoading: boolean;
  error: Error | null;
}

export function useListView<T>({
  queryKey,
  queryFn,
  getDisplayName,
  filterFn,
  itemsPerPage = 10,
  isMobile = false,
}: UseListViewOptions<T>): UseListViewResult<T> {
  const [search, setSearch] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
  });

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [search, selectedLetter]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    items.forEach((item) => {
      const letter = getNormalizedFirstLetter(getDisplayName(item));
      if (/[A-Z]/.test(letter)) letters.add(letter);
    });
    return Array.from(letters).sort();
  }, [items, getDisplayName]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeString(search);
    return items.filter((item) => {
      const name = getDisplayName(item);
      const matchesLetter =
        !selectedLetter || getNormalizedFirstLetter(name) === selectedLetter;

      if (filterFn) {
        return matchesLetter && filterFn(item, normalizedSearch);
      }
      return matchesLetter && normalizeString(name).includes(normalizedSearch);
    });
  }, [items, search, selectedLetter, getDisplayName, filterFn]);

  const paginatedItems = useMemo(() => {
    if (isMobile) return filteredItems.slice(0, itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, isMobile, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  return {
    items,
    filteredItems,
    paginatedItems,
    totalPages,
    currentPage,
    setCurrentPage,
    search,
    setSearch,
    selectedLetter,
    setSelectedLetter,
    availableLetters,
    isLoading,
    error: error as Error | null,
  };
}
