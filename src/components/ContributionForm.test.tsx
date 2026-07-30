import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContributionForm } from "./ContributionForm";
import { ContributionFormFields } from "./ContributionFormFields";

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
    const { container } = render(<ContributionForm language="fr" />);

    expect(
      screen.getByRole("heading", { name: "Soumettre une contribution" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Submit a Contribution")).not.toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain("p-4");
    expect(container.firstElementChild?.className).toContain("sm:p-6");
  });

  // @req REQ-092
  it("shows that an unknown citation requires review before submitting JSON", () => {
    const { container } = render(<ContributionForm language="fr" />);

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

    expect(
      screen.getByText("Cette source devra être examinée avant publication.")
    ).toBeInTheDocument();
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
