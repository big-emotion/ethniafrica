import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnecdoteCard } from "@/components/anecdotes/AnecdoteCard";
import { AnecdotesPagination } from "@/components/anecdotes/AnecdotesPagination";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import { getCountryRoute, getLocalizedRoute } from "@/lib/routing";

const BASE_PATH = getLocalizedRoute("fr", "anecdotes");

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

  // The feed is meant to be linked into, not just scrolled.
  // @req REQ-113
  it("anchors the fact under its own id", () => {
    const { container } = render(<AnecdoteCard language="fr" fact={SOURCED} />);

    expect(container.querySelector("#cameroun")).not.toBeNull();
  });
});

describe("AnecdotesPagination — pages a reader can share (REQ-113)", () => {
  // @req REQ-113
  it("gives page one the bare path so the module has one canonical URL", () => {
    render(
      <AnecdotesPagination basePath={BASE_PATH} pageNumber={2} pageCount={3} />
    );

    expect(screen.getByRole("link", { name: "Page 1 sur 3" })).toHaveAttribute(
      "href",
      BASE_PATH
    );
    expect(screen.getByRole("link", { name: "Page 2 sur 3" })).toHaveAttribute(
      "href",
      `${BASE_PATH}?page=2`
    );
  });

  // @req REQ-113
  it("marks the page being read", () => {
    render(
      <AnecdotesPagination basePath={BASE_PATH} pageNumber={2} pageCount={3} />
    );

    expect(screen.getByRole("link", { name: "Page 2 sur 3" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  // @req REQ-113
  it("drops the step that would leave the range", () => {
    const first = render(
      <AnecdotesPagination basePath={BASE_PATH} pageNumber={1} pageCount={3} />
    );
    expect(screen.queryByRole("link", { name: "Page précédente" })).toBeNull();
    first.unmount();

    render(
      <AnecdotesPagination basePath={BASE_PATH} pageNumber={3} pageCount={3} />
    );
    expect(screen.queryByRole("link", { name: "Page suivante" })).toBeNull();
  });

  // Three dead controls telling the reader there is more, when there is not.
  // @req REQ-113
  it("renders no pager at all for a single page", () => {
    const { container } = render(
      <AnecdotesPagination basePath={BASE_PATH} pageNumber={1} pageCount={1} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-113
  it("lists one link per page", () => {
    render(
      <AnecdotesPagination basePath={BASE_PATH} pageNumber={1} pageCount={3} />
    );

    const nav = screen.getByRole("navigation", { name: "Pages d'anecdotes" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
  });
});
