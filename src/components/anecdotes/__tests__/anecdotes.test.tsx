import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnecdoteCard } from "@/components/anecdotes/AnecdoteCard";
import { AnecdoteReader } from "@/components/anecdotes/AnecdoteReader";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import { getCountryRoute } from "@/lib/routing";

// Contesting an anecdote now opens the report dialog in place. These stand in
// for what that dialog reaches for and this suite is not about: a session, a
// toast, the consent state, and a proof of work the browser would have to pay.
vi.mock("@/lib/supabase/auth-client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-consent", () => ({
  useOptionalConsent: () => null,
}));

vi.mock("@/components/flags/ProofOfWorkGate", () => ({
  ProofOfWorkGate: () => null,
}));

const SOURCED: DidYouKnowFact = {
  id: "cameroun",
  headline: "Le Cameroun porte le nom d'un crustacé.",
  body: ["Rio dos Camarões, la rivière des crevettes."],
  entities: [{ kind: "country", id: "CMR", label: "Cameroun" }],
  tier: "referenced",
  sources: [
    {
      title: "Ministère des Relations extérieures du Cameroun — Histoire",
      url: "https://www.diplocam.cm/histoire/",
      tier: "official",
      notes: "Atteste la nomination de l'estuaire en 1472.",
    },
  ],
};

const UNSOURCED: DidYouKnowFact = {
  id: "monrovia",
  headline: "La capitale du Liberia porte le nom d'un président américain.",
  body: ["Monrovia vient de James Monroe."],
  entities: [{ kind: "country", id: "LBR", label: "Liberia" }],
  tier: "referenced",
};

const TOMBOUCTOU: DidYouKnowFact = {
  id: "tombouctou",
  headline: "Personne ne sait ce que veut dire Tombouctou.",
  body: ["Quatre étymologies au moins se disputent la ville."],
  entities: [{ kind: "country", id: "MLI", label: "Mali" }],
  tier: "unverified",
};

const DECK = [SOURCED, UNSOURCED, TOMBOUCTOU];
const DECK_IDS = DECK.map((fact) => fact.id);
const DECK_CARDS = new Map(DECK.map((fact) => [fact.id, { fact }]));

/** Stands in for the deferred chunk the page loads on the first turn. */
const loadDeckCards = () => Promise.resolve(DECK_CARDS);

function readerProps(openingId = DECK_IDS[0]) {
  return {
    deck: [openingId, ...DECK_IDS.filter((id) => id !== openingId)],
    openingCard: { fact: DECK.find((fact) => fact.id === openingId)! },
    loadCards: loadDeckCards,
  };
}

describe("AnecdoteCard — the fact a reader can cite (REQ-113)", () => {
  // @req REQ-113
  it("prints each source with its own tier, not just the fact's", () => {
    render(<AnecdoteCard language="fr" fact={SOURCED} />);

    const source = screen.getByRole("link", { name: /Ministère/ });
    expect(source).toHaveAttribute("href", "https://www.diplocam.cm/histoire/");
    expect(screen.getByText("Source officielle")).toBeInTheDocument();
    expect(screen.getByText("Source référencée")).toBeInTheDocument();
  });

  // A tier printed over a blank space asserts a provenance the reader
  // cannot check. Six facts predate the field and have to say so.
  // @req REQ-113
  it("says a fact is undocumented rather than showing a tier over nothing", () => {
    render(<AnecdoteCard language="fr" fact={UNSOURCED} />);

    expect(screen.getByText(/Provenance à documenter/)).toBeInTheDocument();
  });

  // @req REQ-113
  it("routes its chips into the atlas", () => {
    const { container } = render(<AnecdoteCard language="fr" fact={SOURCED} />);

    // Scoped to the chip list: the source title also names the country, and
    // a bare name query would match the citation just as happily.
    const chips = container.querySelector(".anecdote-chips") as HTMLElement;

    expect(
      within(chips).getByRole("link", { name: /Cameroun/ })
    ).toHaveAttribute("href", getCountryRoute("fr", "CMR"));
  });

  // The page is meant to be linked into, not just scrolled.
  // @req REQ-113
  it("anchors the fact under its own id", () => {
    const { container } = render(<AnecdoteCard language="fr" fact={SOURCED} />);

    expect(container.querySelector("#cameroun")).not.toBeNull();
  });

  // A picture asserts « this is what that was ». CC BY and CC BY-SA are only
  // satisfied when the reader can see who it is by.
  // @req REQ-113
  it("prints the credit of the picture it shows", () => {
    render(
      <AnecdoteCard
        language="fr"
        fact={SOURCED}
        illustration={{
          src: "/images/anecdotes/cameroun.jpg",
          alt: "Pirogues alignées sur la rive de l'estuaire du Wouri.",
          credit:
            "Estuaire du Wouri, Douala — Kondah, Wikimedia Commons, CC BY-SA 4.0",
        }}
      />
    );

    expect(screen.getByText(/Kondah/)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Pirogues alignées/ })
    ).toBeInTheDocument();
  });

  // The bank runs from a 0.60 portrait engraving to a 2.30 panorama while the
  // frame holds one ratio per breakpoint. Filling that frame cropped the
  // subject off the edges of the very document the anecdote is about.
  // @req REQ-113
  it("fits the whole document inside the frame instead of cropping it", () => {
    const { container } = render(<AnecdoteCard language="fr" fact={SOURCED} />);

    const stylesheet = container.querySelector("style")?.textContent ?? "";

    expect(stylesheet).toContain("object-fit: contain");
    expect(stylesheet).not.toContain("object-fit: cover");
  });
});

