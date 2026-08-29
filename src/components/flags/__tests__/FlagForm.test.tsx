import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FlagForm } from "../FlagForm";

const target = {
  type: "people",
  id: "PPL_YORUBA",
  name: "Yoruba",
  fieldPath: "demographics.population",
  fieldLabel: "Population",
  snapshotQuote: "La population est estimée à dix millions.",
};

function renderForm(
  overrides: Partial<React.ComponentProps<typeof FlagForm>> = {}
) {
  const defaultOnSubmit = vi
    .fn()
    .mockResolvedValue({ public_slug: "ABC123DEFG" });
  const defaultOnCancel = vi.fn();
  const onSubmit = overrides.onSubmit ?? defaultOnSubmit;
  const onCancel = overrides.onCancel ?? defaultOnCancel;

  const view = render(
    <FlagForm
      target={target}
      onSubmit={onSubmit}
      onCancel={onCancel}
      renderTurnstile={overrides.renderTurnstile}
    />
  );

  return { ...view, onSubmit, onCancel };
}

function chooseKind(value: string) {
  fireEvent.click(screen.getByRole("radio", { name: new RegExp(value, "i") }));
}

function validReason() {
  return "Cette explication contient assez de détails pour être examinée.";
}

function renderWithTurnstile(
  overrides: Partial<React.ComponentProps<typeof FlagForm>> = {}
) {
  let verify: (token: string) => void = () => {};
  let fail = () => {};
  let expire = () => {};

  const result = renderForm({
    renderTurnstile: ({ onVerify, onError, onExpire }) => {
      verify = onVerify;
      fail = onError;
      expire = onExpire;
      return <div data-testid="turnstile-widget">Widget Turnstile</div>;
    },
    ...overrides,
  });

  return {
    ...result,
    verify: (token: string) => act(() => verify(token)),
    fail: () => act(() => fail()),
    expire: () => act(() => expire()),
  };
}

