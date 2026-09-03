import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAutocomplete } from "../use-autocomplete";

interface Hit {
  id: string;
  name: string;
}

const yoruba: Hit = { id: "PPL_YORUBA", name: "Yoruba" };
const yombe: Hit = { id: "PPL_YOMBE", name: "Yombe" };
const zulu: Hit = { id: "PPL_ZULU", name: "Zulu" };

/**
 * The debounce is real time, so every test that expects a fetch has to let it
 * elapse. Fake timers would let the assertions run inside the debounce and
 * pass whatever the hook did — the failure mode this suite exists to catch.
 */
const DEBOUNCE = 10;

function setup(
  fetchSuggestions: (query: string) => Promise<Hit[]>,
  options: Partial<Parameters<typeof useAutocomplete<Hit>>[0]> = {}
) {
  return renderHook(() =>
    useAutocomplete<Hit>({
      fetchSuggestions,
      debounceMs: DEBOUNCE,
      ...options,
    })
  );
}

describe("useAutocomplete", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // @req REQ-002
  it("stays closed and silent until the query is long enough", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba]);
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("y"));

    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE * 3));

    expect(fetchSuggestions).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.options).toEqual([]);
  });

  // @req REQ-002
  it("opens with the hits once a typed query resolves", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba, yombe]);
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("yo"));

    await waitFor(() => expect(result.current.isOpen).toBe(true));
    expect(fetchSuggestions).toHaveBeenCalledWith("yo");
    expect(result.current.options).toEqual([yoruba, yombe]);
  });

  /**
   * The reason the hook owns the fetch at all. Four components each grew
   * their own debounce; only one of them also guarded against the slow
   * earlier query landing last and repainting the panel with the wrong
   * answer.
   */
  // @req REQ-002
  it("ignores a stale response that lands after a newer one", async () => {
    const settle: Record<string, (hits: Hit[]) => void> = {};
    const fetchSuggestions = vi.fn(
      (query: string) =>
        new Promise<Hit[]>((resolve) => {
          settle[query] = resolve;
        })
    );
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("yor"));
    await waitFor(() => expect(settle.yor).toBeDefined());

    act(() => result.current.setQuery("yoruba"));
    await waitFor(() => expect(settle.yoruba).toBeDefined());

    // The older request answers last.
    await act(async () => {
      settle.yoruba([yoruba]);
      settle.yor([yombe, zulu]);
    });

    expect(result.current.options).toEqual([yoruba]);
  });

  // @req REQ-002
  it("caps the hits it will let the reader walk through", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba, yombe, zulu]);
    const { result } = setup(fetchSuggestions, { limit: 2 });

    act(() => result.current.setQuery("y".repeat(2)));

    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(result.current.options).toEqual([yoruba, yombe]);
  });

  // @req REQ-002
  it("walks the options with the arrow keys and wraps at neither end", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba, yombe]);
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("yo"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    expect(result.current.activeIndex).toBe(-1);

    act(() => result.current.handleKeyDown(keyEvent("ArrowDown")));
    expect(result.current.activeIndex).toBe(0);

    act(() => result.current.handleKeyDown(keyEvent("ArrowDown")));
    expect(result.current.activeIndex).toBe(1);

    // Already on the last option: it stays there rather than cycling round.
    act(() => result.current.handleKeyDown(keyEvent("ArrowDown")));
    expect(result.current.activeIndex).toBe(1);

    act(() => result.current.handleKeyDown(keyEvent("ArrowUp")));
    expect(result.current.activeIndex).toBe(0);

    act(() => result.current.handleKeyDown(keyEvent("ArrowUp")));
    expect(result.current.activeIndex).toBe(0);
  });

  // @req REQ-002
  it("selects the active option on Enter and closes", async () => {
    const onSelect = vi.fn();
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba, yombe]);
    const { result } = setup(fetchSuggestions, { onSelect });

    act(() => result.current.setQuery("yo"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    act(() => result.current.handleKeyDown(keyEvent("ArrowDown")));
    act(() => result.current.handleKeyDown(keyEvent("ArrowDown")));

    const enter = keyEvent("Enter");
    act(() => result.current.handleKeyDown(enter));

    expect(onSelect).toHaveBeenCalledWith(yombe);
    expect(enter.preventDefault).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  /**
   * Enter with nothing highlighted must reach the form: it is how a reader
   * runs the query they typed rather than one of the suggestions.
   */
  // @req REQ-002
  it("lets Enter through to the form when no option is highlighted", async () => {
    const onSelect = vi.fn();
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba]);
    const { result } = setup(fetchSuggestions, { onSelect });

    act(() => result.current.setQuery("yo"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    const enter = keyEvent("Enter");
    act(() => result.current.handleKeyDown(enter));

    expect(onSelect).not.toHaveBeenCalled();
    expect(enter.preventDefault).not.toHaveBeenCalled();
  });

  // @req REQ-002
  it("closes on Escape without taking the reader's words", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba]);
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("yoruba"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    act(() => result.current.handleKeyDown(keyEvent("Escape")));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.query).toBe("yoruba");
  });

  // @req REQ-002
  it("reopens on the next keystroke after a dismissal", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba]);
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("yoru"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    act(() => result.current.dismiss());
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.setQuery("yorub"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));
  });

  /**
   * A `?q=` the reader arrived with is not a keystroke. The suggest panel
   * opening over results the reader asked for was ETNI-1793.
   */
  // @req REQ-002
  it("does not fetch or open for a seeded query the reader never typed", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba]);
    const { result } = setup(fetchSuggestions, { initialQuery: "yoruba" });

    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE * 3));

    expect(result.current.query).toBe("yoruba");
    expect(fetchSuggestions).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  // @req REQ-002
  it("clears the field, the options and the highlight together", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba]);
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("yoruba"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));
    act(() => result.current.handleKeyDown(keyEvent("ArrowDown")));

    act(() => result.current.clear());

    expect(result.current.query).toBe("");
    expect(result.current.options).toEqual([]);
    expect(result.current.activeIndex).toBe(-1);
    expect(result.current.isOpen).toBe(false);
  });

  /**
   * A picked suggestion goes into the field as a resolved query, not as a
   * new question — otherwise the panel reopens on top of the results the
   * pick just asked for.
   */
  // @req REQ-002
  it("puts a committed query in the field without reopening the panel", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba, yombe]);
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("yo"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    act(() => result.current.commit("Yoruba"));

    expect(result.current.query).toBe("Yoruba");
    expect(result.current.isOpen).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE * 3));

    expect(fetchSuggestions).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });

  // @req REQ-002
  it("drops the highlight when the options underneath it change", async () => {
    const fetchSuggestions = vi
      .fn()
      .mockResolvedValueOnce([yoruba, yombe])
      .mockResolvedValueOnce([zulu]);
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("yo"));
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    act(() => result.current.handleKeyDown(keyEvent("ArrowDown")));
    expect(result.current.activeIndex).toBe(0);

    act(() => result.current.setQuery("zu"));
    await waitFor(() => expect(result.current.options).toEqual([zulu]));

    expect(result.current.activeIndex).toBe(-1);
  });

  /** The pointer highlights an option the same way the arrow keys do. */
  // @req REQ-002
  it("lets the caller highlight an option under the pointer", async () => {
    const onSelect = vi.fn();
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba, yombe]);
    const { result } = setup(fetchSuggestions, { onSelect });

    act(() => result.current.setQuery("yo"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    act(() => result.current.highlight(1));

    expect(result.current.activeIndex).toBe(1);
    expect(result.current.activeOption).toEqual(yombe);

    act(() => result.current.handleKeyDown(keyEvent("Enter")));
    expect(onSelect).toHaveBeenCalledWith(yombe);
  });

  // @req REQ-002
  it("reopens a dismissed panel when the reader comes back to the field", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba]);
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("yoruba"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    act(() => result.current.dismiss());
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.reopen());

    expect(result.current.isOpen).toBe(true);
    expect(fetchSuggestions).toHaveBeenCalledTimes(1);
  });

  /**
   * A query that came back empty is still an answer: the accueil says so in
   * the panel and offers near-miss leads there. `isOpen` alone cannot carry
   * that, since it is false precisely when there is nothing to list.
   */
  // @req REQ-002
  it("separates having answered from having something to list", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([]);
    const { result } = setup(fetchSuggestions);

    expect(result.current.isAnswered).toBe(false);

    act(() => result.current.setQuery("qqq"));
    await waitFor(() => expect(result.current.isAnswered).toBe(true));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.options).toEqual([]);

    act(() => result.current.dismiss());
    expect(result.current.isAnswered).toBe(false);
  });

  /** The accueil caps each class of result separately, not the list as a whole. */
  // @req REQ-002
  it("lets the caller arrange the hits before they are numbered", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yombe, zulu, yoruba]);
    const { result } = setup(fetchSuggestions, {
      arrange: (hits: Hit[]) => [...hits].reverse(),
    });

    act(() => result.current.setQuery("yo"));
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    expect(result.current.options).toEqual([yoruba, zulu, yombe]);

    act(() => result.current.handleKeyDown(keyEvent("ArrowDown")));
    expect(result.current.activeOption).toEqual(yoruba);
  });

  // @req REQ-002
  it("reports the combobox contract a listbox owner owes", async () => {
    const fetchSuggestions = vi.fn().mockResolvedValue([yoruba]);
    const { result } = setup(fetchSuggestions);

    expect(result.current.comboboxProps.role).toBe("combobox");
    expect(result.current.comboboxProps["aria-expanded"]).toBe(false);
    expect(result.current.comboboxProps["aria-controls"]).toBe(
      result.current.listboxId
    );
    expect(result.current.comboboxProps["aria-autocomplete"]).toBe("list");
    expect(
      result.current.comboboxProps["aria-activedescendant"]
    ).toBeUndefined();

    act(() => result.current.setQuery("yoruba"));
    await waitFor(() =>
      expect(result.current.comboboxProps["aria-expanded"]).toBe(true)
    );

    act(() => result.current.handleKeyDown(keyEvent("ArrowDown")));

    expect(result.current.comboboxProps["aria-activedescendant"]).toBe(
      result.current.getOptionProps(0).id
    );
    expect(result.current.getOptionProps(0)["aria-selected"]).toBe(true);
    expect(result.current.getOptionProps(0).role).toBe("option");
  });

  // @req REQ-002
  it("hands the winning hits to the caller for a follow-up query", async () => {
    const onResolved = vi.fn();
    const fetchSuggestions = vi.fn().mockResolvedValue([]);
    const { result } = setup(fetchSuggestions, { onResolved });

    act(() => result.current.setQuery("qqq"));

    await waitFor(() => expect(onResolved).toHaveBeenCalledWith([], "qqq"));
  });

  // @req REQ-002
  it("reports a fetch in flight and stops reporting it on failure", async () => {
    const fetchSuggestions = vi.fn().mockRejectedValue(new Error("offline"));
    const { result } = setup(fetchSuggestions);

    act(() => result.current.setQuery("yoruba"));

    await waitFor(() => expect(fetchSuggestions).toHaveBeenCalled());
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.options).toEqual([]);
    expect(result.current.isOpen).toBe(false);
  });
});

/** A keyboard event stub carrying only what the hook is allowed to touch. */
function keyEvent(key: string) {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLInputElement> & {
    preventDefault: ReturnType<typeof vi.fn>;
  };
}