describe("AnecdoteReader — one anecdote at a time (REQ-113)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // @req REQ-113
  it("shows a single anecdote and keeps the rest of the deck out of sight", () => {
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    expect(screen.getByText(SOURCED.headline)).toBeInTheDocument();
    expect(screen.queryByText(UNSOURCED.headline)).toBeNull();
    expect(screen.queryByText(TOMBOUCTOU.headline)).toBeNull();
  });

  // The whole point of walking a shuffled deck rather than drawing each time.
  // @req REQ-113
  it("reaches every anecdote of the deck before showing one twice", async () => {
    const user = userEvent.setup();
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    const seen: string[] = [];
    for (let turn = 0; turn < DECK.length; turn += 1) {
      seen.push(screen.getByRole("heading", { level: 2 }).textContent ?? "");
      await user.click(screen.getByRole("button", { name: "Suivant" }));
    }

    expect(new Set(seen).size).toBe(DECK.length);
  });

  // @req REQ-113
  it("opens on the anecdote a shared link names", () => {
    render(<AnecdoteReader language="fr" {...readerProps("tombouctou")} />);

    expect(screen.getByText(TOMBOUCTOU.headline)).toBeInTheDocument();
  });

  // @req REQ-113
  it("falls back to the top of the deck when the link names a retired fact", () => {
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    expect(screen.getByText(SOURCED.headline)).toBeInTheDocument();
  });

  // The mark is the reader's own and never leaves their browser, so the only
  // thing that can prove it was kept is the browser.
  // @req REQ-113
  it("keeps the reader's mark on the anecdote they found interesting", async () => {
    const user = userEvent.setup();
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    const mark = screen.getByRole("button", {
      name: "Cette anecdote est intéressante",
    });
    expect(mark).toHaveAttribute("aria-pressed", "false");

    await user.click(mark);

    expect(
      screen.getByRole("button", { name: "Anecdote retenue" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("afh.anecdotes.marked")).toContain(
      "cameroun"
    );
  });

  // @req REQ-113
  it("lets the reader take the mark back off", async () => {
    const user = userEvent.setup();
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    await user.click(
      screen.getByRole("button", { name: "Cette anecdote est intéressante" })
    );
    await user.click(screen.getByRole("button", { name: "Anecdote retenue" }));

    expect(
      screen.getByRole("button", { name: "Cette anecdote est intéressante" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  // An objection that stays on the reader's machine is not an objection — and
  // neither is one handed to a page that cannot take it. This used to be a
  // link away to the report-error page, whose form is a third-party embed the
  // site's own CSP blocks: the reader left the anecdote and landed on prose
  // promising a form that was never going to mount. The report is taken where
  // the reader stands instead.
  // @req REQ-113
  it("takes a contestation where the reader stands, naming the anecdote", async () => {
    const user = userEvent.setup();
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    await user.click(
      screen.getByRole("button", { name: "Je conteste cette anecdote" })
    );

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Le Cameroun porte le nom d'un crustacé."
    );
  });

  // @req REQ-113
  it("no longer sends the reader away to a page with no form to offer", () => {
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    expect(
      screen.queryByRole("link", { name: "Je conteste cette anecdote" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-113
  it("carries the anecdote's own address into every network link", async () => {
    const user = userEvent.setup();
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    await user.click(screen.getByRole("button", { name: "Partager" }));

    for (const network of ["X", "Facebook", "WhatsApp", "LinkedIn"]) {
      expect(screen.getByRole("link", { name: network })).toHaveAttribute(
        "href",
        expect.stringContaining("a%3Dcameroun")
      );
    }
    expect(
      screen.getByRole("button", { name: "Copier le lien" })
    ).toBeInTheDocument();
  });

  // @req REQ-113
  it("closes the share row when the reader turns to another anecdote", async () => {
    const user = userEvent.setup();
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    await user.click(screen.getByRole("button", { name: "Partager" }));
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    expect(screen.queryByRole("link", { name: "Facebook" })).toBeNull();
  });

  // @req REQ-113
  it("announces the anecdote it has turned to", async () => {
    const user = userEvent.setup();
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    await user.click(screen.getByRole("button", { name: "Suivant" }));

    expect(
      screen.getByText(`Anecdote 2 sur 3 : ${UNSOURCED.headline}`)
    ).toBeInTheDocument();
  });

  // @req REQ-113
  it("says the bank is empty rather than framing an empty card", () => {
    render(
      <AnecdoteReader
        language="fr"
        deck={[]}
        openingCard={{ fact: SOURCED }}
        loadCards={loadDeckCards}
      />
    );

    expect(screen.getByText(/Aucune anecdote/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suivant" })).toBeNull();
  });
});

describe("The anecdote's two-column band (REQ-113)", () => {
  // The text on one side, the document it talks about on the other. Stacked,
  // the card ran past the fold and buried the controls the reader is meant to
  // reach; side by side it fits on one screen.
  // @req REQ-113
  it("puts the picture on the side the page drew for it", () => {
    const { container, rerender } = render(
      <AnecdoteCard language="fr" fact={SOURCED} imageSide="end" />
    );

    const split = () => container.querySelector(".anecdote-split");
    expect(split()).toHaveClass("anecdote-split--image-end");

    rerender(<AnecdoteCard language="fr" fact={SOURCED} imageSide="start" />);
    expect(split()).toHaveClass("anecdote-split--image-start");
  });

  // The draw is the server's, like the deck's, so the first paint is already
  // the right one. Turning alternates from there rather than re-drawing,
  // which would let three cards in a row land on the same side.
  // @req REQ-113
  it("alternates the picture's side as the reader turns", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AnecdoteReader
        language="fr"
        {...readerProps()}
        openingImageSide="start"
      />
    );

    const sideNow = () =>
      container
        .querySelector(".anecdote-split")
        ?.className.includes("anecdote-split--image-start")
        ? "start"
        : "end";

    expect(sideNow()).toBe("start");
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(sideNow()).toBe("end");
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(sideNow()).toBe("start");
  });
});

describe("Sharing an anecdote (REQ-113)", () => {
  // The native sheet came first and the reader had to dismiss it before the
  // networks appeared — two gestures for one intent, and the second one read
  // as a bug. One press, the choices.
  // @req REQ-113
  it("shows the networks on the first press, never the browser's own sheet", async () => {
    const user = userEvent.setup();
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: nativeShare,
      writable: true,
    });

    render(<AnecdoteReader language="fr" {...readerProps()} />);
    await user.click(screen.getByRole("button", { name: "Partager" }));

    expect(nativeShare).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "WhatsApp" })).toBeInTheDocument();

    delete (window.navigator as { share?: unknown }).share;
  });

  // @req REQ-113
  it("closes the networks when the reader presses Partager again", async () => {
    const user = userEvent.setup();
    render(<AnecdoteReader language="fr" {...readerProps()} />);

    await user.click(screen.getByRole("button", { name: "Partager" }));
    await user.click(screen.getByRole("button", { name: "Partager" }));

    expect(screen.queryByRole("link", { name: "WhatsApp" })).toBeNull();
  });
});
