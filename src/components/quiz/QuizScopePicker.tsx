import Link from "next/link";

import { translations } from "@/lib/translations";
import type { QuizScopesData } from "@/api/v2/schemas/quiz";
import { cn } from "@/lib/utils";

const t = translations.fr.quiz;

export interface QuizScopePickerProps {
  scopes: QuizScopesData;
  /** Where the form submits — the quiz page's own path. */
  action: string;
  className?: string;
}

/**
 * Picks the track a session is drawn from: one country, one language family,
 * or the whole corpus.
 *
 * A plain `GET` form, and therefore a server component — the same shape
 * `GameScopePicker` settled on for the games, for the same reason: the session
 * is composed on the server, so choosing a track is a navigation, not a state
 * change, and it works with no JavaScript at all. Converging on that shape is
 * also what lets a chosen track be a page a reader can bookmark, share and come
 * back to, which in turn is what makes the session exit a link rather than a
 * piece of client state.
 *
 * The two components stay separate files because they submit to different
 * routes and name different things, but they are now the same idea; the note in
 * `GameScopePicker` explaining why the *audience* picker could not be reused is
 * about a component that no longer exists.
 *
 * A track that cannot fill a session of eight is rendered, counted and
 * disabled, never hidden. Khoïsan — one people, four questions — is why: a
 * corpus gap the reader can see is a corpus gap someone might fill.
 */
// @req REQ-103 FR66 FR43
export const QuizScopePicker = ({
  scopes,
  action,
  className,
}: QuizScopePickerProps) => {
  const fieldClass =
    "min-h-11 w-full rounded-afh-lg border border-afh-border bg-afh-surface px-3 py-2 text-afh-body text-afh-text";

  // `QuizScopesData` comes from `z.infer`, and with `strictNullChecks: false`
  // zod marks every field optional whatever the schema says. The defaults below
  // are that artefact, not a real absence.
  const optionLabel = (option: QuizScopesData["countries"][number]) =>
    option.playable
      ? `${option.labelFr} — ${option.activeQuestionCount ?? 0} ${t.questionCountPlural}`
      : `${option.labelFr} — ${t.scopeTooThin}`;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <form
        method="get"
        action={action}
        data-testid="quiz-scope-picker"
        className="flex flex-col gap-3 rounded-afh-lg border border-afh-border bg-afh-surface p-4"
      >
        {/* Left on « Tous les pays » / « Toutes les familles » the form
            submits `?pays=&famille=`, which names no track — and the page
            opens a session only when the URL names one, so the reader was
            walked back to this picker. This marker is what makes an
            unfiltered submission a track of its own: the whole corpus,
            climbing the ladder. `mixte` is the API's own word for it. */}
        <input type="hidden" name="mode" value="mixte" />

        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="font-afh-display text-afh-h3 font-bold text-afh-text">
            {t.scopePickerLegend}
          </legend>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="quiz-scope-country"
              className="text-afh-small font-medium text-afh-text-soft"
            >
              {t.scopeCountryLabel}
            </label>
            <select
              id="quiz-scope-country"
              name="pays"
              defaultValue=""
              className={fieldClass}
            >
              <option value="">{t.scopeAnyCountry}</option>
              {scopes.countries.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={!option.playable}
                >
                  {optionLabel(option)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="quiz-scope-family"
              className="text-afh-small font-medium text-afh-text-soft"
            >
              {t.scopeFamilyLabel}
            </label>
            <select
              id="quiz-scope-family"
              name="famille"
              defaultValue=""
              className={fieldClass}
            >
              <option value="">{t.scopeAnyFamily}</option>
              {scopes.families.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={!option.playable}
                >
                  {optionLabel(option)}
                </option>
              ))}
            </select>
          </div>

          {/*
            The third axis, and the one the other two could not stand in for.
            A theme is not a fifth kind of track: it composes with the two
            above, so « les croyances des peuples d'Afrique du Sud » is one
            submission rather than a track the picker would have had to
            enumerate.

            A pair the corpus cannot fill — a small country under a narrow
            theme — is not greyed here, because a `method="get"` form with no
            JavaScript cannot re-evaluate the pair as the reader changes a
            select. It is caught on arrival by the session's empty state, which
            already exists for the same reason.
          */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="quiz-scope-theme"
              className="text-afh-small font-medium text-afh-text-soft"
            >
              {t.scopeThemeLabel}
            </label>
            <select
              id="quiz-scope-theme"
              name="theme"
              defaultValue=""
              className={fieldClass}
            >
              <option value="">{t.scopeAnyTheme}</option>
              {scopes.themes?.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={!option.playable}
                >
                  {optionLabel(option)}
                </option>
              ))}
            </select>
          </div>

          <p className="text-afh-small text-afh-text-soft">{t.scopeHint}</p>

          <button
            type="submit"
            className="min-h-11 w-full rounded-afh-lg px-4 py-2 font-medium"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
          >
            {t.scopeSubmit}
          </button>
        </fieldset>
      </form>

      {/* One card, not two. « Tout le continent » stood here and promised
          the same thing this one does — eight questions off the whole corpus
          — while linking to the bare path, which names no track and so came
          straight back here. The laddered whole-corpus run it meant to offer
          is what the form above now submits when nothing is filtered. */}
      <div className="grid grid-cols-1 gap-3">
        <Link
          href={`${action}?mode=aleatoire`}
          data-testid="quiz-scope-random"
          className="min-h-11 rounded-afh-lg border border-afh-border bg-afh-surface p-4 text-left shadow-afh-1 transition-colors hover:border-primary hover:shadow-afh-2"
        >
          <span className="block font-afh-display text-afh-h3 font-black text-afh-text">
            {scopes.random.labelFr}
          </span>
          <span className="mt-1 block text-afh-small text-afh-text-soft">
            {t.scopeRandomHint}
          </span>
        </Link>
      </div>
    </div>
  );
};

export default QuizScopePicker;
