import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchModalV2 } from "../search/SearchModalV2";
import * as afrikLoader from "@/lib/afrikLoader";
import type { SearchResult } from "@/types/afrik-frontend";

// Mock afrikLoader
vi.mock("@/lib/afrikLoader", () => ({
  search: vi.fn(),
}));

// Mock ResizeObserver for ScrollArea
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

const mockSearchResults: SearchResult[] = [
  {
    type: "people",
    id: "PPL_SHONA",
    name: "Shona",
    snippet: "The Shona people of Zimbabwe",
    relevance: 0.95,
    languageFamilyName: "Bantou",
    population: 15000000,
  },
];

describe("SearchModalV2", () => {
  const mockOnClose = vi.fn();
  const mockOnResultSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render search dialog when open", () => {
    render(
      <SearchModalV2
        open={true}
        onClose={mockOnClose}
        language="fr"
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("Recherche")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Rechercher une famille/i)
    ).toBeInTheDocument();
  });

  it("should render English title when language is English", () => {
    render(
      <SearchModalV2
        open={true}
        onClose={mockOnClose}
        language="en"
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search for a family/i)
    ).toBeInTheDocument();
  });

  it("should render Spanish title when language is Spanish", () => {
    render(
      <SearchModalV2
        open={true}
        onClose={mockOnClose}
        language="es"
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("Búsqueda")).toBeInTheDocument();
  });

  it("should render Portuguese title when language is Portuguese", () => {
    render(
      <SearchModalV2
        open={true}
        onClose={mockOnClose}
        language="pt"
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("Pesquisa")).toBeInTheDocument();
  });

  it("should display tab filters", () => {
    render(
      <SearchModalV2
        open={true}
        onClose={mockOnClose}
        language="fr"
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("Tout")).toBeInTheDocument();
    expect(screen.getByText("Familles")).toBeInTheDocument();
    expect(screen.getByText("Peuples")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pays" })).toBeInTheDocument();
  });

  it("should display English tab labels when language is English", () => {
    render(
      <SearchModalV2
        open={true}
        onClose={mockOnClose}
        language="en"
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Families")).toBeInTheDocument();
    expect(screen.getByText("Peoples")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Countries" })).toBeInTheDocument();
  });

  it("should show instruction text when search query is empty", () => {
    render(
      <SearchModalV2
        open={true}
        onClose={mockOnClose}
        language="fr"
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(
      screen.getByText("Commencez à taper pour rechercher...")
    ).toBeInTheDocument();
  });

  it("should show instruction text in English", () => {
    render(
      <SearchModalV2
        open={true}
        onClose={mockOnClose}
        language="en"
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("Start typing to search...")).toBeInTheDocument();
  });

  it("should update search input value when typing", async () => {
    render(
      <SearchModalV2
        open={true}
        onClose={mockOnClose}
        language="fr"
        onResultSelect={mockOnResultSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Rechercher une famille/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "test" } });
    });

    expect(searchInput).toHaveValue("test");
  });

  it("should have working tab structure", () => {
    render(
      <SearchModalV2
        open={true}
        onClose={mockOnClose}
        language="fr"
        onResultSelect={mockOnResultSelect}
      />
    );

    // Verify the tab list structure exists
    const tabList = screen.getByRole("tablist");
    expect(tabList).toBeInTheDocument();

    // Verify all tabs are rendered
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4); // Tout, Familles, Peuples, Pays
  });

  it("should not render when closed", () => {
    render(
      <SearchModalV2
        open={false}
        onClose={mockOnClose}
        language="fr"
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.queryByText("Recherche")).not.toBeInTheDocument();
  });
});
