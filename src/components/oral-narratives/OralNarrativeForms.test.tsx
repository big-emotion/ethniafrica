import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  OralNarrativeIntakeForm,
  OralNarrativeModerationForm,
} from "./OralNarrativeForms";

describe("oral narrative contributor intake", () => {
  // @req REQ-095
  it("collects attribution, context, content, variant and visibility without publishing it", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<OralNarrativeIntakeForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Nom affiché"), {
      target: { value: "Aïcha" },
    });
    fireEvent.change(screen.getByLabelText("Communauté"), {
      target: { value: "Communauté peule" },
    });
    fireEvent.change(screen.getByLabelText("Collecté par"), {
      target: { value: "Leïla" },
    });
    fireEvent.change(screen.getByLabelText("Date du récit"), {
      target: { value: "2025-02-10" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Précision du lieu" }),
      {
        target: { value: "region" },
      }
    );
    fireEvent.change(screen.getByLabelText("Code langue (ISO 639-3)"), {
      target: { value: "ful" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Type de récit" }), {
      target: { value: "memory" },
    });
    fireEvent.change(screen.getByLabelText("Transcription"), {
      target: { value: "Récit transmis au sein de la famille." },
    });
    fireEvent.change(screen.getByLabelText("Emplacement du média"), {
      target: { value: "https://media.example.org/recit" },
    });
    fireEvent.change(screen.getByLabelText("Variante de"), {
      target: { value: "ORL_PREMIERE_VERSION" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: "Public après validation" })
    );

    fireEvent.click(screen.getByRole("button", { name: "Soumettre le récit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        attribution: {
          displayMode: "public_name",
          displayName: "Aïcha",
          community: "Communauté peule",
          collector: "Leïla",
        },
        context: {
          narrativeDate: "2025-02-10",
          placePrecision: "region",
          languageCode: "ful",
          narrativeKind: "memory",
        },
        content: {
          transcript: "Récit transmis au sein de la famille.",
          summary: null,
          mediaLocator: "https://media.example.org/recit",
        },
        variantOf: "ORL_PREMIERE_VERSION",
        visibility: "public",
      });
    });
  });

  // @req REQ-095
  it("requires a display name unless attribution is withheld and one content field", () => {
    const onSubmit = vi.fn();

    render(<OralNarrativeIntakeForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Communauté"), {
      target: { value: "Communauté peule" },
    });
    fireEvent.change(screen.getByLabelText("Code langue (ISO 639-3)"), {
      target: { value: "ful" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Soumettre le récit" }));

    expect(
      screen.getByText("Indiquez le nom affiché ou retenez l'anonymat.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ajoutez une transcription ou un résumé.")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // @req REQ-095
  it("allows withheld attribution without exposing an identity", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<OralNarrativeIntakeForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("radio", { name: "Identité retenue" }));
    fireEvent.change(screen.getByLabelText("Communauté"), {
      target: { value: "Communauté peule" },
    });
    fireEvent.change(screen.getByLabelText("Code langue (ISO 639-3)"), {
      target: { value: "ful" },
    });
    fireEvent.change(screen.getByLabelText("Résumé"), {
      target: { value: "Un résumé du récit." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Soumettre le récit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          attribution: expect.objectContaining({
            displayMode: "withheld",
            displayName: null,
          }),
        })
      );
    });
  });
});

describe("oral narrative moderation", () => {
  // @req REQ-095
  it("submits only review, rights and publication state changes", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <OralNarrativeModerationForm
        initialState={{
          reviewStatus: "pending",
          rightsStatus: "pending",
          visibility: "restricted",
        }}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "État de la revue" }),
      {
        target: { value: "approved" },
      }
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "État des droits" }),
      {
        target: { value: "cleared" },
      }
    );
    fireEvent.click(screen.getByRole("radio", { name: "Publier" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la décision" })
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        reviewStatus: "approved",
        rightsStatus: "cleared",
        visibility: "public",
      });
    });
    expect(screen.queryByText("Aïcha")).not.toBeInTheDocument();
    expect(
      screen.queryByText("https://media.example.org/recit")
    ).not.toBeInTheDocument();
  });

  // @req REQ-095
  it("does not allow public publication before approval and rights clearance", () => {
    const onSubmit = vi.fn();

    render(
      <OralNarrativeModerationForm
        initialState={{
          reviewStatus: "pending",
          rightsStatus: "pending",
          visibility: "restricted",
        }}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: "Publier" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la décision" })
    );

    expect(
      screen.getByText(
        "La publication exige une revue approuvée et des droits clarifiés."
      )
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
