import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const push = vi.fn();

// Mutable so one suite can render the picker under either locale.
const route = vi.hoisted(() => ({ lang: "fr" }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ lang: route.lang }),
  useRouter: () => ({ push }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    sectionName,
  }: {
    children: React.ReactNode;
    sectionName?: string;
  }) => (
    <div data-testid="page-layout" data-section={sectionName}>
      {children}
    </div>
  ),
}));

import ComparerPickerPage from "../page";
import { COMPARE_ENTITY_SEGMENTS, getLocalizedRoute } from "@/lib/routing";

const PEOPLES_ENVELOPE = {
  data: {
    peoples: [
      { id: "PPL_YORUBA", nameMain: "Yoruba" },
      { id: "PPL_ZULU", nameMain: "Zulu" },
    ],
  },
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ComparerPickerPage />
    </QueryClientProvider>
  );
}

/** Types into the combobox and clicks the suggestion whose label matches. */
async function pickEntity(label: RegExp) {
  const combobox = screen.getByRole("combobox");
  fireEvent.change(combobox, { target: { value: label.source.slice(0, 2) } });
  fireEvent.click(await screen.findByRole("option", { name: label }));
}

describe("/[lang]/comparer picker page", () => {
  beforeEach(() => {
    push.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => PEOPLES_ENVELOPE,
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // @req REQ-091
  it("renders inside the PageLayout with the Comparer section name", () => {
    renderPage();
    expect(screen.getByTestId("page-layout").getAttribute("data-section")).toBe(
      "Comparer"
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Comparer"
    );
  });

  // @req REQ-097
  it("replaces the static shell copy with the interactive picker", () => {
    renderPage();
    expect(
      screen.getByRole("radiogroup", { name: /type d.?entité/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.queryByText(/Sélectionnez 2 à 3 fiches du même type/i)
    ).not.toBeInTheDocument();
  });

  // @req REQ-097
  it("offers the compare action bar, disabled until the minimum is reached", () => {
    renderPage();
    const bar = screen.getByRole("region", {
      name: /sélection de comparaison/i,
    });
    expect(bar).toBeInTheDocument();
    expect(screen.getByText("0/3 sélectionnés")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^comparer$/i })).toBeDisabled();
  });

  // @req REQ-097
  it("sends the reader to the result route once two peoples are chosen", async () => {
    renderPage();

    await pickEntity(/yoruba/i);
    await pickEntity(/zulu/i);

    const compareButton = screen.getByRole("button", { name: /^comparer$/i });
    await waitFor(() => expect(compareButton).toBeEnabled());
    fireEvent.click(compareButton);

    expect(push).toHaveBeenCalledWith(
      "/fr/comparer/peuples/PPL_YORUBA/PPL_ZULU"
    );
  });

  // The result address is composed from the slug tables, so an English
  // reader lands on the English route in one hop rather than through the
  // middleware's slug redirect.
  // @req REQ-140
  it("composes the result route in the locale the picker is served in", async () => {
    route.lang = "en";
    try {
      renderPage();

      await pickEntity(/yoruba/i);
      await pickEntity(/zulu/i);

      const compareButton = screen.getByRole("button", {
        name: /^comparer$/i,
      });
      await waitFor(() => expect(compareButton).toBeEnabled());
      fireEvent.click(compareButton);

      expect(push).toHaveBeenCalledWith(
        `${getLocalizedRoute("en", "compare")}/${COMPARE_ENTITY_SEGMENTS.en.peoples}/PPL_YORUBA/PPL_ZULU`
      );
    } finally {
      route.lang = "fr";
    }
  });
});
