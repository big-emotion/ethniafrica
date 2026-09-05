import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getModeratorSession: vi.fn(),
  listFlagsForModeration: vi.fn(),
}));

vi.mock("@/lib/supabase/moderator", () => ({
  getModeratorSession: mocks.getModeratorSession,
}));

vi.mock("@/api/v2/services/flags", () => ({
  listFlagsForModeration: mocks.listFlagsForModeration,
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/fr/admin",
  useSearchParams: () => new URLSearchParams(),
}));

import ModerationQueuePage from "../page";
import { getStaticPageRoute } from "@/lib/routing";

function report(overrides: Record<string, unknown> = {}) {
  return {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    public_slug: "flag-7kq3m2",
    status: "accepted",
    flag_kind: "other",
    reason_text: "La population indiquée est périmée.",
    target_type: "people",
    target_id: "PPL_YORUBA",
    created_at: "2026-08-30T10:00:00.000Z",
    ...overrides,
  };
}

async function renderQueue(params: Record<string, string> = {}, lang = "fr") {
  const ui = await ModerationQueuePage({
    params: Promise.resolve({ lang }),
    searchParams: Promise.resolve(params),
  });
  return render(ui);
}

describe("ModerationQueuePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getModeratorSession.mockResolvedValue({ user: { id: "mod-1" } });
    mocks.listFlagsForModeration.mockResolvedValue({
      items: [report()],
      total: 1,
    });
  });

  // @req REQ-042
  it("asks the allowlist before reading a single report", async () => {
    await renderQueue();

    expect(mocks.getModeratorSession).toHaveBeenCalled();
  });

  /**
   * The queue served `open` and `under_review` only. A moderator who had just
   * accepted a report could no longer find it.
   */
  // @req REQ-042
  it("serves every status when the moderator filters on none", async () => {
    await renderQueue();

    expect(mocks.listFlagsForModeration).toHaveBeenCalledWith(
      expect.not.objectContaining({ statuses: expect.anything() })
    );
    expect(screen.getByText(/La population indiquée est périmée/)).toBeTruthy();
  });

  // @req REQ-042
  it("carries the status, kind and entity narrowings into the query", async () => {
    await renderQueue({
      statut: "rejected",
      type: "offensive",
      entite: "country",
    });

    expect(mocks.listFlagsForModeration).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses: ["rejected"],
        kind: "offensive",
        entityType: "country",
      })
    );
  });

  // @req REQ-042
  it("ignores a status nobody defined rather than querying for it", async () => {
    await renderQueue({ statut: "inventé" });

    expect(mocks.listFlagsForModeration).toHaveBeenCalledWith(
      expect.not.objectContaining({ statuses: expect.anything() })
    );
  });

  // @req REQ-042
  it("puts the oldest first when asked, so a backlog cannot hide", async () => {
    await renderQueue({ tri: "oldest" });

    expect(mocks.listFlagsForModeration).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "oldest" })
    );
  });

  // @req REQ-042
  it("shows the newest first by default", async () => {
    await renderQueue();

    expect(mocks.listFlagsForModeration).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "recent" })
    );
  });

  // @req REQ-042
  it("reads the page and page size out of the address", async () => {
    await renderQueue({ page: "3", taille: "50" });

    expect(mocks.listFlagsForModeration).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, pageSize: 50 })
    );
  });

  // @req REQ-042
  it("falls back to the default size when the address asks for an unoffered one", async () => {
    await renderQueue({ taille: "7" });

    expect(mocks.listFlagsForModeration).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 25 })
    );
  });

  // @req REQ-042
  it("says the selection is empty rather than showing nothing at all", async () => {
    mocks.listFlagsForModeration.mockResolvedValue({ items: [], total: 0 });

    await renderQueue({ statut: "withdrawn" });

    expect(
      screen.getByText("Aucun signalement ne correspond à cette sélection.")
    ).toBeTruthy();
  });

  /**
   * The user asked for this in as many words: moderating sets a status, it
   * does not edit the fiche. The screen has to say so, because "accepté" reads
   * as "corrigé" to anyone who has not read the charter.
   */
  // @req REQ-042
  it("states that deciding on a report does not change the fiche", async () => {
    await renderQueue();

    expect(screen.getByText(/ne modifie pas la fiche/)).toBeTruthy();
  });

  // The filter form and the pager used to post to a fixed `/fr/admin`, which
  // pulled a moderator working under `/en` back into the French tree.
  // @req REQ-140
  it("keeps the filters and the pager on the queue of the route's locale", async () => {
    mocks.listFlagsForModeration.mockResolvedValue({
      items: [report()],
      total: 60,
    });

    const { container } = await renderQueue({}, "en");

    expect(container.querySelector("form")).toHaveAttribute(
      "action",
      getStaticPageRoute("en", "admin")
    );
    const pageTwo = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href")?.includes("page=2"));
    expect(pageTwo?.getAttribute("href")).toBe(
      `${getStaticPageRoute("en", "admin")}?page=2`
    );
  });
});
