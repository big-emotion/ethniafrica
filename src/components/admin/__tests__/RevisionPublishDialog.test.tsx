import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RevisionPublishDialog } from "@/components/admin/RevisionPublishDialog";
import { getPeopleRoute } from "@/lib/routing";

const validReason =
  "Publication après vérification des sources et validation éditoriale.";
const liveUrl = getPeopleRoute("fr", "bete");

async function openDialog() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Publier" }));
  return user;
}

describe("RevisionPublishDialog", () => {
  // @req REQ-016
  it("opens an accessible confirmation dialog and focuses the confirmation field", async () => {
    render(<RevisionPublishDialog draftId="draft-70" onPublish={vi.fn()} />);

    await openDialog();

    expect(
      screen.getByRole("dialog", { name: "Publier cette révision ?" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmation")).toHaveFocus();
    expect(
      screen.getByLabelText("Raison de la publication")
    ).toBeInTheDocument();
  });

  // @req REQ-016
  it("requires the exact case-sensitive confirmation and a trimmed 50–500 character reason", async () => {
    render(<RevisionPublishDialog draftId="draft-70" onPublish={vi.fn()} />);
    const user = await openDialog();
    const confirmation = screen.getByLabelText("Confirmation");
    const reason = screen.getByLabelText("Raison de la publication");
    const submit = screen.getByRole("button", {
      name: "Confirmer la publication",
    });

    expect(submit).toBeDisabled();
    await user.type(confirmation, "publier");
    await user.type(reason, "a".repeat(50));
    expect(submit).toBeDisabled();

    await user.clear(confirmation);
    await user.type(confirmation, "PUBLIER");
    expect(submit).toBeEnabled();
    expect(screen.getByText("50 / 500 caractères")).toBeInTheDocument();

    fireEvent.change(reason, { target: { value: ` ${"a".repeat(49)} ` } });
    expect(submit).toBeDisabled();
    expect(screen.getByText("49 / 500 caractères")).toBeInTheDocument();

    fireEvent.change(reason, { target: { value: "a".repeat(501) } });
    expect(submit).toBeDisabled();
    expect(screen.getByText("501 / 500 caractères")).toBeInTheDocument();
  });

  // @req REQ-016
  it("submits the trimmed reason once and blocks duplicate publication while pending", async () => {
    let resolvePublish:
      | ((result: {
          success: true;
          revisionId: string;
          version: number;
          liveUrl: string;
          pinnedUrl: string;
        }) => void)
      | undefined;
    const onPublish = vi.fn(
      () =>
        new Promise<{
          success: true;
          revisionId: string;
          version: number;
          liveUrl: string;
          pinnedUrl: string;
        }>((resolve) => {
          resolvePublish = resolve;
        })
    );
    render(<RevisionPublishDialog draftId="draft-70" onPublish={onPublish} />);
    const user = await openDialog();

    await user.type(screen.getByLabelText("Confirmation"), "PUBLIER");
    fireEvent.change(screen.getByLabelText("Raison de la publication"), {
      target: { value: `  ${validReason}  ` },
    });
    const submit = screen.getByRole("button", {
      name: "Confirmer la publication",
    });
    await user.click(submit);
    fireEvent.click(submit);

    expect(onPublish).toHaveBeenCalledTimes(1);
    expect(onPublish).toHaveBeenCalledWith("draft-70", validReason);
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent("Publication…");

    resolvePublish?.({
      success: true,
      revisionId: "revision-4",
      version: 4,
      liveUrl,
      pinnedUrl: "/api/v2/peoples/PPL_BETE/versions/4",
    });
    await screen.findByText("Révision v4 publiée — fiche mise à jour");
  });

  // @req REQ-016
  it("shows the published version with live and pinned links", async () => {
    const onPublish = vi.fn().mockResolvedValue({
      success: true,
      revisionId: "revision-4",
      version: 4,
      liveUrl,
      pinnedUrl: "/api/v2/peoples/PPL_BETE/versions/4",
    });
    render(<RevisionPublishDialog draftId="draft-70" onPublish={onPublish} />);
    const user = await openDialog();

    await user.type(screen.getByLabelText("Confirmation"), "PUBLIER");
    await user.type(
      screen.getByLabelText("Raison de la publication"),
      validReason
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmer la publication" })
    );

    expect(
      await screen.findByText("Révision v4 publiée — fiche mise à jour")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir la fiche mise à jour" })
    ).toHaveAttribute("href", liveUrl);
    expect(
      screen.getByRole("link", { name: "Voir la version v4" })
    ).toHaveAttribute("href", "/api/v2/peoples/PPL_BETE/versions/4");
  });

  // @req REQ-016
  it("keeps a committed publication successful when public links are unavailable", async () => {
    const onPublish = vi.fn().mockResolvedValue({
      success: true,
      revisionId: "revision-4",
      version: 4,
      liveUrl: null,
    });
    render(<RevisionPublishDialog draftId="draft-70" onPublish={onPublish} />);
    const user = await openDialog();

    await user.type(screen.getByLabelText("Confirmation"), "PUBLIER");
    await user.type(
      screen.getByLabelText("Raison de la publication"),
      validReason
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmer la publication" })
    );

    expect(
      await screen.findByText("Révision v4 publiée — fiche mise à jour")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("publication échouée — brouillon conservé")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // @req REQ-016
  it("preserves both fields after failure and allows a retry", async () => {
    const onPublish = vi
      .fn()
      .mockResolvedValueOnce({ success: false, message: "Conflit de version" })
      .mockResolvedValueOnce({
        success: true,
        revisionId: "revision-4",
        version: 4,
        liveUrl,
        pinnedUrl: "/api/v2/peoples/PPL_BETE/versions/4",
      });
    render(<RevisionPublishDialog draftId="draft-70" onPublish={onPublish} />);
    const user = await openDialog();
    const confirmation = screen.getByLabelText("Confirmation");
    const reason = screen.getByLabelText("Raison de la publication");

    await user.type(confirmation, "PUBLIER");
    await user.type(reason, validReason);
    await user.click(
      screen.getByRole("button", { name: "Confirmer la publication" })
    );

    expect(
      await screen.findByText("publication échouée — brouillon conservé")
    ).toBeInTheDocument();
    expect(confirmation).toHaveValue("PUBLIER");
    expect(reason).toHaveValue(validReason);

    const retry = screen.getByRole("button", {
      name: "Confirmer la publication",
    });
    await waitFor(() => expect(retry).toBeEnabled());
    await user.click(retry);

    expect(onPublish).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByText("Révision v4 publiée — fiche mise à jour")
    ).toBeInTheDocument();
  });
});
