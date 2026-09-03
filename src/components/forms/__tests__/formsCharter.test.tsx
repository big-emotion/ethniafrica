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
  // The moderation login mounts its own trail: it is a full-viewport centred
  // card with no `PageLayout` above it.
  usePathname: vi.fn(() => "/fr/admin/connexion"),
}));
vi.mock("@/hooks/use-language", () => ({
  useLanguage: vi.fn(() => ({ language: "fr", setLanguage: vi.fn() })),
}));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/app/[lang]/admin/connexion/actions", () => ({
  requestAdminSignInLink: vi.fn(),
}));

import AdminConnexionPage from "@/app/[lang]/admin/connexion/page";
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

/**
 * The account family this suite used to cover — sign-in, registration, profile
 * and a second admin login — is gone with the public accounts. One sign-in
 * surface is left, and it has one field and one button.
 */
describe("AdminConnexionPage — charter", () => {
  beforeEach(() => vi.clearAllMocks());

  // @req REQ-045
  it("wraps the card on a 16px radius", () => {
    const { container } = render(<AdminConnexionPage />);
    expect(container.querySelector(".rounded-afh-xl")).toBeTruthy();
  });

  // @req REQ-045
  it("keeps the sign-in action full-width below 768px and constrained above", () => {
    render(<AdminConnexionPage />);
    const submit = screen.getByRole("button", {
      name: "Recevoir un lien de connexion",
    });
    expect(submit.className).toContain("w-full");
    expect(submit.className).toContain("md:w-auto");
  });

  // @req REQ-045
  it("offers no federated identity provider at all", () => {
    render(<AdminConnexionPage />);
    expect(screen.queryByRole("button", { name: /GitHub/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Google/ })).toBeNull();
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
