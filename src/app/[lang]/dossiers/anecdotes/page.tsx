import type { Metadata } from "next";

import { AnecdoteReader } from "@/components/anecdotes";
import { PageLayout } from "@/components/layout/PageLayout";
import { shuffleAnecdoteOrder } from "@/lib/home/anecdoteDeck";
import {
  DID_YOU_KNOW_FACTS,
  findDidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";
import { illustrationFor } from "@/lib/home/didYouKnowIllustrations";
import { drawAnecdoteImageSide } from "@/lib/home/didYouKnowPresentation";
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
  const drawn = shuffleAnecdoteOrder(DID_YOU_KNOW_FACTS.map((fact) => fact.id));
  // The named anecdote leads the order rather than being sought inside it, so
  // the reader always opens at the first card and the page has exactly one
  // card to serialise.
  const deck = named
    ? [named.id, ...drawn.filter((id) => id !== named.id)]
    : drawn;
  const opening = named ?? findDidYouKnowFact(deck[0]);
  // Drawn here for the same reason the order is: a coin tossed in the client
  // would flip the band a frame after paint. The reader alternates from it.
  const openingImageSide = drawAnecdoteImageSide();

  return (
    <PageLayout language="fr" title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="anecdotes-page">
        <p className="anecdotes-count">
          {`${DID_YOU_KNOW_FACTS.length} anecdotes — une à la fois, tirée au hasard`}
        </p>

        {opening ? (
          <AnecdoteReader
            language="fr"
            deck={deck}
            openingCard={{
              fact: opening,
              illustration: illustrationFor(opening.id),
            }}
            openingImageSide={openingImageSide}
          />
        ) : (
          <p className="anecdote-empty">
            Aucune anecdote n&apos;est publiée pour le moment.
          </p>
        )}
      </div>

      <style>{`
        .anecdotes-page {
          max-width: 68ch;
          margin: 0 auto;
        }
        /* The box has to open with the card: a measure meant for one column
           of prose would hold the two-column band at half the width it asks
           for, and the reader would get the shorter card without the wider
           picture that pays for it. */
        @media (min-width: 768px) {
          .anecdotes-page {
            max-width: 1040px;
          }
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
