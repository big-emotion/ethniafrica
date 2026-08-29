import type { Metadata } from "next";

import { AnecdoteCard, AnecdotesPagination } from "@/components/anecdotes";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  DID_YOU_KNOW_FACTS,
  paginateDidYouKnowFacts,
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
  searchParams: Promise<{ page?: string }>;
}

/**
 * The whole « Saviez-vous que » bank, as a feed.
 *
 * The home's band shows one fact at a time and lets a reader turn through
 * the deck; that is a hook, and a hook has no URL. This page is what the
 * hook points at: every fact, in the authored order, each addressable by
 * its own anchor and each printing the sources behind it.
 *
 * It sits under Comprendre rather than beside it. Explorer serves a reader
 * who knows what they are looking for and Jouer one who wants to be tested;
 * the anecdote serves the reader who did not know there was anything to
 * know, which is what the third axis is for.
 *
 * The facts are a module in the repo, not rows in a table, so nothing here
 * awaits a query — the page renders from a constant and cannot show the
 * reader an empty atlas because a database was slow.
 */
// @req REQ-113
export default async function AnecdotesPage({
  searchParams,
}: AnecdotesPageProps) {
  const requested = Number.parseInt((await searchParams).page ?? "1", 10);
  const { facts, pageNumber, pageCount } = paginateDidYouKnowFacts(requested);

  return (
    <PageLayout language="fr" title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="anecdotes-page">
        {/* PageLayout accepts `subtitle` and renders nothing with it — the
            prop is vestigial, like `onLanguageChange`. The lede is printed
            here so the page actually says what it holds. */}
        <p className="anecdotes-lede">{PAGE_SUBTITLE}</p>

        <p className="anecdotes-count">
          {`${DID_YOU_KNOW_FACTS.length} anecdotes — page ${pageNumber} sur ${pageCount}`}
        </p>

        {facts.map((fact) => (
          <AnecdoteCard key={fact.id} language="fr" fact={fact} />
        ))}

        <AnecdotesPagination
          basePath={BASE_PATH}
          pageNumber={pageNumber}
          pageCount={pageCount}
        />
      </div>

      <style>{`
        .anecdotes-page {
          max-width: 68ch;
        }
        .anecdotes-lede {
          margin: 0 0 22px;
          max-width: 58ch;
          font-size: var(--afh-text-lead);
          line-height: 1.55;
          color: var(--afh-text-soft);
        }
        .anecdotes-count {
          margin: 0 0 4px;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--afh-text-muted);
        }
      `}</style>
    </PageLayout>
  );
}
