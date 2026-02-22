import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeopleView } from "../views/PeopleView";
import * as afrikLoader from "@/lib/afrikLoader";
import type { PeopleSummary } from "@/types/afrik-frontend";

// Mock afrikLoader
vi.mock("@/lib/afrikLoader", () => ({
  getAllPeoples: vi.fn(),
}));

// Mock useIsMobile hook
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock ResizeObserver for ScrollArea
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

const mockPeoples: PeopleSummary[] = [
  {
    id: "PPL_SHONA",
    nameMain: "Shona",
    selfAppellation: "vaShona",
    languageFamilyId: "FLG_BANTU",
    languageFamilyName: "Bantou",
    totalPopulation: 15000000,
    countryCount: 2,
    currentCountries: ["ZWE", "MOZ"],
  },
  {
    id: "PPL_ZULU",
    nameMain: "Zulu",
    selfAppellation: "amaZulu",
    languageFamilyId: "FLG_BANTU",
    languageFamilyName: "Bantou",
    totalPopulation: 12000000,
    countryCount: 1,
    currentCountries: ["ZAF"],
  },
];

describe("PeopleView", () => {
  const mockOnPeopleSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display loading state initially", () => {
    vi.mocked(afrikLoader.getAllPeoples).mockImplementation(
      () => new Promise(() => {})
    );

    render(<PeopleView language="fr" onPeopleSelect={mockOnPeopleSelect} />);

    expect(screen.getByText("Chargement des peuples...")).toBeInTheDocument();
  });

  it("should call getAllPeoples on mount", () => {
    vi.mocked(afrikLoader.getAllPeoples).mockImplementation(
      () => new Promise(() => {})
    );

    render(<PeopleView language="fr" onPeopleSelect={mockOnPeopleSelect} />);

    expect(afrikLoader.getAllPeoples).toHaveBeenCalledTimes(1);
  });

  it("should display English loading text when language is English", () => {
    vi.mocked(afrikLoader.getAllPeoples).mockImplementation(
      () => new Promise(() => {})
    );

    render(<PeopleView language="en" onPeopleSelect={mockOnPeopleSelect} />);

    expect(screen.getByText("Loading peoples...")).toBeInTheDocument();
  });

  it("should receive the language prop correctly", () => {
    vi.mocked(afrikLoader.getAllPeoples).mockImplementation(
      () => new Promise(() => {})
    );

    const { rerender } = render(
      <PeopleView language="fr" onPeopleSelect={mockOnPeopleSelect} />
    );

    expect(screen.getByText("Chargement des peuples...")).toBeInTheDocument();

    rerender(<PeopleView language="en" onPeopleSelect={mockOnPeopleSelect} />);

    // The component re-renders with the new language
    expect(afrikLoader.getAllPeoples).toHaveBeenCalled();
  });

  it("should receive languageFamilyId prop correctly", () => {
    vi.mocked(afrikLoader.getAllPeoples).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <PeopleView
        language="fr"
        onPeopleSelect={mockOnPeopleSelect}
        languageFamilyId="FLG_BANTU"
      />
    );

    expect(afrikLoader.getAllPeoples).toHaveBeenCalledTimes(1);
  });
});
