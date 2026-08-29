import type { Metadata } from "next";

import { AnecdoteReader } from "@/components/anecdotes";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  DID_YOU_KNOW_FACTS,
  findDidYouKnowFact,
  shuffleDidYouKnowDeck,
} from "@/lib/home/didYouKnowFacts";
import { getLocalizedRoute } from "@/lib/routing";

const PAGE_TITLE = "Anecdotes";
const PAGE_SUBTITLE =
  "Des noms d'Afrique pris un par un : qui les a donnés, quand, et ce qu'ils recouvraient.";

const BASE_PATH = getLocalizedRoute("fr", "anecdotes");

// @req REQ-113
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_SUBTITLE,
  alternates: { canonical: BASE_PATH },
};

interface AnecdotesPageProps {
  searchParams: Promise<{ a?: string }>;
}

/**
 * The « Saviez-vous que » bank, read one card at a time.
 *
 * The home's band shows one fact and lets a reader turn through the deck;
 * that is a hook, and a hook has no URL. This page is what the hook points
 * at — and, since it stopped being a paginated feed, it reads the way the
 * band does rather than the way an archive does: a picture, a fact, and four
 * things to do with it.
 *
 * The draw runs here rather than in the reader. The app renders dynamically,
 * so a shuffle at request time gives every visit a different opening card
 * with no second render and no hydration mismatch — the same reasoning the
 * band's own draw rests on. `?a=<id>` overrides the opening card, which is
 * what makes a shared link land on the anecdote it promised.
 *
 * The facts are a module in the repo, not rows in a table, so nothing here
 * awaits a query — the page renders from a constant and cannot show the
 * reader an empty atlas because a database was slow.
 */
// @req REQ-113
export default async function AnecdotesPage({
  searchParams,
}: AnecdotesPageProps) {
  const requested = (await searchParams).a ?? null;
  // A link naming a retired fact opens on a fresh draw rather than a 404:
  // the address still points at a page that has something to say.
  const named = findDidYouKnowFact(requested);
  const deck = shuffleDidYouKnowDeck();

  return (
    <PageLayout language="fr" title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="anecdotes-page">
        {/* PageLayout accepts `subtitle` and renders nothing with it — the
            prop is vestigial, like `onLanguageChange`. The lede is printed
            here so the page actually says what it holds. */}
        <p className="anecdotes-lede">{PAGE_SUBTITLE}</p>

        <p className="anecdotes-count">
          {`${DID_YOU_KNOW_FACTS.length} anecdotes — une à la fois, tirée au hasard`}
        </p>

        <AnecdoteReader
          language="fr"
          deck={deck}
          initialFactId={named?.id ?? null}
        />
      </div>

      <style>{`
        .anecdotes-page {
          max-width: 68ch;
          margin: 0 auto;
        }
        .anecdotes-lede {
          margin: 0 auto 14px;
          max-width: 58ch;
          text-align: center;
          font-size: var(--afh-text-lead);
          line-height: 1.55;
          color: var(--afh-text-soft);
        }
        .anecdotes-count {
          margin: 0 0 26px;
          text-align: center;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--afh-fg-muted);
        }
      `}</style>
    </PageLayout>
  );
}
