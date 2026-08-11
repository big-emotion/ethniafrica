// @req REQ-001
// @req REQ-003
// @req REQ-004
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PeopleView } from "../views/PeopleView";
import * as afrikLoader from "@/lib/afrikLoader";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PaginatedResponse, PeopleSummary } from "@/types/afrik-frontend";

vi.mock("@/lib/afrikLoader", () => ({
  getPeoples: vi.fn(),
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
  const firstPage: PaginatedResponse<PeopleSummary> = {
    data: [
      {
        id: "PPL_YORUBA",
        nameMain: "Yoruba",
        languageFamilyId: "FLG_NIGER_CONGO",
        currentCountries: ["NGA"],
      },
    ],
    meta: {
      total: 21,
      page: 1,
      perPage: 10,
      totalPages: 3,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
    vi.mocked(afrikLoader.getPeoples).mockResolvedValue(firstPage);
  });

  // @req REQ-004
  it("should keep the search and alphabet filters visible while loading", () => {
    vi.mocked(afrikLoader.getPeoples).mockImplementation(
      () => new Promise(() => {})
    );

    render(<PeopleView language="fr" onPeopleSelect={mockOnPeopleSelect} />, {
      wrapper: createWrapper(),
    });

    // The filter chrome renders immediately instead of being replaced by a
    // full-page spinner — avoids the layout shift a vanishing/reappearing
    // header caused on /fr/peuples.
    expect(screen.getByRole("button", { name: "Tous" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByText("Yoruba")).not.toBeInTheDocument();
  });

  // @req REQ-001
  it("should request and render only the first page on mount", async () => {
    render(<PeopleView language="fr" onPeopleSelect={mockOnPeopleSelect} />, {
      wrapper: createWrapper(),
    });

    expect(await screen.findByText("Yoruba")).toBeInTheDocument();
    expect(afrikLoader.getPeoples).toHaveBeenCalledTimes(1);
    expect(afrikLoader.getPeoples).toHaveBeenCalledWith({
      page: 1,
      perPage: 10,
      search: undefined,
      letter: undefined,
      languageFamilyId: undefined,
    });
  });

  // @req REQ-002
  it("should send search and letter filters to the API", async () => {
    render(<PeopleView language="fr" onPeopleSelect={mockOnPeopleSelect} />, {
      wrapper: createWrapper(),
    });

    await screen.findByText("Yoruba");

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Yoruba" },
    });

    await waitFor(() =>
      expect(afrikLoader.getPeoples).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 10,
        search: "Yoruba",
        letter: undefined,
        languageFamilyId: undefined,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Y" }));

    await waitFor(() =>
      expect(afrikLoader.getPeoples).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 10,
        search: "Yoruba",
        letter: "Y",
        languageFamilyId: undefined,
      })
    );
  });

  // @req REQ-001
  it("should send the language family filter to the API", async () => {
    render(
      <PeopleView
        language="fr"
        onPeopleSelect={mockOnPeopleSelect}
        languageFamilyId="FLG_BANTU"
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() =>
      expect(afrikLoader.getPeoples).toHaveBeenCalledWith({
        page: 1,
        perPage: 10,
        search: undefined,
        letter: undefined,
        languageFamilyId: "FLG_BANTU",
      })
    );
  });

  // @req REQ-043
  it("should allow mobile users to navigate to a later page", async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    vi.mocked(afrikLoader.getPeoples).mockImplementation(async ({ page }) => ({
      ...firstPage,
      data:
        page === 2
          ? [
              {
                id: "PPL_ZULU",
                nameMain: "Zulu",
                languageFamilyId: "FLG_BANTU",
                currentCountries: ["ZAF"],
              },
            ]
          : firstPage.data,
      meta: { ...firstPage.meta, page: page ?? 1 },
    }));

    render(<PeopleView language="fr" onPeopleSelect={mockOnPeopleSelect} />, {
      wrapper: createWrapper(),
    });

    await screen.findByText("Yoruba");
    fireEvent.click(screen.getByRole("button", { name: "Page suivante" }));

    expect(await screen.findByText("Zulu")).toBeInTheDocument();
    expect(afrikLoader.getPeoples).toHaveBeenLastCalledWith({
      page: 2,
      perPage: 10,
      search: undefined,
      letter: undefined,
      languageFamilyId: undefined,
    });
  });
});
