import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { QuizPlayHost } from "@/components/quiz/QuizPlayHost";
import { QuizScopePicker } from "@/components/quiz/QuizScopePicker";
import { describeScope, getQuizScopesHandler } from "@/api/v2/handlers/quiz";
import { parseQuizScope } from "@/lib/quiz/quizScope";
import { translations } from "@/lib/translations";

const t = translations.fr.quiz;

const QUIZ_PATH = "/fr/quiz";

interface QuizPageProps {
  /** `?pays=GHA` · `?famille=FLG_…` · `?mode=aleatoire` — the track being played. */
  searchParams: Promise<{ pays?: string; famille?: string; mode?: string }>;
}

// @req REQ-103 FR66
export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.pageSubtitle,
  alternates: {
    canonical: QUIZ_PATH,
  },
};

/**
 * The picker when the URL names no track, the session when it does.
 *
 * The track rides in the query string rather than in component state, the way
 * the games' scoped sessions already do: a narrowed session becomes a page that
 * can be bookmarked, shared and — the part that was missing — left. `/fr/quiz`
 * with no parameters is both the entry point and the way out.
 */
// @req REQ-103 FR66 FR43 AR39
export default async function QuizPage({ searchParams }: QuizPageProps) {
  const query = await searchParams;
  const asked = parseQuizScope(query);

  // Only an explicit track opens a session. Landing on the bare page means the
  // reader has not chosen yet, so `mixed` — the default a scope parses to —
  // must not launch on its own; it is a card in the picker like any other.
  const chose = Boolean(query.pays || query.famille || query.mode);
  const scope = chose ? await describeScope(asked) : null;

  if (scope) {
    return (
      <PageLayout language="fr" title={t.pageTitle} subtitle={scope.labelFr}>
        <QuizPlayHost
          scope={asked}
          scopeLabelFr={scope.labelFr}
          exitHref={QUIZ_PATH}
        />
      </PageLayout>
    );
  }

  // No gate on an empty bank. A track holding nothing is not a missing page:
  // the picker disables what cannot fill a session and says why, which is an
  // honest empty state rather than a 404 on a route that exists. A query naming
  // a country the corpus does not hold falls through to the picker for the same
  // reason.
  const envelope = await getQuizScopesHandler();

  return (
    <PageLayout language="fr" title={t.pageTitle} subtitle={t.pageSubtitle}>
      <QuizScopePicker scopes={envelope.data} action={QUIZ_PATH} />
    </PageLayout>
  );
}
