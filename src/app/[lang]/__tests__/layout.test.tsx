import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import LangLayout from "../layout";

function renderLayout(lang: string) {
  return LangLayout({
    params: Promise.resolve({ lang }),
    children: <p>corpus</p>,
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

  // @req REQ-052
  it("404s on a locale the middleware would have redirected", async () => {
    await expect(renderLayout("en")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
