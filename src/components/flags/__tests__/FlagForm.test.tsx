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

const REASON_LABEL = /qu'est-ce qui ne va pas/i;

/**
 * Fill the one required field, optionally open a disclosure and fill it, then
 * send. `fields` is keyed by visible label so each test reads as the gesture
 * a reporter actually performs.
 */
async function submitReport(
  fields: Record<string, string>,
  reason = validReason()
) {
  const view = renderWithTurnstile();

  fireEvent.change(screen.getByLabelText(REASON_LABEL), {
    target: { value: reason },
  });
  for (const [label, value] of Object.entries(fields)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  view.verify("resolved-turnstile-token");
  fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

  await waitFor(() => expect(view.onSubmit).toHaveBeenCalled());
  return view;
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
  it("names what is being reported, without its corpus identifier", () => {
    renderForm();

    expect(screen.getByText("Peuple · Yoruba")).toBeInTheDocument();
    expect(screen.getByText("Population")).toBeInTheDocument();
    expect(screen.queryByText("PPL_YORUBA")).toBeNull();
    expect(screen.queryByText("demographics.population")).toBeNull();
    expect(screen.getByRole("blockquote")).toHaveTextContent(
      "La population est estimée à dix millions."
    );
  });

  /**
   * The reader used to face six categories before writing anything, and the
   * one they picked then imposed further mandatory fields — choosing "Source
   * manquante" required supplying a source. The atlas files the report; the
   * reader states the problem (moderation charter §1).
   */
  // @req REQ-012
  it("asks one question, and offers no category to choose from", () => {
    renderForm();

    expect(screen.getByLabelText(REASON_LABEL)).toBeRequired();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByText(/type de signalement/i)).toBeNull();
  });

  // @req REQ-012
  it("sends a bare report, with both disclosures untouched", async () => {
    const { onSubmit } = await submitReport({});

    expect(onSubmit).toHaveBeenCalledOnce();
    const payload = vi.mocked(onSubmit).mock.calls[0][0];
    expect(payload.flag_kind).toBe("other");
    expect(payload.proposed_rewrite).toBeUndefined();
    expect(payload.counter_source_url).toBeUndefined();
  });

  // @req REQ-013
  it("files a report carrying a correction as a correction proposal", async () => {
    const { onSubmit } = await submitReport({
      "Proposition de correction": "Le nom s'écrit Bété, avec un accent.",
    });

    expect(vi.mocked(onSubmit).mock.calls[0][0].flag_kind).toBe(
      "correction-proposal"
    );
  });

  // @req REQ-012
  it("files a report carrying only a source as a missing source", async () => {
    const { onSubmit } = await submitReport({
      "Lien de la contre-source": "https://example.org/source",
    });

    expect(vi.mocked(onSubmit).mock.calls[0][0].flag_kind).toBe(
      "missing-source"
    );
  });

  // @req REQ-012
  it("calls onCancel from the secondary action", () => {
    const { onCancel } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  // @req REQ-012
  it("rejects a non-HTTP counter-source URL", () => {
    const { onSubmit, verify } = renderWithTurnstile();
    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
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
    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
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

  /**
   * Ten characters, not fifty. The API has always accepted ten, and the form
   * demanded five times that without saying why — long enough to reject
   * "l'orthographe de Bété est fausse".
   */
  // @req REQ-012
  it("accepts a description of ten characters", async () => {
    const { onSubmit } = await submitReport({}, "Bété mal écrit");

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  // @req REQ-012
  it("refuses a description shorter than that", () => {
    const { onSubmit, verify } = renderWithTurnstile();
    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
      target: { value: "court" },
    });
    verify("resolved-turnstile-token");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      screen.getByText(
        "La description doit contenir entre 10 et 2 000 caractères."
      )
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("FlagForm submission and Turnstile lifecycle", () => {
  // @req REQ-012
  it("submits the API-facing payload with the resolved Turnstile token", async () => {
    const { onSubmit, verify } = renderWithTurnstile();
    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
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
  it("sends nothing from a disclosure the reader emptied again", async () => {
    const { onSubmit, verify } = renderWithTurnstile();
    const rewrite = screen.getByLabelText("Proposition de correction", {
      selector: "textarea",
    });
    fireEvent.change(rewrite, { target: { value: "Une reformulation." } });
    fireEvent.change(rewrite, { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
      target: { value: validReason() },
    });
    verify("resolved-turnstile-token");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.not.objectContaining({ proposed_rewrite: expect.anything() })
    );
    // Whitespace is not evidence, so the kind stays underived.
    expect(vi.mocked(onSubmit).mock.calls[0][0].flag_kind).toBe("other");
  });

  // @req REQ-012
  it("transitions to the French success state with the public permalink", async () => {
    const { verify } = renderWithTurnstile();
    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
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
    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
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
    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
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
    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
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
    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
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

    expect(screen.getByText("0 / 2 000")).toBeInTheDocument();
    expect(screen.getByText("0 / 5 000")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(REASON_LABEL), {
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
  it("links the description error to its field with aria-describedby", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    // Only one error can be raised on an untouched form now: the correction
    // and the source are optional, so an empty disclosure is not a fault.
    const reasonError = screen.getByText(
      "La description doit contenir entre 10 et 2 000 caractères."
    );
    expect(screen.getByLabelText(REASON_LABEL)).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining(reasonError.id)
    );
    expect(
      screen.queryByText("La proposition de correction est requise.")
    ).toBeNull();
    expect(
      screen.queryByText("Une source ou une citation est requise.")
    ).toBeNull();
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

    const results = await axe.run(container);

    expect(results.violations.map(({ id, help }) => ({ id, help }))).toEqual(
      []
    );
  });
});
