import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

import {
  HomeHeroSearch,
  DEBOUNCE_MS,
  PENDING_DELAY_MS,
  SEARCH_LABEL,
  SEARCH_RESULT_GROUPS,
} from "../HomeHeroSearch";
import { seedPools } from "../HomeHeroSeeds";
import { SEARCH_ENTITY_ACCENT } from "@/components/search/searchEntityAccent";
import { FALLBACK_SEED_WORDS } from "@/lib/home/seedWords";

/** The pools the row renders when no words are injected. */
const SEED_POOLS = seedPools(FALLBACK_SEED_WORDS);
import {
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";
import type { SearchLead, SearchResult } from "@/types/afrik-frontend";
import { search as searchCorpus } from "@/lib/afrikLoader";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock("@/lib/afrikLoader", () => ({
  search: vi.fn(async () => []),
  searchWithLeads: vi.fn(async () => ({ results: [], leads: [] })),
}));

const YORUBA: SearchResult = {
  type: "people",
  id: "PPL_YORUBA",
  name: "Yoruba",
  exactMatch: true,
  relevance: 0.9,
};
const NIGERIA: SearchResult = {
  type: "country",
  id: "NGA",
  name: "Nigeria",
  exactMatch: false,
  relevance: 0.5,
};
const NIGER_CONGO: SearchResult = {
  type: "languageFamily",
  id: "FLG_NIGER_CONGO",
  name: "Niger-Congo",
  exactMatch: false,
  relevance: 0.4,
};

const ALL_KINDS = [YORUBA, NIGERIA, NIGER_CONGO];

function renderSearch(
  fetchResults: (query: string) => Promise<SearchResult[]> = async () =>
    ALL_KINDS,
  fetchLeads?: (query: string) => Promise<SearchLead[]>
) {
  return render(
    <HomeHeroSearch fetchResults={fetchResults} fetchLeads={fetchLeads} />
  );
}

function field() {
  return screen.getByRole("combobox");
}

async function type(value: string) {
  fireEvent.change(field(), { target: { value } });
}

beforeEach(() => {
  push.mockClear();
});

describe("HomeHeroSearch", () => {
  // Production renders this component without a fetcher, so the default is
  // the only path the hero ever takes to the corpus (ETNI-1415 AC2).
  // @req REQ-108
  it("searches through the shared corpus client when no fetcher is injected", async () => {
    render(<HomeHeroSearch />);

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "Yoruba" },
      });
      await new Promise((r) => setTimeout(r, DEBOUNCE_MS + 50));
    });

    expect(searchCorpus).toHaveBeenCalledWith("Yoruba");
  });

  // The accessible name has to survive a placeholder that the design may
  // animate later: a rotating placeholder would otherwise rename the control
  // under a screen-reader user mid-sentence.
  // @req REQ-002
  it("names the field from a label rather than from its placeholder", () => {
    renderSearch();

    expect(field()).toHaveAccessibleName(SEARCH_LABEL);
  });

  // The label used to be sr-only, so a sighted reader had only the
  // placeholder — which empties at the moment of focus, exactly when the
  // scope would be worth reading.
  // @req REQ-002
  it("shows the label instead of reserving it for screen readers", () => {
    const { container } = renderSearch();

    const label = container.querySelector("label");
    expect(label).toHaveTextContent(SEARCH_LABEL);
    expect(label?.className ?? "").not.toContain("sr-only");
  });

  // The label may name a kind only if the panel below can group it. It once
  // named three because the panel showed three; both now carry five, and the
  // invariant is what is asserted rather than the number.
  // @req REQ-002
  it("names every kind the panel groups, and no other", () => {
    for (const { type } of SEARCH_RESULT_GROUPS) {
      // The singular of the same kind, from the one table that assigns a
      // kind's label and accent product-wide.
      const kind = SEARCH_ENTITY_ACCENT[type].label.toLowerCase();
      expect(SEARCH_LABEL.toLowerCase()).toContain(kind);
    }
  });

  // `persons` has no rows. Naming a kind the corpus cannot return is the one
  // promise this surface may not break — the reason the label was held to
  // three kinds in the first place.
  // @req REQ-002
  it("names no kind the corpus cannot answer with", () => {
    expect(SEARCH_LABEL).not.toMatch(/personne/i);
    expect(SEARCH_RESULT_GROUPS.map((group) => group.type)).not.toContain(
      "person"
    );
  });

  // Label and placeholder twenty pixels apart, saying the same sentence, is
  // read twice and learnt once. The label carries the scope, so the
  // placeholder carries what to type instead.
  // @req REQ-002
  it("does not repeat the scope in the placeholder", () => {
    renderSearch();

    const placeholder = field().getAttribute("placeholder") ?? "";
    expect(placeholder).not.toBe(SEARCH_LABEL);
    expect(placeholder).not.toMatch(/peuple|pays|famille|langue|\bnom\b/i);
    expect(placeholder).toBe("Ex. Bafut, Fulfulde, Namibie, Keïta");
  });

  // Opening the phone keyboard on load buries the page under it and steals
  // the scroll. The search dialog may autofocus — it is a dialog; a band the
  // reader landed on may not.
  // @req REQ-002
  it("leaves the focus alone on arrival", () => {
    renderSearch();

    expect(document.activeElement).not.toBe(field());
  });

  // iOS autocorrect rewrites autonyms — the one class of word the corpus
  // exists to spell correctly. Capitalisation and spellcheck go with it.
  // @req REQ-002
  it("disables the corrections that would rewrite an autonym", () => {
    renderSearch();

    const input = field();
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("autocorrect", "off");
    expect(input).toHaveAttribute("autocapitalize", "off");
    expect(input).toHaveAttribute("spellcheck", "false");
    expect(input).toHaveAttribute("enterkeyhint", "search");
  });

  // @req REQ-002
  it("asks the corpus nothing below the minimum query length", async () => {
    const fetchResults = vi.fn(async () => ALL_KINDS);
    renderSearch(fetchResults);

    await type("y");

    await waitFor(() =>
      expect(field()).toHaveAttribute("aria-expanded", "false")
    );
    expect(fetchResults).not.toHaveBeenCalled();
  });

  // The API answers `{ peoples, countries, families }` — three typed arrays,
  // never one flat list. Grouping the panel the same way is what lets a
  // reader who cannot classify their own query ("Kongo" is both a people and
  // a country) read the answer instead of being asked for the question.
  // @req REQ-002
  it("groups the suggestions by entity kind", async () => {
    renderSearch();

    await type("yoruba");

    const listbox = await screen.findByRole("listbox");
    const groups = within(listbox).getAllByRole("group");

    expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual([
      "Peuples",
      "Pays",
      "Familles linguistiques",
    ]);
    expect(within(groups[0]).getByRole("option")).toHaveTextContent("Yoruba");
    expect(within(groups[1]).getByRole("option")).toHaveTextContent("Nigeria");
    expect(within(groups[2]).getByRole("option")).toHaveTextContent(
      "Niger-Congo"
    );
  });

  // @req REQ-002
  it("points every suggestion at its own fiche", async () => {
    renderSearch();

    await type("yoruba");
    await screen.findByRole("listbox");

    expect(screen.getByRole("option", { name: /Yoruba/ })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_YORUBA")
    );
    expect(screen.getByRole("option", { name: /Nigeria/ })).toHaveAttribute(
      "href",
      getCountryRoute("fr", "NGA")
    );
    expect(screen.getByRole("option", { name: /Niger-Congo/ })).toHaveAttribute(
      "href",
      getFamilyRoute("fr", "FLG_NIGER_CONGO")
    );
  });

  // @req REQ-002
  it("moves the active descendant with the arrow keys", async () => {
    renderSearch();

    await type("yoruba");
    await screen.findByRole("listbox");

    const input = field();
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).not.toHaveAttribute("aria-activedescendant");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    const firstOption = screen.getByRole("option", { name: /Yoruba/ });
    expect(input).toHaveAttribute("aria-activedescendant", firstOption.id);
    expect(firstOption).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: /Nigeria/ }).id
    );
  });

  // @req REQ-002
  it("opens the active suggestion on Enter", async () => {
    renderSearch();

    await type("yoruba");
    await screen.findByRole("listbox");

    fireEvent.keyDown(field(), { key: "ArrowDown" });
    fireEvent.keyDown(field(), { key: "Enter" });

    expect(push).toHaveBeenCalledWith(getPeopleRoute("fr", "PPL_YORUBA"));
  });

  // @req REQ-002
  it("closes the panel on Escape", async () => {
    renderSearch();

    await type("yoruba");
    await screen.findByRole("listbox");

    fireEvent.keyDown(field(), { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    );
  });

  // A dead end here reads as "the corpus is empty" on the one screen that has
  // to say the opposite. The panel therefore always offers a way onward.
  // @req REQ-002
  it("offers a way onward when nothing matches", async () => {
    renderSearch(async () => []);

    await type("zzzz");

    const message = await screen.findByTestId("state-copy");
    // The wording is what matters here, not the typography: French quotes
    // carry non-breaking spaces, and the query sits in its own text node.
    expect(message.textContent?.replace(/\u00a0/g, " ").trim()).toBe(
      "Aucune fiche pour « zzzz »."
    );
    expect(
      screen.getByRole("link", { name: "Parcourir les familles linguistiques" })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "families"));
  });

  // @req REQ-125
  it("shows near-miss leads once the corpus itself came back empty", async () => {
    const fetchLeads = vi.fn(async () => [
      {
        type: "languageFamily" as const,
        id: "FLG_MANDE",
        name: "Mandé",
        similarity: 0.5,
      },
    ]);
    renderSearch(async () => [], fetchLeads);

    await type("zzzz");

    await screen.findByTestId("state-copy");
    expect(fetchLeads).toHaveBeenCalledWith("zzzz");
    expect(screen.getByRole("link", { name: /Mandé/ })).toHaveAttribute(
      "href",
      getFamilyRoute("fr", "FLG_MANDE")
    );
  });

  // @req REQ-125
  it("never asks for near-miss leads once the corpus already answered", async () => {
    const fetchLeads = vi.fn(async () => []);
    renderSearch(async () => ALL_KINDS, fetchLeads);

    await type("yoruba");

    await screen.findByRole("listbox");
    expect(fetchLeads).not.toHaveBeenCalled();
  });

  // A seed is a shortcut to the full result page, not a second search mode.
  // Its activation therefore follows the same GET path as typing that word
  // and submitting the form, rather than stopping in the suggestion panel.
  // @req REQ-002
  it("submits a seed chip through the full search path", () => {
    const fetchResults = vi.fn(async () => ALL_KINDS);
    renderSearch(fetchResults);

    const first = SEED_POOLS[0].words[0];
    fireEvent.click(screen.getByRole("button", { name: first }));

    expect(push).toHaveBeenCalledWith(
      `${getLocalizedRoute("fr", "search")}?${new URLSearchParams({ q: first })}`
    );
    expect(field()).toHaveValue("");
    expect(fetchResults).not.toHaveBeenCalled();
  });

  // The native WebKit cross is suppressed by the field's own stylesheet, so a
  // replacement is owed rather than optional.
  // @req REQ-002
  it("offers nothing to clear while the field is empty", () => {
    renderSearch();

    expect(
      screen.queryByRole("button", { name: "Effacer la recherche" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-002
  it("empties the field and hands the focus back", async () => {
    renderSearch();

    await type("kongo");
    fireEvent.click(
      screen.getByRole("button", { name: "Effacer la recherche" })
    );

    expect(field()).toHaveValue("");
    expect(document.activeElement).toBe(field());
  });

  // The field sits in a GET form, where a button with no type is a submit
  // button: clearing would navigate to the search page instead of emptying.
  // @req REQ-002
  it("clears without submitting the form", async () => {
    renderSearch();

    await type("kongo");

    expect(
      screen.getByRole("button", { name: "Effacer la recherche" })
    ).toHaveAttribute("type", "button");
  });

  // Two gestures, one key: the panel goes first because it is what the reader
  // can see, and only a second press touches their text.
  // @req REQ-002
  it("dismisses the panel on Escape before it clears the query", async () => {
    renderSearch();

    await type("yoruba");
    await screen.findByRole("listbox");

    fireEvent.keyDown(field(), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    );
    expect(field()).toHaveValue("yoruba");

    fireEvent.keyDown(field(), { key: "Escape" });
    expect(field()).toHaveValue("");
  });

  // A plain GET form, so the hero still reaches the search page on a phone
  // that never ran the island's JavaScript. The panel is the enhancement;
  // this is the feature.
  // @req REQ-002
  it("hands a submitted query to the full search page without scripting", () => {
    renderSearch();

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", getLocalizedRoute("fr", "search"));
    expect(field()).toHaveAttribute("name", "q");
  });

  /**
   * The panel sat in the flow, so opening it pushed the seed chips, the visual
   * and everything below them down the page. The reason recorded for that was
   * the band's own `overflow: hidden`; the reader's experience of it is the
   * content jumping under a panel that should have covered it.
   *
   * happy-dom carries no layout engine and does not resolve the component's
   * own <style>, so a measured assertion would pass against any value at all
   * (siteBrandLockup.test.tsx says as much). The rule the component ships is
   * read instead — the instrument singleSearchSurface.test.ts already uses.
   * Measuring the result is the browser pass's job, not this one's.
   */
  describe("the suggestions panel covers the band", () => {
    function shippedCss(container: HTMLElement): string {
      return Array.from(container.querySelectorAll("style"))
        .map((sheet) => sheet.textContent ?? "")
        .join("\n");
    }

    // @req REQ-002
    it("takes the panel out of the flow rather than pushing the content down", async () => {
      const { container } = renderSearch();

      await type("yoruba");
      await screen.findByRole("listbox");

      const css = shippedCss(container);
      expect(css).toMatch(
        /\.home-hero-search-panel\s*\{[^}]*position:\s*absolute/
      );
    });

    // Anchored to the field, not to the whole block: hung off
    // `.home-hero-search` the panel would open below the seed chips instead of
    // directly under the field it belongs to.
    // @req REQ-002
    it("anchors the panel to the field it belongs to", async () => {
      const { container } = renderSearch();

      await type("yoruba");
      const listbox = await screen.findByRole("listbox");

      const anchor = listbox.parentElement as HTMLElement;
      expect(anchor).toContainElement(screen.getByRole("search"));

      const anchorClass = anchor.className.trim().split(/\s+/)[0];
      expect(shippedCss(container)).toMatch(
        new RegExp(`\\.${anchorClass}\\s*\\{[^}]*position:\\s*relative`)
      );
    });
  });

  /**
   * The panel had no dismissal beyond Escape and emptying the field — no blur,
   * no press outside it, nothing on the way to another page. It therefore
   * stayed open over whatever came next, which is what a reader reports as the
   * bar still being active once they have left for the results page.
   */
  describe("the panel gives way", () => {
    // @req REQ-002
    it("closes once the focus leaves the field", async () => {
      renderSearch();

      await type("yoruba");
      await screen.findByRole("listbox");

      fireEvent.blur(field());

      await waitFor(() =>
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      );
    });

    // @req REQ-002
    it("closes once a suggestion is followed", async () => {
      renderSearch();

      await type("yoruba");
      await screen.findByRole("listbox");

      fireEvent.click(screen.getByRole("option", { name: /Yoruba/ }));

      await waitFor(() =>
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      );
    });

    // The one the reader described: the query goes to the results page and the
    // panel has to be gone by the time that page is what they are looking at.
    // @req REQ-002
    it("closes once the query is handed to the results page", async () => {
      renderSearch();

      await type("yoruba");
      await screen.findByRole("listbox");

      fireEvent.submit(screen.getByRole("search"));

      await waitFor(() =>
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      );
    });
  });

  // The silence between the last keystroke and the panel is the debounce plus
  // a round trip — long enough on a phone to read as a broken field.
  describe("while the corpus is being asked", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function deferredSearch() {
      let settle!: (results: SearchResult[]) => void;
      const answer = new Promise<SearchResult[]>((resolve) => {
        settle = resolve;
      });
      return { fetchResults: () => answer, settle };
    }

    async function tick(ms: number) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    }

    // The row hears its own hover and focus, but reaching for the field is a
    // sign of the reader that only this component can see — and a word that
    // moves while someone is aiming at it is a target that moves. Caught in a
    // browser, not here: the unit test below is the one that was missing.
    // @req REQ-002
    it("stops the seed reels when the field takes focus", async () => {
      renderSearch();

      const reel = () =>
        document.querySelector("[data-reel-current]")?.textContent;

      // Witness first: left alone, this reel does turn. Without it the
      // assertion below would hold just as well on a reel that never moved.
      const opening = reel();
      await tick(SEED_POOLS[0].startDelayMs + 50);
      const turned = reel();
      expect(turned).not.toBe(opening);

      fireEvent.focus(field());
      await tick(SEED_POOLS[0].dwellMs * 3);

      expect(reel()).toBe(turned);
    });

    // @req REQ-002
    it("marks the field busy for as long as the request is in flight", async () => {
      const { fetchResults, settle } = deferredSearch();
      renderSearch(fetchResults);

      await type("kongo");
      await tick(DEBOUNCE_MS + 10);
      expect(field()).toHaveAttribute("aria-busy", "true");

      await act(async () => {
        settle([]);
      });
      expect(field()).toHaveAttribute("aria-busy", "false");
    });

    // An indicator that appears and vanishes inside 150 ms is a flicker, and
    // reads worse than the silence it was meant to fill.
    // @req REQ-002
    it("shows no indicator when the answer comes back quickly", async () => {
      const { fetchResults, settle } = deferredSearch();
      renderSearch(fetchResults);

      await type("kongo");
      await tick(DEBOUNCE_MS + 10);
      await act(async () => {
        settle([]);
      });
      await tick(PENDING_DELAY_MS + 50);

      expect(screen.queryByTestId("home-hero-search-pending")).toBeNull();
    });

    // @req REQ-002
    it("shows an indicator once the wait becomes noticeable", async () => {
      const { fetchResults } = deferredSearch();
      renderSearch(fetchResults);

      await type("kongo");

      await tick(DEBOUNCE_MS + 10);
      expect(screen.queryByTestId("home-hero-search-pending")).toBeNull();

      await tick(PENDING_DELAY_MS + 20);
      expect(
        screen.getByTestId("home-hero-search-pending")
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Recherche en cours"
      );
    });
  });
});
