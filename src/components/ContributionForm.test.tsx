import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContributionForm } from "./ContributionForm";
import { ContributionFormFields } from "./ContributionFormFields";

function renderContributionForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ContributionForm language="fr" />
    </QueryClientProvider>
  );
}

describe("ContributionForm", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ peoples: [], families: [] }),
      })
    );
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

    fireEvent.change(container.querySelector("select")!, {
      target: { value: "new_people" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "JSON" }));
    fireEvent.change(screen.getByLabelText("Données (JSON)"), {
      target: {
        value: JSON.stringify({
          sources: [{ url: "https://archives.example.org/yoruba" }],
        }),
      },
    });

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Non vérifiée");
    expect(notice).toHaveTextContent("indice de confiance");
    // Advisory, not an error: the reserved error token stays out of it.
    expect(notice.className).not.toContain("afh-error");
    expect(
      screen.getByRole("button", { name: "Soumettre la contribution" })
    ).toBeEnabled();
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
