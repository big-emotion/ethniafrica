import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiKeyRevealCard } from "../ApiKeyRevealCard";

describe("ApiKeyRevealCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // @req REQ-056
  it("shows the raw key exactly once, in full", () => {
    render(
      <ApiKeyRevealCard
        label="Local dev"
        apiKey="usr_abcdef123456" // gitleaks:allow
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/nouvelle clé api/i)).toHaveValue(
      "usr_abcdef123456"
    );
    expect(screen.getByText(/local dev/i)).toBeInTheDocument();
  });

  // @req REQ-056
  it("copies the key to the clipboard and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <ApiKeyRevealCard
        label="Local dev"
        apiKey="usr_abcdef123456" // gitleaks:allow
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /copier/i }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("usr_abcdef123456")
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/copi/i);
  });

  // @req REQ-056
  it("falls back to manual selection when the clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    render(
      <ApiKeyRevealCard
        label="Local dev"
        apiKey="usr_abcdef123456" // gitleaks:allow
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /copier/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /sélectionner manuellement/i
    );
  });

  // @req REQ-056
  it("calls onDismiss once the reader confirms they copied the key", () => {
    const onDismiss = vi.fn();
    render(
      <ApiKeyRevealCard
        label="Local dev"
        apiKey="usr_abcdef123456" // gitleaks:allow
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /copié la clé, la masquer/i })
    );

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
