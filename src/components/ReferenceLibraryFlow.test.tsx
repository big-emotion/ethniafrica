import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReferenceLibraryFlow } from "./ReferenceLibraryFlow";

const getSession = vi.fn();

vi.mock("@/lib/supabase/auth-client", () => ({
  createBrowserSupabaseClient: () => ({ auth: { getSession } }),
}));

function renderFlow(assertionId?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <ReferenceLibraryFlow assertionId={assertionId} />
    </QueryClientProvider>
  );
}

describe("ReferenceLibraryFlow", () => {
  beforeEach(() => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "contributor-token" } },
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // @req REQ-093
  it("uses French copy and keeps the staged flow single-column before tablet", () => {
    const { container } = renderFlow();

    expect(
      screen.getByRole("heading", { name: "Ajouter une référence" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Rechercher une référence existante")
    ).toBeInTheDocument();
    expect(screen.queryByText("Add a reference")).not.toBeInTheDocument();

    const flow = container.querySelector("[data-reference-library-flow]");
    expect(flow?.className).toContain("space-y-4");
    expect(flow?.className).toContain("min-[720px]:space-y-6");
    expect(flow?.className).toContain("min-[800px]:p-8");
  });

  // @req REQ-093
  it("keeps the offline-work URL optional and preserves the mobile field order", () => {
    renderFlow();

    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer un ouvrage hors ligne" })
    );

    const title = screen.getByLabelText("Titre de l’ouvrage");
    const authors = screen.getByLabelText("Auteur(s)");
    const year = screen.getByLabelText("Année de publication");
    const identifier = screen.getByLabelText(
      "Identifiant bibliographique (ISBN, DOI ou cote)"
    );
    const publisher = screen.getByLabelText(
      "Éditeur ou institution (optionnel)"
    );
    const url = screen.getByLabelText("URL (optionnelle)");

    expect(identifier).not.toBeRequired();
    expect(publisher).not.toBeRequired();
    expect(url).not.toBeRequired();
    expect(
      title.compareDocumentPosition(authors) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      authors.compareDocumentPosition(year) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      year.compareDocumentPosition(identifier) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      identifier.compareDocumentPosition(publisher) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      publisher.compareDocumentPosition(url) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // @req REQ-093
  it("shows the optional assertion locator and private scan/OCR notice after selecting a reference", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            source_key: "un-wpp-2025",
            title: "World Population Prospects 2025",
            author: "United Nations",
            year: 2025,
            source_kind: "intergovernmental",
            evidence_tier: 1,
            identifiers: {},
            publisher: "United Nations",
            url: "https://population.un.org/wpp/",
          },
        ],
      }),
    } as Response);

    renderFlow("22222222-2222-2222-2222-222222222222");

    fireEvent.change(
      screen.getByLabelText("Rechercher une référence existante"),
      { target: { value: "population" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    const result = await screen.findByRole("button", {
      name: /World Population Prospects 2025/,
    });
    fireEvent.click(result);

    expect(
      screen.getByLabelText("Repère précis dans la source (optionnel)")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Le scan ou le texte OCR reste privé et ne sera pas publié sans vérification des droits."
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Type de document privé")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v2/reference-library?q=population&limit=20",
        expect.objectContaining({
          headers: { Authorization: "Bearer contributor-token" },
        })
      );
    });
  });
});
