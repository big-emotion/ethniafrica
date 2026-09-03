import { QuizScopeDeck } from "@/components/quiz/QuizScopeDeck";
import { QuizTrackCard } from "@/components/quiz/QuizTrackCard";
import { translations } from "@/lib/translations";
import type { QuizScopesData } from "@/api/v2/schemas/quiz";
import {
  QUIZ_THEME_SPECIMENS_FR,
  type QuizThemeId,
} from "@/lib/quiz/segmentPolicy";
import { cn } from "@/lib/utils";

const t = translations.fr.quiz;

export interface QuizScopePickerProps {
  scopes: QuizScopesData;
  /** The quiz page's own path — every track is a query on it. */
  action: string;
  className?: string;
}

/**
 * Picks the track a session is drawn from: a theme, a country, a language
 * family, or one of the two whole-corpus runs.
 *
 * **This used to be a `method="get"` form with three selects and a submit.**
 * What that shape bought was one thing — a reader with no JavaScript could
 * cross two axes in a single submission — and what it cost was everything
 * else: three controls and a submit step between arriving and playing, with
 * the one-tap « Au hasard » stranded below the fold. The cards are 88 things
 * to touch at 44 px, each launching a real track on its own, and each still
 * reachable with no JavaScript at all. Only their *intersection* needs the
 * deck (`QuizScopeDeck`), and that is the whole of what a no-JS reader loses.
 *
 * **No count is printed anywhere, deliberately.** Every option carried
 * « — N questions disponibles » and every one that could not fill a session
 * was greyed. Measured against the live bank, all 54 countries, 23 families
 * and 9 themes are playable alone, so nothing was ever greyed and the number
 * was decoration. The real dead ends are in the crossings, which is where
 * `playableThemeIds` now speaks — by offering a theme or not offering it, never
 * by a number.
 */
// @req REQ-103 REQ-121 FR66 FR43
export const QuizScopePicker = ({
  scopes,
  action,
  className,
}: QuizScopePickerProps) => {
  const trackHref = (query: string) => `${action}?${query}`;

  // `QuizScopesData` comes from `z.infer`, and with `strictNullChecks: false`
  // zod marks every field optional whatever the schema says. The defaults here
  // are that artefact, not a real absence.
  const themes = scopes.themes ?? [];
  const countries = scopes.countries ?? [];
  const families = scopes.families ?? [];

  return (
    <div
      className={cn("flex flex-col gap-8", className)}
      data-testid="quiz-scope-picker"
    >
      {/* The two whole-corpus runs come first: they are the shortest way into a
          game, and « Au hasard » used to sit below the form and below the fold.
          « Tout le continent » is back after being deleted once — it had linked
          to the bare path, which names no track and walked the reader straight
          back here. It carries `?mode=mixte` now, which is the marker the
          retired hidden input used to submit. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <QuizTrackCard
          href={trackHref("mode=aleatoire")}
          labelFr={scopes.random?.labelFr ?? ""}
          hintFr={t.scopeRandomHint}
          testId="quiz-scope-random"
        />
        <QuizTrackCard
          href={trackHref("mode=mixte")}
          labelFr={scopes.mixed?.labelFr ?? ""}
          hintFr={t.scopeMixedHint}
          testId="quiz-scope-mixed"
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-afh-display text-afh-h3 font-bold text-afh-text">
          {t.scopeThemeHeading}
        </h2>
        <ul className="grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-3">
          {themes.map((theme) => (
            <li key={theme.id}>
              <QuizTrackCard
                href={trackHref(`theme=${theme.id}`)}
                labelFr={theme.labelFr}
                hintFr={QUIZ_THEME_SPECIMENS_FR[theme.id as QuizThemeId]}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-afh-display text-afh-h3 font-bold text-afh-text">
          {t.scopeCountryHeading}
        </h2>
        <p className="text-afh-small text-afh-text-soft">
          {t.scopeCountryHint}
        </p>
        {/* The one block that hydrates. One column at 430 px:
            « République démocratique du Congo » does not fit two. The order is
            the catalogue's own A–Z sort, kept the service's responsibility. */}
        <QuizScopeDeck
          items={countries.map((country) => ({
            id: country.id,
            labelFr: country.labelFr,
            playableThemeIds: country.playableThemeIds ?? [],
          }))}
          themes={themes.map((theme) => ({
            id: theme.id,
            labelFr: theme.labelFr,
          }))}
          action={action}
          panelHintFr={t.scopeThemePanelHint}
          wholeTrackLabelFr={t.scopeThemePanelNoTheme}
          closeLabelFr={translations.fr.close}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-afh-display text-afh-h3 font-bold text-afh-text">
          {t.scopeFamilyHeading}
        </h2>
        <ul className="grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
          {families.map((family) => (
            <li key={family.id}>
              <QuizTrackCard
                href={trackHref(`famille=${family.id}`)}
                labelFr={family.labelFr}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
