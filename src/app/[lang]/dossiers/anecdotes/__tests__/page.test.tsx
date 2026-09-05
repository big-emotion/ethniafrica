import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DID_YOU_KNOW_FACTS } from "@/lib/home/didYouKnowFacts";

const readerProps = vi.fn();

vi.mock("@/components/anecdotes", () => ({
  AnecdoteReader: (props: Record<string, unknown>) => {
    readerProps(props);
    return null;
  },
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import AnecdotesPage from "@/app/[lang]/dossiers/anecdotes/page";

async function renderPage(a?: string) {
  readerProps.mockClear();
  render(
    await AnecdotesPage({
      params: Promise.resolve({ lang: "fr" }),
      searchParams: Promise.resolve({ a }),
    })
  );
  return readerProps.mock.calls.at(-1)?.[0] as {
    deck: string[];
    openingCard: { fact: { id: string } };
  };
}

/**
 * What the page sends the browser, rather than what it shows.
 *
 * The page used to shuffle whole facts and hand the array to a client
 * component, so every visit serialised the entire bank — 9 Ko gzipped at
 * twenty-four anecdotes, and the bank is the one part of this surface built
 * to keep growing. The reader who opens one card and leaves paid for all of
 * them. Nothing on the rendered page shows that, which is why it survived
 * three redesigns, and why the assertion is on the payload.
 */
describe("The anecdotes page's payload (REQ-113)", () => {
  // @req REQ-113
  it("sends the reading order as identifiers, not as prose", async () => {
    const props = await renderPage();

    expect(props.deck).toHaveLength(DID_YOU_KNOW_FACTS.length);
    for (const entry of props.deck) expect(typeof entry).toBe("string");
  });

  // @req REQ-113
  it("hydrates exactly the one card it opens on", async () => {
    const props = await renderPage();

    expect(props.openingCard.fact.id).toBe(props.deck[0]);
    expect(JSON.stringify(props).length).toBeLessThan(
      JSON.stringify(DID_YOU_KNOW_FACTS).length / 2
    );
  });

  // A shared link names its anecdote; opening it must not cost the bank
  // either, so the named card leads the order rather than being sought in it.
  // @req REQ-113
  it("opens a shared link on the anecdote it names", async () => {
    const named = DID_YOU_KNOW_FACTS.at(-1)!.id;
    const props = await renderPage(named);

    expect(props.deck[0]).toBe(named);
    expect(props.openingCard.fact.id).toBe(named);
    expect(new Set(props.deck).size).toBe(DID_YOU_KNOW_FACTS.length);
  });
});