describe("FlagForm contract and validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-012
  it("shows the target context and exactly six native flag kinds", () => {
    renderForm();

    // The reporter is told what they are reporting by name, not by corpus
    // identifier. `PPL_YORUBA` and `demographics.population` still travel in
    // the payload below — they belong in the record, not on the page.
    expect(screen.getByText("Peuple · Yoruba")).toBeInTheDocument();
    expect(screen.getByText("Population")).toBeInTheDocument();
    expect(screen.queryByText("PPL_YORUBA")).toBeNull();
    expect(screen.queryByText("demographics.population")).toBeNull();
    expect(screen.getByRole("blockquote")).toHaveTextContent(
      "La population est estimée à dix millions."
    );

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(6);
    expect(radios.map((radio) => radio.getAttribute("value"))).toEqual([
      "inaccurate",
      "missing-source",
      "broken-url",
      "offensive",
      "correction-proposal",
      "other",
    ]);
    radios.forEach((radio) => {
      expect(radio.tagName).toBe("INPUT");
      expect(radio).toHaveAttribute("type", "radio");
    });
  });

  // @req REQ-012
  it("calls onCancel from the secondary action", () => {
    const { onCancel } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  // @req REQ-012
  it.each(["Contenu inexact", "Source manquante"])(
    "requires at least one source for %s",
    (accessibleName) => {
      renderForm();
      chooseKind(accessibleName);

      fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

      expect(
        screen.getByText("Une source ou une citation est requise.")
      ).toBeInTheDocument();
    }
  );

  // @req REQ-013
  it("requires a rewrite and at least one source for a correction proposal", () => {
    renderForm();
    chooseKind("Proposition de correction");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      screen.getByText("La proposition de correction est requise.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Une source ou une citation est requise.")
    ).toBeInTheDocument();
  });

  // @req REQ-044
  it("marks the flag kind as required and associates the source requirement", () => {
    renderForm();

    screen.getAllByRole("radio").forEach((radio) => {
      expect(radio).toBeRequired();
    });

    chooseKind("Contenu inexact");
    const requirement = screen.getByText(
      "Ajoutez au moins un lien ou une citation."
    );
    expect(screen.getByLabelText("Lien de la contre-source")).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining(requirement.id)
    );
  });

  // @req REQ-012
  it("rejects a non-HTTP counter-source URL", () => {
    const { onSubmit, verify } = renderWithTurnstile();
    chooseKind("Contenu inexact");
    fireEvent.change(screen.getByLabelText("Raison du signalement"), {
      target: { value: validReason() },
    });
    fireEvent.change(screen.getByLabelText("Lien de la contre-source"), {
      target: { value: "ftp://example.org/source" },
    });
    verify("resolved-turnstile-token");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      screen.getByText("Saisissez une adresse HTTP ou HTTPS valide.")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // @req REQ-012
  it("rejects a counter-source citation over 2,000 characters", () => {
    const { onSubmit, verify } = renderWithTurnstile();
    chooseKind("Source manquante");
    fireEvent.change(screen.getByLabelText("Raison du signalement"), {
      target: { value: validReason() },
    });
    fireEvent.change(screen.getByLabelText("Citation de la contre-source"), {
      target: { value: "a".repeat(2001) },
    });
    verify("resolved-turnstile-token");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      screen.getByText("La citation ne peut pas dépasser 2 000 caractères.")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // @req REQ-012
  it.each([
    ["Contenu inexact", "url"],
    ["Source manquante", "citation"],
    ["Lien cassé", "none"],
    ["Contenu offensant", "none"],
    ["Autre", "none"],
  ])(
    "accepts the valid source combination for %s",
    async (accessibleName, sourceKind) => {
      const { onSubmit, verify } = renderWithTurnstile();
      chooseKind(accessibleName);
      fireEvent.change(screen.getByLabelText("Raison du signalement"), {
        target: { value: validReason() },
      });
      if (sourceKind === "url") {
        fireEvent.change(screen.getByLabelText("Lien de la contre-source"), {
          target: { value: "https://example.org/source" },
        });
      }
      if (sourceKind === "citation") {
        fireEvent.change(
          screen.getByLabelText("Citation de la contre-source"),
          { target: { value: "Référence bibliographique vérifiable." } }
        );
      }
      verify("resolved-turnstile-token");

      fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    }
  );

  // @req REQ-012
  it.each([
    "Contenu inexact",
    "Source manquante",
    "Lien cassé",
    "Contenu offensant",
    "Proposition de correction",
    "Autre",
  ])("requires a 50 to 2,000 character reason for %s", (accessibleName) => {
    renderForm();
    chooseKind(accessibleName);

    const reason = screen.getByLabelText("Raison du signalement");
    fireEvent.change(reason, { target: { value: "Trop court" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      screen.getByText("La raison doit contenir entre 50 et 2 000 caractères.")
    ).toBeInTheDocument();
  });
});

describe("FlagForm submission and Turnstile lifecycle", () => {
  // @req REQ-012
  it("submits the API-facing payload with the resolved Turnstile token", async () => {
    const { onSubmit, verify } = renderWithTurnstile();
    chooseKind("Proposition de correction");
    fireEvent.change(screen.getByLabelText("Raison du signalement"), {
      target: { value: `  ${validReason()}  ` },
    });
    fireEvent.change(
      screen.getByLabelText("Proposition de correction", {
        selector: "textarea",
      }),
      {
        target: { value: "  Une formulation corrigée.  " },
      }
    );
    fireEvent.change(screen.getByLabelText("Citation de la contre-source"), {
      target: { value: "  UNESCO, rapport 2025, p. 42.  " },
    });
    verify("resolved-turnstile-token");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith({
      target_type: "people",
      target_id: "PPL_YORUBA",
      target_field_path: "demographics.population",
      flag_kind: "correction-proposal",
      reason_text: validReason(),
      counter_source_citation: "UNESCO, rapport 2025, p. 42.",
      proposed_rewrite: "Une formulation corrigée.",
      turnstile_token: "resolved-turnstile-token",
    });
  });

  // @req REQ-013
  it("omits a hidden rewrite after switching away from correction proposal", async () => {
    const { onSubmit, verify } = renderWithTurnstile();
    chooseKind("Proposition de correction");
    fireEvent.change(
      screen.getByLabelText("Proposition de correction", {
        selector: "textarea",
      }),
      { target: { value: "Une formulation qui ne doit pas être envoyée." } }
    );
    chooseKind("Autre");
    fireEvent.change(screen.getByLabelText("Raison du signalement"), {
      target: { value: validReason() },
    });
    verify("resolved-turnstile-token");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.not.objectContaining({
        proposed_rewrite: expect.anything(),
      })
    );
  });

  // @req REQ-012
  it("transitions to the French success state with the public permalink", async () => {
    const { verify } = renderWithTurnstile();
    chooseKind("Autre");
    fireEvent.change(screen.getByLabelText("Raison du signalement"), {
      target: { value: validReason() },
    });
    verify("resolved-turnstile-token");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      await screen.findByText(
        "Merci — vous recevrez un email quand la modération aura tranché."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Consulter le signalement" })
    ).toHaveAttribute("href", "/fr/signalements/ABC123DEFG");
    expect(screen.queryByRole("button", { name: "Envoyer" })).toBeNull();
  });

  // @req REQ-012
  it("rejects submission when the Turnstile token is missing", () => {
    const { onSubmit } = renderWithTurnstile();
    chooseKind("Autre");
    fireEvent.change(screen.getByLabelText("Raison du signalement"), {
      target: { value: validReason() },
    });

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      screen.getByText("Validez le contrôle anti-robot.")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // @req REQ-012
  it("clears the token and rejects submission when Turnstile reports a failure", () => {
    const { fail, onSubmit, verify } = renderWithTurnstile();
    chooseKind("Autre");
    fireEvent.change(screen.getByLabelText("Raison du signalement"), {
      target: { value: validReason() },
    });
    verify("token-that-must-be-cleared");
    fail();

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      screen.getByText("Le contrôle anti-robot a échoué. Réessayez.")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // @req REQ-012
  it("clears the token and rejects submission when Turnstile expires", () => {
    const { expire, onSubmit, verify } = renderWithTurnstile();
    chooseKind("Autre");
    fireEvent.change(screen.getByLabelText("Raison du signalement"), {
      target: { value: validReason() },
    });
    verify("expired-token");
    expire();

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      screen.getByText("Le contrôle anti-robot a expiré. Recommencez.")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // @req REQ-012
  it("shows a recoverable French error when onSubmit rejects", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error("Network unavailable"));
    const { verify } = renderWithTurnstile({ onSubmit });
    chooseKind("Autre");
    fireEvent.change(screen.getByLabelText("Raison du signalement"), {
      target: { value: validReason() },
    });
    verify("resolved-turnstile-token");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      await screen.findByText("L’envoi du signalement a échoué. Réessayez.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(onSubmit).toHaveBeenCalledOnce();

    verify("fresh-turnstile-token");
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  });
});

describe("FlagForm accessibility and responsive behavior", () => {
  // @req REQ-013
  it("updates the visible reason and rewrite character counters", () => {
    renderForm();
    chooseKind("Proposition de correction");

    expect(screen.getByText("0 / 2 000")).toBeInTheDocument();
    expect(screen.getByText("0 / 5 000")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Raison du signalement"), {
      target: { value: "Trente-sept caractères exactement ici." },
    });
    fireEvent.change(
      screen.getByLabelText("Proposition de correction", {
        selector: "textarea",
      }),
      { target: { value: "Nouvelle formulation" } }
    );

    expect(screen.getByText("38 / 2 000")).not.toHaveAttribute("aria-live");
    expect(screen.getByText("20 / 5 000")).not.toHaveAttribute("aria-live");
  });

  // @req REQ-044
  it("links validation errors to their fields with aria-describedby", () => {
    renderForm();
    chooseKind("Proposition de correction");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    const reasonError = screen.getByText(
      "La raison doit contenir entre 50 et 2 000 caractères."
    );
    const rewriteError = screen.getByText(
      "La proposition de correction est requise."
    );
    const sourceError = screen.getByText(
      "Une source ou une citation est requise."
    );

    expect(screen.getByLabelText("Raison du signalement")).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining(reasonError.id)
    );
    expect(
      screen.getByLabelText("Proposition de correction", {
        selector: "textarea",
      })
    ).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining(rewriteError.id)
    );
    expect(screen.getByLabelText("Lien de la contre-source")).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining(sourceError.id)
    );
  });

  // @req REQ-044
  it("uses mobile-first stacking with tablet and desktop enhancements", () => {
    const { container } = renderForm();
    const form = container.querySelector("form");

    expect(form).toHaveClass("w-full", "p-afh-2xl");
    expect(form?.className).toContain("md:p-afh-5xl");
    expect(form?.className).toContain("min-[1200px]:p-afh-6xl");

    const actions = screen.getByRole("button", {
      name: "Annuler",
    }).parentElement;
    expect(actions).toHaveClass("flex-col-reverse");
    expect(actions?.className).toContain("md:flex-row");
  });

  // @req REQ-044
  it("has no axe-core accessibility violations", async () => {
    const { container } = renderForm({
      renderTurnstile: () => (
        <div aria-label="Contrôle anti-robot" role="group" />
      ),
    });
    chooseKind("Proposition de correction");

    const results = await axe.run(container);

    expect(results.violations.map(({ id, help }) => ({ id, help }))).toEqual(
      []
    );
  });
});
