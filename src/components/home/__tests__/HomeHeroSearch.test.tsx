import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from "@testing-library/react";

import { HomeHeroSearch, SEED_QUERIES } from "../HomeHeroSearch";
import {
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";
import type { SearchResult } from "@/types/afrik-frontend";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
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
    ALL_KINDS
) {
  return render(<HomeHeroSearch fetchResults={fetchResults} />);
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
  // The accessible name has to survive a placeholder that the design may
  // animate later: a rotating placeholder would otherwise rename the control
  // under a screen-reader user mid-sentence.
  // @req REQ-002
  it("names the field from a label rather than from its placeholder", () => {
    renderSearch();

    const input = field();
    expect(input).toHaveAccessibleName(
      "Rechercher un peuple, un pays ou une famille linguistique"
    );
    expect(input.getAttribute("placeholder")).not.toBe(
      input.getAttribute("aria-label")
    );
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

  // The three seeds teach the three entity kinds at once. A rotating
  // placeholder shows one at a time and vanishes at the moment of focus.
  // @req REQ-002
  it("runs an example query from a seed chip", async () => {
    const fetchResults = vi.fn(async () => ALL_KINDS);
    renderSearch(fetchResults);

    fireEvent.click(screen.getByRole("button", { name: SEED_QUERIES[0] }));

    await screen.findByRole("listbox");
    expect(field()).toHaveValue(SEED_QUERIES[0]);
    expect(fetchResults).toHaveBeenCalledWith(SEED_QUERIES[0]);
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
});
