import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { QuizPlayHost } from "@/components/quiz/QuizPlayHost";
import { QuizScopePicker } from "@/components/quiz/QuizScopePicker";
import { describeScope, getQuizScopesHandler } from "@/api/v2/handlers/quiz";
import { parseQuizScope } from "@/lib/quiz/quizScope";
import { getLocalizedRoute } from "@/lib/routing";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { translations } from "@/lib/translations";

const t = translations.fr.quiz;

const QUIZ_PATH = getLocalizedRoute("fr", "quiz");

interface QuizPageProps {
  /**
   * `?pays=GHA` · `?famille=FLG_…` · `?mode=aleatoire` — the track being
   * played — and `?theme=croyances`, which narrows any of them by domain of
   * content rather than replacing them.
   */
  searchParams: Promise<{
    pays?: string;
    famille?: string;
    mode?: string;
    theme?: string;
  }>;
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
  // A theme on its own is a choice too: « les croyances », over the whole
  // corpus, is a track. Leaving it out here dropped a themed URL back onto the
  // picker with the reader's choice silently discarded.
  const chose = Boolean(
    query.pays || query.famille || query.mode || query.theme
  );
  const scope = chose ? await describeScope(asked) : null;

  if (scope) {
    return (
      <PageLayout language="fr" title={t.pageTitle} subtitle={scope.labelFr}>
        {/* The axis accent, bound here for the reason spelled out in
            src/app/[lang]/jeux/[jeu]/page.tsx: a quiz page is not a hub, so
            nothing else on the route binds `--accent` and it fell through to
            the bare shadcn HSL triplet that shares the name. Every card's
            hover tint and every `variant="accent"` control on this surface
            read it. */}
        <div className={ACCENT_BY_ACCESS_MODE.jeux}>
          <QuizPlayHost
            scope={asked}
            theme={query.theme ?? null}
            scopeLabelFr={scope.labelFr}
            exitHref={QUIZ_PATH}
          />
        </div>
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
      <div className={ACCENT_BY_ACCESS_MODE.jeux}>
        <QuizScopePicker scopes={envelope.data} action={QUIZ_PATH} />
      </div>
    </PageLayout>
  );
}
