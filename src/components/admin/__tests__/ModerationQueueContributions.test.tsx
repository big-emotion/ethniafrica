import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ModerationQueue } from "@/components/admin/ModerationQueue";

/**
 * One queue, two things in it.
 *
 * Reports and contributions used to live on separate surfaces with separate
 * tables. They are one table now, which makes telling them apart at a glance
 * the queue's job — and makes the difference in what a moderator may *do* to
 * each of them a property worth pinning. A report is decided on; a
 * contribution is read. Nothing on this screen edits the corpus either way.
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

const report = {
  id: "flag-1",
  public_slug: "ABC123DEFG",
  status: "open" as const,
  flag_kind: "inaccurate",
  reason_text: "Le nom du peuple est mal orthographié.",
  target_type: "people",
  target_id: "PPL_BETE",
  created_at: "2026-08-30T09:00:00.000Z",
  contribution_payload: null,
};

const contribution = {
  id: "flag-2",
  public_slug: "HJK456MNPQ",
  status: "open" as const,
  flag_kind: "contribution",
  reason_text: "Proposition d'un nouveau peuple — les Bassari du Sénégal.",
  target_type: null,
  target_id: null,
  created_at: "2026-09-01T09:00:00.000Z",
  contribution_payload: {
    contribution_type: "new_people",
    proposed: { name_main: "Bassari" },
    contributor_name: "Ama",
  },
};

function rowFor(slug: string): HTMLElement {
  return screen.getByText(slug).closest("li") as HTMLElement;
}

describe("ModerationQueue — reports and contributions side by side", () => {
  // @req REQ-091
  it("labels each row with what it is", () => {
    render(<ModerationQueue reports={[report, contribution]} />);

    expect(
      within(rowFor("ABC123DEFG")).getByText("Signalement")
    ).toBeInTheDocument();
    expect(
      within(rowFor("HJK456MNPQ")).getByText("Contribution")
    ).toBeInTheDocument();
  });

  /**
   * The atlas is edited from `dataset/source/afrik/*.json`. The console that
   * approved a contribution and wrote it straight into the tables is gone, and
   * with it the buttons that started that write.
   */
  // @req REQ-091
  it("offers no action on a contribution — it can only be read", () => {
    render(<ModerationQueue reports={[contribution]} />);

    const row = rowFor("HJK456MNPQ");
    expect(within(row).queryByRole("button")).toBeNull();
    expect(within(row).queryByLabelText("Note de modération")).toBeNull();
  });

  // @req REQ-091
  it("keeps the report's own moves untouched", () => {
    render(<ModerationQueue reports={[report]} />);

    expect(
      within(rowFor("ABC123DEFG")).getByRole("button", { name: "Examiner" })
    ).toBeInTheDocument();
  });

  /**
   * A moderator who cannot see what was proposed is reading a title. The
   * proposal is the point of the row.
   */
  // @req REQ-091
  it("shows the proposal a contribution carries", () => {
    render(<ModerationQueue reports={[contribution]} />);

    const proposal = within(rowFor("HJK456MNPQ")).getByText(/new_people/);
    expect(proposal).toHaveTextContent("Bassari");
    expect(proposal).toHaveTextContent("Ama");
  });
});
