"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * The one owner of the "type, wait, suggest, walk, pick" behaviour.
 *
 * The corpus search has a single transport — every caller reaches it through
 * `search()` in `afrikLoader`, and a contract test forbids any other route to
 * `/api/v2/search`. The *interface* on top of that transport had no owner, so
 * four components grew their own: four debounces, four listboxes, four
 * keyboard contracts, and an ARIA role that came out `combobox` twice,
 * `searchbox` once and absent once. Nobody decided that; it is what a
 * capability re-implemented four times produces.
 *
 * What lives here is the mechanism only — the query, the debounce, the
 * staleness ticket, the active option and the open/closed state, plus the
 * ARIA props a listbox owner owes. What each surface renders, groups, or
 * navigates to on selection stays with that surface.
 */
export interface UseAutocompleteOptions<T> {
  /** Reaches the corpus. Called only with a query the reader actually typed. */
  fetchSuggestions: (query: string) => Promise<T[]>;
  /** Runs when Enter commits the highlighted option. */
  onSelect?: (option: T) => void;
  /**
   * Runs when a fetch wins the staleness race, including when it came back
   * empty — which is when a caller asks the corpus for near-miss leads.
   */
  onResolved?: (options: T[], query: string) => void;
  /** Seeds the field without treating it as a keystroke. */
  initialQuery?: string;
  minLength?: number;
  debounceMs?: number;
  /** Ceiling on how many hits become navigable options. */
  limit?: number;
  /**
   * Reorders or thins the hits before they are numbered — the accueil caps
   * each class of result separately rather than the list as a whole. Runs
   * before `limit`, so the option a keystroke highlights is always the option
   * the reader sees.
   */
  arrange?: (hits: T[]) => T[];
}

export interface AutocompleteOptionProps {
  id: string;
  role: "option";
  "aria-selected": boolean;
}

export interface AutocompleteComboboxProps {
  role: "combobox";
  "aria-expanded": boolean;
  "aria-controls": string;
  "aria-autocomplete": "list";
  "aria-activedescendant": string | undefined;
}

export interface UseAutocompleteResult<T> {
  query: string;
  setQuery: (query: string) => void;
  options: T[];
  /** True while a fetch for the current query is in flight. */
  pending: boolean;
  isOpen: boolean;
  /**
   * The current query has an answer to show and has not been dismissed —
   * true even when that answer is "nothing found", which `isOpen` cannot
   * express since it is false exactly then.
   */
  isAnswered: boolean;
  activeIndex: number;
  activeOption: T | undefined;
  listboxId: string;
  comboboxProps: AutocompleteComboboxProps;
  getOptionProps: (index: number) => AutocompleteOptionProps;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Moves the highlight, for a pointer hovering an option. */
  highlight: (index: number) => void;
  /** Closes the panel and keeps the query — a reader who submits sees it again. */
  dismiss: () => void;
  /** Shows the answers already fetched again, without asking for them twice. */
  reopen: () => void;
  /**
   * Puts a resolved query in the field — a picked suggestion, not a new
   * question — so the panel stays shut instead of reopening over its answer.
   */
  commit: (value: string) => void;
  clear: () => void;
}

const DEFAULT_MIN_LENGTH = 2;
const DEFAULT_DEBOUNCE_MS = 300;

