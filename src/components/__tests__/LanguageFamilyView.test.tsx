import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageFamilyView } from "../views/LanguageFamilyView";
import * as afrikLoader from "@/lib/afrikLoader";
import type { LanguageFamilySummary } from "@/types/afrik-frontend";

// Mock afrikLoader
vi.mock("@/lib/afrikLoader", () => ({
  getAllLanguageFamilies: vi.fn(),
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

const mockFamilies: LanguageFamilySummary[] = [
  {
    id: "FLG_BANTU",
    nameFr: "Bantou",
    nameEn: "Bantu",
    peopleCount: 200,
    totalSpeakers: 350000000,
    geographicArea: "Sub-Saharan Africa",
  },
  {
    id: "FLG_MANDE",
    nameFr: "Mandé",
    nameEn: "Mande",
    peopleCount: 50,
    totalSpeakers: 50000000,
    geographicArea: "West Africa",
  },
];

describe("LanguageFamilyView", () => {
  const mockOnFamilySelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display loading state initially", () => {
    vi.mocked(afrikLoader.getAllLanguageFamilies).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <LanguageFamilyView language="fr" onFamilySelect={mockOnFamilySelect} />
    );

    expect(
      screen.getByText("Chargement des familles linguistiques...")
    ).toBeInTheDocument();
  });

  it("should call getAllLanguageFamilies on mount", () => {
    vi.mocked(afrikLoader.getAllLanguageFamilies).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <LanguageFamilyView language="fr" onFamilySelect={mockOnFamilySelect} />
    );

    expect(afrikLoader.getAllLanguageFamilies).toHaveBeenCalledTimes(1);
  });
});
