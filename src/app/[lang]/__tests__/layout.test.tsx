import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// The layout resolves module availability through `unstable_cache`, which
// reads an incremental cache off the request store — absent when a server
// component is called directly like this. Mocking it also keeps the subject
// of these cases the locale guard rather than the corpus behind it.
const availability = { noms: false, doctrine: true };
vi.mock("@/lib/hubs/moduleAvailability", () => ({
  getModuleAvailabilityMap: vi.fn(async () => availability),
}));

import LangLayout from "../layout";
import { useModuleAvailability } from "@/components/hubs/ModuleAvailabilityProvider";

function renderLayout(lang: string, children: React.ReactNode = <p>corpus</p>) {
  return LangLayout({
    params: Promise.resolve({ lang }),
    children,
  });
}

describe("[lang] layout", () => {
  // @req REQ-052
  it("renders the page under the canonical fr segment", async () => {
    const { container } = render(await renderLayout("fr"));
    expect(container.textContent).toContain("corpus");
  });

  // The segment is a dynamic catch-all for anything one level deep, so
  // without this guard /quiz, /nawak and /pays all resolve to [lang] and
  // render the home with a 200.
  // @req REQ-052
  it("404s on a segment that is not a locale", async () => {
    await expect(renderLayout("quiz")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // English is a published locale (REQ-140): the segment renders, and the
  // French folder it was rewritten onto is no concern of this guard.
  // @req REQ-140
  it("renders the page under the English segment", async () => {
    const { container } = render(await renderLayout("en"));
    expect(container.textContent).toContain("corpus");
  });

  // A two-letter segment that is not a published locale never reaches this
  // layout — the middleware sends it to the default — but the guard must not
  // rely on that: rendered directly, it is not a locale and 404s.
  // @req REQ-140
  it("404s on a two-letter segment that is not a published locale", async () => {
    await expect(renderLayout("es")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  /**
   * The header is a client component under a client `PageLayout`, so this
   * layout is the only server component on the path to it. Resolving the map
   * anywhere else means threading a prop through `PageLayout`'s fifteen-odd
   * callers, and not resolving it at all is what had the menu offering
   * modules the home and the hub were marking Bientôt.
   */
  // @req REQ-106
  it("hands the resolved module availability to the client tree", async () => {
    function Reader() {
      return <span>{JSON.stringify(useModuleAvailability())}</span>;
    }

    render(await renderLayout("fr", <Reader />));

    expect(screen.getByText(JSON.stringify(availability))).toBeInTheDocument();
  });
});
