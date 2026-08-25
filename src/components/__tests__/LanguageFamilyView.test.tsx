import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageFamilyView } from "../views/LanguageFamilyView";
import * as afrikLoader from "@/lib/afrikLoader";

vi.mock("@/lib/afrikLoader", () => ({
  getAllLanguageFamilies: vi.fn(),
  getUnclassifiedPeoplesCount: vi.fn(() => Promise.resolve(0)),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

// SessionStorage mock for ConfidenceChip
Object.defineProperty(window, "sessionStorage", {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  }
  return Wrapper;
}

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
      <LanguageFamilyView language="fr" onFamilySelect={mockOnFamilySelect} />,
      { wrapper: createWrapper() }
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
      <LanguageFamilyView language="fr" onFamilySelect={mockOnFamilySelect} />,
      { wrapper: createWrapper() }
    );

    expect(afrikLoader.getAllLanguageFamilies).toHaveBeenCalledTimes(1);
  });

  // @req REQ-108
  it("should render the row-computed peopleCount, including a real zero", async () => {
    vi.mocked(afrikLoader.getAllLanguageFamilies).mockResolvedValue([
      { id: "FLG_BANTU", nameFr: "Bantou", peopleCount: 28 },
      { id: "FLG_EMPTY", nameFr: "Empty", peopleCount: 0 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    render(
      <LanguageFamilyView language="fr" onFamilySelect={mockOnFamilySelect} />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("28 peuples")).toBeInTheDocument();
    expect(await screen.findByText("0 peuples")).toBeInTheDocument();
  });

  // @req REQ-108
  it("should surface the unclassified peoples count instead of omitting it", async () => {
    vi.mocked(afrikLoader.getAllLanguageFamilies).mockResolvedValue([]);
    vi.mocked(afrikLoader.getUnclassifiedPeoplesCount).mockResolvedValue(64);

    render(
      <LanguageFamilyView language="fr" onFamilySelect={mockOnFamilySelect} />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText(/64/)).toBeInTheDocument();
  });
});
