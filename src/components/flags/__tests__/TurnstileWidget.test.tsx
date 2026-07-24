// @req REQ-012
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TurnstileWidget,
  validateTurnstileToken,
} from "@/components/flags/TurnstileWidget";

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({
    siteKey,
    options,
    onSuccess,
    onExpire,
    onError,
  }: {
    siteKey: string;
    options: { appearance: string };
    onSuccess: (token: string) => void;
    onExpire: () => void;
    onError: () => void;
  }) => (
    <div
      data-testid="turnstile"
      data-site-key={siteKey}
      data-appearance={options.appearance}
    >
      <button type="button" onClick={() => onSuccess("verified-token")}>
        succeed
      </button>
      <button type="button" onClick={onExpire}>
        expire
      </button>
      <button type="button" onClick={onError}>
        fail
      </button>
    </div>
  ),
}));

describe("TurnstileWidget", () => {
  // @req REQ-012
  it("forwards the site key and low-friction appearance", () => {
    render(
      <TurnstileWidget siteKey="public-site-key" onTokenChange={vi.fn()} />
    );

    expect(screen.getByTestId("turnstile")).toHaveAttribute(
      "data-site-key",
      "public-site-key"
    );
    expect(screen.getByTestId("turnstile")).toHaveAttribute(
      "data-appearance",
      "interaction-only"
    );
  });

  // @req REQ-012
  it("passes a successful verification token to the form", () => {
    const onTokenChange = vi.fn();
    render(
      <TurnstileWidget
        siteKey="public-site-key"
        onTokenChange={onTokenChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "succeed" }));

    expect(onTokenChange).toHaveBeenLastCalledWith("verified-token");
  });

  // @req REQ-012
  it.each(["expire", "fail"])(
    "clears the form token when the widget reports %s",
    (action) => {
      const onTokenChange = vi.fn();
      render(
        <TurnstileWidget
          siteKey="public-site-key"
          onTokenChange={onTokenChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: action }));

      expect(onTokenChange).toHaveBeenLastCalledWith(null);
    }
  );

  // @req REQ-012
  it("returns the exact missing-token validation message", () => {
    expect(validateTurnstileToken("")).toBe("vérification anti-bot requise");
    expect(validateTurnstileToken(null)).toBe("vérification anti-bot requise");
    expect(validateTurnstileToken("verified-token")).toBeNull();
  });

  // @req REQ-012
  it("shows the fallback notice and programmatic API link after an error", () => {
    render(
      <TurnstileWidget siteKey="public-site-key" onTokenChange={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "fail" }));

    expect(
      screen.getByText(
        "pour soumettre un signalement, activez JavaScript et débloquez challenges.cloudflare.com"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Utiliser l’API de signalement" })
    ).toHaveAttribute("href", "/api/v2/flags");
  });
});
