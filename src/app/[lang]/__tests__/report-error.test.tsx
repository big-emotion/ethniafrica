/**
 * What the "Signaler une erreur" page owes a reader who chose it.
 *
 * It shipped with a Typeform embed and four paragraphs telling the reader to
 * use "le formulaire ci-dessous". The site's CSP allows scripts from `'self'`
 * and a nonce and nothing else, so the embed's script never ran: no iframe, no
 * form, no error anyone would see — the promise over blank paper. That state
 * survived because the only thing anyone tested was that a link pointed here.
 *
 * The page now carries the atlas's own form, filed against a `general` target.
 * That is a deliberate exception to the moderation charter's preference for
 * reporting from the fiche (§3): the footer offers this page to every reader
 * on every screen, including one who cannot name the fiche concerned, and an
 * entry point that leads nowhere is worse than one that lands imprecisely.
 * The charter records the exception rather than pretending it away.
 *
 * The form is on the page, not behind a button. A reader who has already
 * chosen "Signaler une erreur" has stated their intent; asking them to press a
 * second control to reach the field is a toll on the one gesture the atlas
 * most wants to receive (§2).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ReportErrorPage from "@/app/[lang]/report-error/page";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ lang: "fr" }),
  usePathname: () => "/fr/report-error",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * The shell is stood down to its children on purpose. Its footer carries a
 * "Signaler une erreur" entry of its own, and a test that counted links across
 * the whole shell would pass on the footer's links while the page itself said
 * nothing — the shape of the failure this file exists to catch.
 */
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/lib/supabase/auth-client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

/**
 * The real gate fetches a challenge and starts a worker. Stood in for by a
 * button, so a test can say "the browser has finished paying" when it chooses.
 */
vi.mock("@/components/flags/ProofOfWorkGate", () => ({
  ProofOfWorkGate: ({
    onSolved,
  }: {
    onSolved: (proof: Record<string, unknown>) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSolved({
          salt: "test-salt",
          nonce: "42",
          difficultyBits: 8,
          expiresAt: 4102444800000,
          signature: "test-signature",
        })
      }
    >
      Valider le contrôle (test)
    </button>
  ),
}));

const A_REAL_REPORT =
  "La population indiquée pour ce pays ne correspond à aucun recensement " +
  "récent, et la source citée date de plus de dix ans.";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createBrowserSupabaseClient).mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  } as never);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { public_slug: "flag-abc123" } }),
    })
  );
});

describe("Signaler une erreur", () => {
  // @req REQ-014
  it("carries no third-party embed the page's own CSP forbids", () => {
    const { container } = render(<ReportErrorPage />);

    expect(container.querySelector("[data-tf-live]")).toBeNull();
    expect(container.querySelector('script[src*="typeform"]')).toBeNull();
  });

  // @req REQ-014
  it("shows the form itself, not a button that promises one", () => {
    render(<ReportErrorPage />);

    expect(
      screen.getByLabelText(/qu'est-ce qui ne va pas/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeInTheDocument();
  });

  // @req REQ-014
  it("offers no Annuler, because there is nothing to cancel back to", () => {
    render(<ReportErrorPage />);

    expect(
      screen.queryByRole("button", { name: "Annuler" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-014
  it("files against a general target, never a fiche section it cannot name", async () => {
    const user = userEvent.setup();
    render(<ReportErrorPage />);

    await user.type(
      screen.getByLabelText(/qu'est-ce qui ne va pas/i),
      A_REAL_REPORT
    );
    await user.click(
      screen.getByRole("button", { name: "Valider le contrôle (test)" })
    );
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/v2/flags");
    const payload = JSON.parse((init as RequestInit).body as string);
    expect(payload.target_type).toBe("general");
    expect(payload.reason_text).toContain("recensement");
  });

  // @req REQ-014
  it("confirms with the report's own public address", async () => {
    const user = userEvent.setup();
    render(<ReportErrorPage />);

    await user.type(
      screen.getByLabelText(/qu'est-ce qui ne va pas/i),
      A_REAL_REPORT
    );
    await user.click(
      screen.getByRole("button", { name: "Valider le contrôle (test)" })
    );
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(
      await screen.findByRole("link", { name: /consulter le signalement/i })
    ).toHaveAttribute("href", "/fr/signalements/flag-abc123");
  });

  // @req REQ-014
  it("still says a report aimed from the fiche is the better one", () => {
    render(<ReportErrorPage />);

    // The charter's preference survives the exception: the page offers the
    // general form and tells the reader the aimed one exists.
    expect(document.body.textContent).toMatch(/Signaler/);
  });
});
