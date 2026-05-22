import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageFamilyView } from "../views/LanguageFamilyView";
import * as afrikLoader from "@/lib/afrikLoader";

vi.mock("@/lib/afrikLoader", () => ({
  getAllLanguageFamilies: vi.fn(),
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
});
