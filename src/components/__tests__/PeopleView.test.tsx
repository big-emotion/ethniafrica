import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PeopleView } from "../views/PeopleView";
import * as afrikLoader from "@/lib/afrikLoader";

vi.mock("@/lib/afrikLoader", () => ({
  getAllPeoples: vi.fn(),
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

describe("PeopleView", () => {
  const mockOnPeopleSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display loading state initially", () => {
    vi.mocked(afrikLoader.getAllPeoples).mockImplementation(
      () => new Promise(() => {})
    );

    render(<PeopleView language="fr" onPeopleSelect={mockOnPeopleSelect} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Chargement des peuples...")).toBeInTheDocument();
  });

  it("should call getAllPeoples on mount", () => {
    vi.mocked(afrikLoader.getAllPeoples).mockImplementation(
      () => new Promise(() => {})
    );

    render(<PeopleView language="fr" onPeopleSelect={mockOnPeopleSelect} />, {
      wrapper: createWrapper(),
    });

    expect(afrikLoader.getAllPeoples).toHaveBeenCalledTimes(1);
  });

  it("should accept languageFamilyId prop for filtering", () => {
    vi.mocked(afrikLoader.getAllPeoples).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <PeopleView
        language="fr"
        onPeopleSelect={mockOnPeopleSelect}
        languageFamilyId="FLG_BANTU"
      />,
      { wrapper: createWrapper() }
    );

    expect(afrikLoader.getAllPeoples).toHaveBeenCalledTimes(1);
  });
});
