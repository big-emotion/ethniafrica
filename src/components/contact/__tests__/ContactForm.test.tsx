import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContactForm } from "@/components/contact/ContactForm";

function fillValidMessage() {
  fireEvent.change(screen.getByLabelText(/Prénom/), {
    target: { value: "Aminata" },
  });
  fireEvent.change(screen.getByLabelText(/^Nom/), {
    target: { value: "Diallo" },
  });
  fireEvent.change(screen.getByLabelText(/Adresse électronique/), {
    target: { value: "aminata@example.org" },
  });
  fireEvent.change(screen.getByLabelText(/Objet/), {
    target: { value: "correction" },
  });
  fireEvent.change(screen.getByLabelText(/Message/), {
    target: { value: "La fiche Peul cite une population de 1998." },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /Envoyer/ }));
}

function postedBody() {
  const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
  return JSON.parse((init as RequestInit).body as string);
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // @req REQ-045
  it("marks the fields a reader must fill, and only those", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText(/Prénom/)).toBeRequired();
    expect(screen.getByLabelText(/^Nom/)).toBeRequired();
    expect(screen.getByLabelText(/Adresse électronique/)).toBeRequired();
    expect(screen.getByLabelText(/Objet/)).toBeRequired();
    expect(screen.getByLabelText(/Message/)).toBeRequired();
    expect(screen.getByLabelText(/Civilité/)).not.toBeRequired();
  });

  // @req REQ-045
  it("sends what the reader typed to the contact endpoint", async () => {
    render(<ContactForm />);
    fillValidMessage();
    submit();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(postedBody()).toMatchObject({
      firstName: "Aminata",
      lastName: "Diallo",
      email: "aminata@example.org",
      subject: "correction",
    });
  });

  // @req REQ-045
  it("tells the reader their message left", async () => {
    render(<ContactForm />);
    fillValidMessage();
    submit();

    expect(await screen.findByRole("status")).toHaveTextContent(/bien parti/i);
  });

  /**
   * A form that keeps the message after sending invites a second send of the
   * same words, which the single inbox reads as two requests.
   */
  // @req REQ-045
  it("empties the message once it has left", async () => {
    render(<ContactForm />);
    fillValidMessage();
    submit();

    await screen.findByRole("status");
    expect(screen.getByLabelText(/Message/)).toHaveValue("");
  });

  // @req REQ-045
  it("reports the fields the server named, against the fields themselves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: "VALIDATION_ERROR",
          message: "Le formulaire comporte des champs à corriger.",
          fieldErrors: {
            email: ["Cette adresse électronique n'est pas valide."],
          },
        }),
      })
    );

    render(<ContactForm />);
    fillValidMessage();
    submit();

    expect(
      await screen.findByText(/adresse électronique n'est pas valide/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Adresse électronique/)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  /**
   * The failure the reader can act on is the address, not the status code —
   * a message that did not leave is only recoverable if they are told where
   * to write instead.
   */
  // @req REQ-045
  it("hands back the direct address when the send fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          error: "EMAIL_TRANSPORT_UNAVAILABLE",
          message:
            "L'envoi est momentanément indisponible. Écrivez-nous directement à contact@ethniafrica.com.",
          contactEmail: "contact@ethniafrica.com",
        }),
      })
    );

    render(<ContactForm />);
    fillValidMessage();
    submit();

    expect(
      await screen.findByText(/contact@ethniafrica\.com/)
    ).toBeInTheDocument();
  });

  // @req REQ-045
  it("keeps the reader's words when the send fails, so nothing is retyped", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    render(<ContactForm />);
    fillValidMessage();
    submit();

    await screen.findByRole("alert");
    expect(screen.getByLabelText(/Message/)).toHaveValue(
      "La fiche Peul cite une population de 1998."
    );
  });

  /**
   * A second click while the first is in flight mails the same message twice.
   */
  // @req REQ-045
  it("refuses a second submission while one is in flight", async () => {
    let release: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((resolve) => (release = resolve)))
    );

    render(<ContactForm />);
    fillValidMessage();
    submit();

    const inFlight = await screen.findByRole("button", {
      name: /Envoi en cours/,
    });
    expect(inFlight).toBeDisabled();

    fireEvent.click(inFlight);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    release({ ok: true, status: 201, json: async () => ({ success: true }) });
  });

  /**
   * The trap is only a trap while it is invisible to the reader and offered
   * to whatever fills every field it finds.
   */
  // @req REQ-045
  it("carries a honeypot no reader can reach", () => {
    const { container } = render(<ContactForm />);
    const honeypot = container.querySelector('input[name="honeypot"]');

    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot?.parentElement).toHaveAttribute("aria-hidden", "true");
  });
});
