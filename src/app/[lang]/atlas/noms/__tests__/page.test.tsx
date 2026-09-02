import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockListPatronymes } = vi.hoisted(() => ({
  mockListPatronymes: vi.fn(),
}));

vi.mock("@/api/v2/services/patronymes", () => ({
  listPatronymes: (...args: unknown[]) => mockListPatronymes(...args),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import PatronymesIndexPage, { metadata } from "../page";
import { getLocalizedRoute, getPatronymeRoute } from "@/lib/routing";

const THIRTY_PATRONYMES = Array.from({ length: 30 }, (_, i) => ({
  id: `PAT_${String(i).padStart(3, "0")}`,
  nameMain: `Patronyme ${i}`,
  nameSystem: "clan_name" as const,
}));

describe("the patronymes index page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-139 @req REQ-133
  it("lists every patronyme and links each to its fiche", async () => {
    mockListPatronymes.mockResolvedValueOnce({
      data: THIRTY_PATRONYMES,
      total: 30,
    });

    const ui = await PatronymesIndexPage({
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(mockListPatronymes).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
    THIRTY_PATRONYMES.forEach((patronyme) => {
      // A regex name matcher, not `{ exact: false }`: the fiche's naming
      // system label sits right after the patronyme name in the link's
      // accessible name, and the RTL/happy-dom pairing here does not honor
      // `exact: false` as a substring match.
      const link = screen.getByRole("link", {
        name: new RegExp(`^${patronyme.nameMain}\\s`),
      });
      expect(link).toHaveAttribute(
        "href",
        getPatronymeRoute("fr", patronyme.id)
      );
    });
  });

  // @req REQ-139
  it("asks the service for the page the URL names", async () => {
    mockListPatronymes.mockResolvedValueOnce({ data: [], total: 0 });

    const ui = await PatronymesIndexPage({
      searchParams: Promise.resolve({ page: "2" }),
    });
    render(ui);

    expect(mockListPatronymes).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  // A read failure is not an empty corpus (30 patronymes are always
  // published) — the page must say "unavailable", never "0 results".
  // @req REQ-139 @req REQ-133
  it("renders an explicit unavailability state on a read failure, not an empty corpus", async () => {
    mockListPatronymes.mockRejectedValueOnce(new Error("database unavailable"));

    const ui = await PatronymesIndexPage({
      searchParams: Promise.resolve({}),
    });
    render(ui);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).not.toMatch(/aucun/i);
    expect(alert.textContent?.toLowerCase()).toContain("pas pu être charg");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // @req REQ-091
  it("declares the canonical URL for the noms index", () => {
    expect(metadata.alternates?.canonical).toBe(
      getLocalizedRoute("fr", "patronymes")
    );
  });
});
