// @req REQ-045 — Charter V2 forms/account/contribution family (ETNI-804)
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { FormFieldError } from "@/components/forms/FormFieldError";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ lang: "fr" })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));
vi.mock("@/hooks/use-language", () => ({
  useLanguage: vi.fn(() => ({ language: "fr", setLanguage: vi.fn() })),
}));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const authClientMocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
  signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
}));
vi.mock("@/lib/supabase/auth-client", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    auth: {
      signInWithOtp: authClientMocks.signInWithOtp,
      signInWithOAuth: authClientMocks.signInWithOAuth,
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  })),
}));

vi.mock("../actions", () => ({
  updateProfileAction: vi.fn(),
  eraseAccountAction: vi.fn(),
}));

import ConnexionPage from "@/app/[lang]/compte/connexion/page";
import InscriptionPage from "@/app/[lang]/compte/inscription/page";
import { ProfileForm } from "@/app/[lang]/compte/profil/ProfileForm";
import AdminConnexionPage from "@/app/[lang]/admin/connexion/page";
import AdminLoginPage from "@/app/admin/login/page";
import { ContributionForm } from "@/components/ContributionForm";
import { ReferenceLibraryFlow } from "@/components/ReferenceLibraryFlow";

function withQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("FormFieldError — reserved --afh-error token carrier", () => {
  // @req REQ-045
  it("renders nothing when there is no message", () => {
    const { container } = render(<FormFieldError>{null}</FormFieldError>);
    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-045
  it("renders an alert using the afh-error token", () => {
    render(<FormFieldError>Something went wrong</FormFieldError>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert.className).toContain("text-afh-error");
  });
});

describe("ConnexionPage — charter", () => {
  beforeEach(() => vi.clearAllMocks());

  // @req REQ-045
  it("wraps the field group in a 16px-radius card", () => {
    const { container } = render(<ConnexionPage />);
    expect(container.querySelector(".rounded-afh-xl")).toBeTruthy();
  });

  // @req REQ-045
  it("keeps the primary action full-width below 768px and constrained above", () => {
    render(<ConnexionPage />);
    const submit = screen.getByRole("button", {
      name: "Recevoir un lien magique",
    });
    expect(submit.className).toContain("w-full");
    expect(submit.className).toContain("md:w-auto");
  });

  // @req REQ-045
  it("signals the invalid email through the afh-error token only", async () => {
    render(<ConnexionPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Recevoir un lien magique" })
    );
    const alert = await screen.findByRole("alert");
    expect(alert.className).toContain("text-afh-error");
    expect(alert.className).not.toContain("text-red-600");
  });
});

describe("InscriptionPage — charter", () => {
  beforeEach(() => vi.clearAllMocks());

  // @req REQ-045
  it("wraps the field group in a 16px-radius card", () => {
    const { container } = render(<InscriptionPage />);
    expect(container.querySelector(".rounded-afh-xl")).toBeTruthy();
  });

  // @req REQ-045
  it("keeps the primary action full-width below 768px and constrained above", () => {
    render(<InscriptionPage />);
    const submit = screen.getByRole("button", {
      name: "Recevoir un lien magique",
    });
    expect(submit.className).toContain("w-full");
    expect(submit.className).toContain("md:w-auto");
  });

  // @req REQ-045
  it("signals the missing consent through the afh-error token only", async () => {
    render(<InscriptionPage />);
    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "amina@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Recevoir un lien magique" })
    );
    const alert = await screen.findByRole("alert");
    expect(alert.className).toContain("text-afh-error");
    expect(alert.className).not.toContain("text-red-600");
  });
});