// @req REQ-002
export function useAutocomplete<T>({
  fetchSuggestions,
  onSelect,
  onResolved,
  initialQuery = "",
  minLength = DEFAULT_MIN_LENGTH,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  limit,
  arrange,
}: UseAutocompleteOptions<T>): UseAutocompleteResult<T> {
  const [query, setQueryState] = useState(initialQuery);
  const [options, setOptions] = useState<T[]>([]);
  const [answered, setAnswered] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const listboxId = useId();

  // A `?q=` the reader arrived with is not a keystroke: it must not open a
  // suggest panel over the results it was about to fetch (ETNI-1793).
  const typed = useRef(false);
  // Only the newest query may write to state — a slow "yor" landing after
  // "yoruba" would otherwise repopulate the panel with the wrong answer.
  const latestTicket = useRef(0);

  // Read through a ref so a caller passing inline closures does not re-arm the
  // debounce on every render. Synced in an effect, which runs long before the
  // debounce it serves elapses.
  const callbacks = useRef({ fetchSuggestions, onResolved, arrange });
  useEffect(() => {
    callbacks.current = { fetchSuggestions, onResolved, arrange };
  });

  const trimmed = query.trim();
  const longEnough = trimmed.length >= minLength;

  useEffect(() => {
    if (!typed.current) return;

    if (!longEnough) {
      latestTicket.current++;
      setOptions((current) => (current.length === 0 ? current : []));
      setAnswered(false);
      setPending(false);
      return;
    }

    const ticket = ++latestTicket.current;
    const timer = setTimeout(async () => {
      // Armed after the debounce, not on the keystroke: the wait is deliberate
      // dead time, and reporting it would blink the indicator on every letter.
      setPending(true);
      try {
        const hits = await callbacks.current.fetchSuggestions(trimmed);
        if (ticket !== latestTicket.current) return;
        const arranged = callbacks.current.arrange?.(hits) ?? hits;
        const capped =
          limit === undefined ? arranged : arranged.slice(0, limit);
        setOptions(capped);
        setAnswered(true);
        callbacks.current.onResolved?.(capped, trimmed);
      } catch {
        if (ticket !== latestTicket.current) return;
        setOptions([]);
        setAnswered(false);
      } finally {
        if (ticket === latestTicket.current) setPending(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [trimmed, longEnough, debounceMs, limit]);

  // The highlight belongs to the list it was pointing into; a new list makes
  // it meaningless rather than merely out of date.
  useEffect(() => {
    setActiveIndex(-1);
  }, [options, trimmed]);

  const setQuery = useCallback((next: string) => {
    typed.current = true;
    setQueryState(next);
    setDismissed(false);
  }, []);

  const highlight = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setActiveIndex(-1);
  }, []);

  const reopen = useCallback(() => {
    setDismissed(false);
  }, []);

  const commit = useCallback((value: string) => {
    latestTicket.current++;
    typed.current = false;
    setQueryState(value);
    setOptions([]);
    setAnswered(false);
    setPending(false);
    setActiveIndex(-1);
  }, []);

  const clear = useCallback(() => {
    latestTicket.current++;
    setQueryState("");
    setOptions([]);
    setAnswered(false);
    setDismissed(false);
    setPending(false);
    setActiveIndex(-1);
  }, []);

  const isAnswered = answered && !dismissed;
  const isOpen = isAnswered && options.length > 0;
  const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;

  const getOptionProps = useCallback(
    (index: number): AutocompleteOptionProps => ({
      id: `${listboxId}-option-${index}`,
      role: "option",
      "aria-selected": index === activeIndex,
    }),
    [listboxId, activeIndex]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        dismiss();
        return;
      }
      if (!isOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter" && activeIndex >= 0) {
        // Enter with nothing highlighted is left alone: it is how the reader
        // submits the words they typed rather than one of the suggestions.
        event.preventDefault();
        const chosen = options[activeIndex];
        dismiss();
        if (chosen !== undefined) onSelect?.(chosen);
      }
    },
    [isOpen, options, activeIndex, dismiss, onSelect]
  );

  const comboboxProps = useMemo<AutocompleteComboboxProps>(
    () => ({
      role: "combobox",
      "aria-expanded": isOpen,
      "aria-controls": listboxId,
      "aria-autocomplete": "list",
      "aria-activedescendant":
        activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined,
    }),
    [isOpen, listboxId, activeIndex]
  );

  return {
    query,
    setQuery,
    options,
    pending,
    isOpen,
    isAnswered,
    activeIndex,
    activeOption,
    listboxId,
    comboboxProps,
    getOptionProps,
    handleKeyDown,
    highlight,
    dismiss,
    reopen,
    commit,
    clear,
  };
}
