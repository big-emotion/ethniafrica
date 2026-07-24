import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useListView } from "../use-list-view";

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

const mockItems = [
  { id: "A1", name: "Alpha" },
  { id: "B1", name: "Beta" },
  { id: "B2", name: "Bravo" },
  { id: "G1", name: "Gamma" },
];

const opts = {
  queryKey: ["test-items"],
  queryFn: vi.fn().mockResolvedValue(mockItems),
  getDisplayName: (item: (typeof mockItems)[0]) => item.name,
};

describe("useListView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    opts.queryFn = vi.fn().mockResolvedValue(mockItems);
  });

  it("returns loading state while data is fetching", () => {
    opts.queryFn = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useListView(opts), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
  });

  it("returns all items once loaded", async () => {
    const { result } = renderHook(() => useListView(opts), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(4);
  });

  it("filters items by search text", async () => {
    const { result } = renderHook(() => useListView(opts), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.setSearch("be");
    await waitFor(() => expect(result.current.filteredItems).toHaveLength(1));
    expect(result.current.filteredItems[0].name).toBe("Beta");
  });

  it("filters items by letter", async () => {
    const { result } = renderHook(() => useListView(opts), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.setSelectedLetter("B");
    await waitFor(() => expect(result.current.filteredItems).toHaveLength(2));
  });

  it("computes available letters from items", async () => {
    const { result } = renderHook(() => useListView(opts), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.availableLetters).toEqual(["A", "B", "G"]);
  });

  it("paginates items using itemsPerPage", async () => {
    const { result } = renderHook(
      () => useListView({ ...opts, itemsPerPage: 2 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.paginatedItems).toHaveLength(2);
    expect(result.current.totalPages).toBe(2);
  });

  it("resets to page 1 when search changes", async () => {
    const { result } = renderHook(
      () => useListView({ ...opts, itemsPerPage: 2 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.setCurrentPage(2);
    await waitFor(() => expect(result.current.currentPage).toBe(2));

    result.current.setSearch("beta");
    await waitFor(() => expect(result.current.currentPage).toBe(1));
  });

  it("uses custom filterFn when provided", async () => {
    const customFilterFn = vi.fn(
      (item: (typeof mockItems)[0], search: string) =>
        item.id.toLowerCase().includes(search)
    );
    const { result } = renderHook(
      () => useListView({ ...opts, filterFn: customFilterFn }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.setSearch("b1");
    await waitFor(() => expect(result.current.filteredItems).toHaveLength(1));
    expect(result.current.filteredItems[0].id).toBe("B1");
  });

  it("returns error state on query failure", async () => {
    opts.queryFn = vi.fn().mockRejectedValue(new Error("fetch failed"));
    const { result } = renderHook(() => useListView(opts), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("fetch failed");
  });
});