describe("AdminConnexionPage — charter", () => {
  beforeEach(() => vi.clearAllMocks());

  // @req REQ-045
  it("wraps the card on a 16px radius", () => {
    const { container } = render(<AdminConnexionPage />);
    expect(container.querySelector(".rounded-afh-xl")).toBeTruthy();
  });

  // @req REQ-045
  it("keeps the magic-link action full-width below 768px and constrained above", () => {
    render(<AdminConnexionPage />);
    const submit = screen.getByRole("button", {
      name: "Envoyer le lien de connexion",
    });
    expect(submit.className).toContain("w-full");
    expect(submit.className).toContain("md:w-auto");
  });

  // @req REQ-045
  it("signals OAuth failure through the afh-error token only", async () => {
    authClientMocks.signInWithOAuth.mockResolvedValueOnce({
      data: null,
      error: { message: "OAuth indisponible" },
    });
    render(<AdminConnexionPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /Continuer avec GitHub/ })
    );
    const alert = await screen.findByRole("alert");
    expect(alert.className).toContain("text-afh-error");
    expect(alert.className).not.toContain("text-red-700");
  });
});

describe("AdminLoginPage — charter", () => {
  beforeEach(() => vi.clearAllMocks());

  // @req REQ-045
  it("wraps the card on a 16px radius", () => {
    const { container } = render(<AdminLoginPage />);
    expect(container.querySelector(".rounded-afh-xl")).toBeTruthy();
  });

  // @req REQ-045
  it("keeps the magic-link action full-width below 768px and constrained above", () => {
    render(<AdminLoginPage />);
    const submit = screen.getByRole("button", { name: "Send Magic Link" });
    expect(submit.className).toContain("w-full");
    expect(submit.className).toContain("md:w-auto");
  });
});

describe("ProfileForm — charter", () => {
  const baseProps = {
    displayName: "Amina Diallo",
    isPublic: true,
    maskedEmail: "a***@example.com",
    createdAt: "15 janvier 2026",
    ageConfirmed: true,
  };

  // @req REQ-042
  it("wraps field groups in 16px-radius cards", () => {
    const { container } = render(<ProfileForm {...baseProps} />);
    const cards = container.querySelectorAll(".rounded-afh-xl");
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  // @req REQ-042
  it("keeps the destructive account-deletion confirmation intact", () => {
    render(<ProfileForm {...baseProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer mon compte" })
    );
    expect(
      screen.getByRole("heading", { name: "Confirmer la suppression" })
    ).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", {
      name: "Supprimer définitivement",
    });
    expect(confirmButton).toBeDisabled();
    fireEvent.change(
      screen.getByLabelText("Saisissez SUPPRIMER pour confirmer"),
      { target: { value: "SUPPRIMER" } }
    );
    expect(confirmButton).not.toBeDisabled();
  });
});

describe("ContributionForm — charter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ peoples: [], families: [] }),
      })
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  // @req REQ-092
  it("wraps the form in a 16px-radius card", () => {
    const { container } = render(
      withQueryClient(<ContributionForm language="fr" />)
    );
    expect(container.querySelector(".rounded-afh-xl")).toBeTruthy();
  });

  // @req REQ-092
  it("keeps the submit action full-width below 768px and constrained above", () => {
    render(withQueryClient(<ContributionForm language="fr" />));
    const submit = screen.getByRole("button", {
      name: "Soumettre la contribution",
    });
    expect(submit.className).toContain("w-full");
    expect(submit.className).toContain("md:w-auto");
  });

  // @req REQ-092
  it("signals a submission error through the afh-error token only", async () => {
    const { container } = render(
      withQueryClient(<ContributionForm language="fr" />)
    );
    fireEvent.change(container.querySelector("select")!, {
      target: { value: "new_people" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Soumettre la contribution" })
    );
    const alert = await screen.findByText(
      "Veuillez remplir tous les champs obligatoires"
    );
    expect(alert.className).toContain("text-afh-error");
    expect(alert.className).not.toContain("text-red-500");
  });

  // @req REQ-092
  it("does not alter the source-tier picker markup (byte-identical)", async () => {
    const { container } = render(withQueryClient(<ReferenceLibraryFlow />));
    await waitFor(() =>
      expect(
        container.querySelector("[data-reference-library-flow]")
      ).toBeTruthy()
    );
    expect(
      container.querySelector("[data-reference-library-flow]")?.outerHTML
    ).toMatchSnapshot();
  });
});
