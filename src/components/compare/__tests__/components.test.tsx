import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { CompareStickyBar } from "../CompareStickyBar";
import { EntityComparePicker } from "../EntityComparePicker";
import type { CompareCandidate } from "@/hooks/use-compare-selection";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

const PEOPLES: CompareCandidate[] = [
  { id: "PPL_YORUBA", type: "peoples", exonym: "Yoruba", autonym: "Yorùbá" },
  { id: "PPL_ZULU", type: "peoples", exonym: "Zulu", autonym: "AmaZulu" },
  { id: "PPL_SHONA", type: "peoples", exonym: "Shona" },
  { id: "PPL_IGBO", type: "peoples", exonym: "Igbo" },
];

const COUNTRIES: CompareCandidate[] = [
  { id: "SEN", type: "countries", exonym: "Sénégal" },
];

const FAMILIES: CompareCandidate[] = [
  { id: "FLG_BANTU", type: "language-families", exonym: "Bantu" },
  { id: "FLG_MANDE", type: "language-families", exonym: "Mandé" },
];

const ALL_24_FAMILIES: CompareCandidate[] = Array.from(
  { length: 24 },
  (_, index) => ({
    id: "FLG_" + String(index).padStart(2, "0"),
    type: "language-families" as const,
    exonym: "Famille " + String(index).padStart(2, "0"),
  })
);

describe("CompareStickyBar", () => {
  // @req REQ-097
  it("shows the N/max count and disables comparer below the minimum", () => {
    const onCompare = vi.fn();
    render(<CompareStickyBar count={1} onCompare={onCompare} />);
    expect(screen.getByText("1/3 sélectionnés")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /comparer/i })).toBeDisabled();
  });

  // @req REQ-097
  it("enables comparer at 2 selections and calls onCompare when clicked", () => {
    const onCompare = vi.fn();
    render(<CompareStickyBar count={2} onCompare={onCompare} />);
    const button = screen.getByRole("button", { name: /comparer/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onCompare).toHaveBeenCalledTimes(1);
  });

  // @req REQ-097
  it("exposes a labelled region so it can be located regardless of DOM position", () => {
    render(<CompareStickyBar count={0} onCompare={vi.fn()} />);
    expect(
      screen.getByRole("region", { name: /sélection de comparaison/i })
    ).toBeInTheDocument();
  });
});

describe("EntityComparePicker", () => {
  let fetchSuggestions: (
    type: "peoples" | "countries",
    query: string
  ) => Promise<CompareCandidate[]>;
  let fetchLanguageFamilies: () => Promise<CompareCandidate[]>;

  beforeEach(() => {
    fetchSuggestions = vi.fn(async (type: "peoples" | "countries") =>
      type === "peoples" ? PEOPLES : COUNTRIES
    );
    fetchLanguageFamilies = vi.fn(async () => FAMILIES);
  });

  function renderPicker(
    onCompare = vi.fn(),
    overrides: {
      fetchLanguageFamilies?: () => Promise<CompareCandidate[]>;
    } = {}
  ) {
    return render(
      <EntityComparePicker
        onCompare={onCompare}
        fetchSuggestions={fetchSuggestions}
        fetchLanguageFamilies={
          overrides.fetchLanguageFamilies ?? fetchLanguageFamilies
        }
      />,
      { wrapper: createWrapper() }
    );
  }

  // @req REQ-097
  it("renders a labelled type radiogroup before the search combobox", () => {
    renderPicker();
    const radiogroup = screen.getByRole("radiogroup", {
      name: /type d.?entité/i,
    });
    expect(
      within(radiogroup).getByRole("radio", { name: /peuples/i })
    ).toBeInTheDocument();
    expect(
      within(radiogroup).getByRole("radio", { name: /pays/i })
    ).toBeInTheDocument();
    expect(
      within(radiogroup).getByRole("radio", {
        name: /familles linguistiques/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  // @req REQ-097
  it("fetches suggestions from /v2/search once ≥2 characters are typed", async () => {
    renderPicker();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "y" } });
    expect(fetchSuggestions).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "yo" } });
    await waitFor(() => expect(fetchSuggestions).toHaveBeenCalled());
    expect(fetchSuggestions).toHaveBeenCalledWith("peoples", "yo");
    expect(
      await screen.findByRole("option", { name: /yoruba/i })
    ).toBeInTheDocument();
  });

  // @req REQ-097
  it("renders the static family list without a search round-trip", async () => {
    renderPicker();
    fireEvent.click(
      screen.getByRole("radio", { name: /familles linguistiques/i })
    );
    expect(
      await screen.findByRole("option", { name: /bantu/i })
    ).toBeInTheDocument();

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "man" } });
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: /bantu/i })
      ).not.toBeInTheDocument()
    );
    expect(screen.getByRole("option", { name: /mandé/i })).toBeInTheDocument();
    // fetched once (not per keystroke) — the list is filtered client-side.
    expect(fetchLanguageFamilies).toHaveBeenCalledTimes(1);
  });

  // @req REQ-097
  it("renders all 24 FLG entries unfiltered — the family list is never truncated to the search suggestion cap", async () => {
    renderPicker(vi.fn(), {
      fetchLanguageFamilies: vi.fn(async () => ALL_24_FAMILIES),
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /familles linguistiques/i })
    );

    await screen.findByRole("option", { name: /famille 00/i });
    expect(screen.getAllByRole("option")).toHaveLength(24);
  });

  // @req REQ-097
  it("adds an entity via keyboard (ArrowDown + Enter) and announces it politely", async () => {
    renderPicker();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "yo" } });
    await screen.findByRole("option", { name: /yoruba/i });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(
      screen.getByRole("button", { name: /retirer yorùbá/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Yorùbá ajouté à la comparaison, 1 sur 3"
    );
  });

  // @req REQ-097
  it("closes the listbox on Escape", async () => {
    renderPicker();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "yo" } });
    await screen.findByRole("option", { name: /yoruba/i });

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: /yoruba/i })
      ).not.toBeInTheDocument()
    );
  });

  // @req REQ-097
  it("locks the type radiogroup once a first entity is selected", async () => {
    renderPicker();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "yo" } });
    const option = await screen.findByRole("option", { name: /yoruba/i });
    fireEvent.click(option);

    expect(screen.getByRole("radio", { name: /pays/i })).toBeDisabled();
    expect(
      screen.getByRole("radio", { name: /familles linguistiques/i })
    ).toBeDisabled();
    expect(screen.getByRole("radio", { name: /peuples/i })).toBeEnabled();
  });

  // @req REQ-097
  it("disables the combobox and explains the 3-maximum rule once full", async () => {
    renderPicker();
    const input = screen.getByRole("combobox");

    for (const candidate of PEOPLES.slice(0, 3)) {
      fireEvent.change(input, { target: { value: "yo" } });
      const option = await screen.findByRole("option", {
        name: new RegExp(candidate.exonym, "i"),
      });
      fireEvent.click(option);
    }

    expect(screen.getByText(/3 maximum/i)).toBeInTheDocument();
    expect(input).toBeDisabled();
  });
});
