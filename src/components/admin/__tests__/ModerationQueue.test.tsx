import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModerationQueue } from "@/components/admin/ModerationQueue";

/**
 * The screen the epic never had a story for.
 *
 * Epic 5 numbers its stories 5.1, 5.2, 5.3, then jumps to 5.6 — and 5.3's own
 * acceptance criteria link to `/fr/admin/signalements/{slug}`, a page no
 * ticket creates. This is that missing surface, kept to what the loop needs:
 * see the open reports, move one along, say why.
 */

vi.mock("@/lib/supabase/auth-client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mod-token" } },
      }),
    },
  }),
}));

const openReport = {
  id: "flag-1",
  public_slug: "ABC123DEFG",
  status: "open" as const,
  flag_kind: "other" as const,
  reason_text: "Le nom du peuple est mal orthographié.",
  target_type: "people",
  target_id: "PPL_BETE",
  created_at: "2026-08-30T09:00:00.000Z",
};

const reviewedReport = {
  ...openReport,
  id: "flag-2",
  status: "under_review" as const,
};

function stubFetch(ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => ({
      data: { ...openReport, status: "under_review" },
      errors: ok ? [] : [{ code: "ILLEGAL_TRANSITION", message: "refusé" }],
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ModerationQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-042
  it("shows each report by what it says, not by its identifier", () => {
    render(<ModerationQueue reports={[openReport]} />);

    expect(
      screen.getByText("Le nom du peuple est mal orthographié.")
    ).toBeInTheDocument();
    // The slug is the public handle a reporter was given; the UUID is not.
    expect(screen.getByText(/ABC123DEFG/)).toBeInTheDocument();
    expect(screen.queryByText("flag-1")).toBeNull();
  });

  /**
   * The trigger allows open → under_review and under_review → accepted |
   * rejected | duplicate, and nothing else. Offering a move the database will
   * refuse teaches a moderator to expect errors.
   */
  // @req REQ-042
  it("offers only the moves the state machine allows from each state", () => {
    render(<ModerationQueue reports={[openReport, reviewedReport]} />);

    const rows = screen.getAllByRole("listitem");
    expect(
      within(rows[0]).getByRole("button", { name: /examiner/i })
    ).toBeInTheDocument();
    expect(
      within(rows[0]).queryByRole("button", { name: /accepter/i })
    ).toBeNull();
    expect(
      within(rows[1]).getByRole("button", { name: /accepter/i })
    ).toBeInTheDocument();
    expect(
      within(rows[1]).getByRole("button", { name: /rejeter/i })
    ).toBeInTheDocument();
  });

  // @req REQ-042
  it("sends the transition to the API with the moderator's token", async () => {
    const fetchMock = stubFetch();
    render(<ModerationQueue reports={[openReport]} />);

    fireEvent.click(screen.getByRole("button", { name: /examiner/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v2/flags/flag-1");
    expect(init.method).toBe("PATCH");
    expect(init.headers.Authorization).toBe("Bearer mod-token");
    expect(JSON.parse(init.body)).toMatchObject({ status: "under_review" });
  });

  /**
   * Charter §5: accepting or rejecting in silence tells the reporter their
   * report was read and nothing more. The note is what makes the public
   * register a conversation rather than a bin.
   */
  // @req REQ-042
  it("refuses to close a report without saying why", async () => {
    const fetchMock = stubFetch();
    render(<ModerationQueue reports={[reviewedReport]} />);

    fireEvent.click(screen.getByRole("button", { name: /accepter/i }));

    expect(
      await screen.findByText(/expliquez votre décision/i)
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it("closes a report once the decision carries its reason", async () => {
    const fetchMock = stubFetch();
    render(<ModerationQueue reports={[reviewedReport]} />);

    fireEvent.change(screen.getByLabelText(/note de modération/i), {
      target: { value: "Source vérifiée, correction appliquée." },
    });
    fireEvent.click(screen.getByRole("button", { name: /accepter/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      status: "accepted",
      moderator_notes: "Source vérifiée, correction appliquée.",
    });
  });

  // @req REQ-042
  it("says so when the API refuses the move", async () => {
    stubFetch(false);
    render(<ModerationQueue reports={[openReport]} />);

    fireEvent.click(screen.getByRole("button", { name: /examiner/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/refusé/i);
  });
});
