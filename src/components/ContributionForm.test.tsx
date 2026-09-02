import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Proof } from "@/lib/antibot/proofOfWork";
import { ContributionForm } from "./ContributionForm";
import { ContributionFormFields } from "./ContributionFormFields";

const SOLVED_PROOF: Proof = {
  salt: "test-salt",
  nonce: "42",
  difficultyBits: 8,
  expiresAt: 4102444800000,
  signature: "test-signature",
};

function renderContributionForm(
  overrides: Partial<React.ComponentProps<typeof ContributionForm>> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ContributionForm language="fr" {...overrides} />
    </QueryClientProvider>
  );
}

/** Renders the form with the anti-bot gate already satisfied. */
function renderVerifiedForm() {
  let solve: (proof: Proof) => void = () => {};

  const result = renderContributionForm({
    renderVerification: ({ onSolved }) => {
      solve = onSolved;
      return <div data-testid="antibot-gate">Vérification en cours…</div>;
    },
  });

  // The gate is injected, so the suite plays its part: the browser has
  // finished paying, here is the proof.
  return { ...result, solve: () => act(() => solve(SOLVED_PROOF)) };
}

function selectType(container: HTMLElement, value: string) {
  fireEvent.change(container.querySelector("select")!, { target: { value } });
}

function fillJsonPayload(payload: unknown) {
  fireEvent.click(screen.getByRole("radio", { name: "JSON" }));
  fireEvent.change(screen.getByLabelText("Données (JSON)"), {
    target: { value: JSON.stringify(payload) },
  });
}

function submittedBody(fetchMock: ReturnType<typeof vi.fn>) {
  const call = fetchMock.mock.calls.find(
    ([url]) => url === "/api/v2/flags"
  ) as [string, RequestInit];
  return JSON.parse(call[1].body as string);
}

describe("ContributionForm", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ peoples: [], families: [], data: { id: "flag-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // @req REQ-092
  it("uses French-only copy and mobile-first spacing", () => {
    const { container } = renderContributionForm();

    expect(
      screen.getByRole("heading", { name: "Soumettre une contribution" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Submit a Contribution")).not.toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain("p-4");
    expect(container.firstElementChild?.className).toContain("sm:p-6");
  });

  // An off-catalogue citation used to disable the submit button outright.
  // It is now accepted and labelled, and the notice explains the consequence.
  // @req REQ-092
  it("accepts an off-catalogue citation and warns it lowers confidence", () => {
    const { container } = renderContributionForm();

    selectType(container, "new_people");
    fillJsonPayload({
      sources: [{ url: "https://archives.example.org/yoruba" }],
    });

    const notice = screen.getByTestId("source-tier-notice");
    expect(notice).toHaveTextContent("Non vérifiée");
    expect(notice).toHaveTextContent("indice de confiance");
    // Advisory, not an error: the reserved error token stays out of it.
    expect(notice.className).not.toContain("afh-error");
  });

  /**
   * The contribution and the report are the same object now. What used to be
   * `POST /api/contributions`, a table of its own and a second moderation
   * console is one flag on one queue.
   */
  // @req REQ-092
  it("submits the contribution to the flags queue, not to a table of its own", async () => {
    const { container, solve } = renderVerifiedForm();

    selectType(container, "new_people");
    fillJsonPayload({ name_main: "Bassari" });
    solve();
    fireEvent.click(
      screen.getByRole("button", { name: "Soumettre la contribution" })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v2/flags",
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = submittedBody(fetchMock);
    expect(body.flag_kind).toBe("contribution");
    expect(body.contribution_payload).toMatchObject({
      contribution_type: "new_people",
      proposed: { name_main: "Bassari" },
    });
    expect(body.antibot).toEqual(SOLVED_PROOF);
  });

  /**
   * A proposal for something the corpus does not hold yet has nothing to
   * anchor to; a correction to an existing fiche does, and saying so is what
   * lets a moderator filter the queue by entity.
   */
  // @req REQ-092
  it("anchors a correction on the entity it modifies", async () => {
    const { container, solve } = renderVerifiedForm();

    selectType(container, "update_people");
    fillJsonPayload({ id: "PPL_YORUBA", name_main: "Yorùbá" });
    solve();
    fireEvent.click(
      screen.getByRole("button", { name: "Soumettre la contribution" })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v2/flags",
        expect.anything()
      );
    });

    const body = submittedBody(fetchMock);
    expect(body.target_type).toBe("people");
    expect(body.target_id).toBe("PPL_YORUBA");
  });

  // @req REQ-092
  it("holds the submission back until the browser has paid the anti-bot cost", async () => {
    const { container } = renderVerifiedForm();

    selectType(container, "new_people");
    fillJsonPayload({ name_main: "Bassari" });
    fireEvent.click(
      screen.getByRole("button", { name: "Soumettre la contribution" })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/vérification anti-robot n'est pas terminée/i)
      ).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/v2/flags")).toBe(
      false
    );
  });

  // @req REQ-092
  it("keeps the structured fields French-only", async () => {
    render(
      <ContributionFormFields
        type="new_language_family"
        language="fr"
        onDataChange={() => {}}
      />
    );

    expect(await screen.findByLabelText(/nom \(FR\)/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nom \(EN\)/i)).not.toBeInTheDocument();
  });
});
