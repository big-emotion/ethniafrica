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

      <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
        <Link
          href={action}
          data-testid="quiz-scope-mixed"
          className="min-h-11 rounded-afh-lg border border-afh-border bg-afh-surface p-4 text-left shadow-afh-1 transition-colors hover:border-primary hover:shadow-afh-2"
        >
          <span className="block font-afh-display text-afh-h3 font-black text-afh-text">
            {scopes.mixed.labelFr}
          </span>
          <span className="mt-1 block text-afh-small text-afh-text-soft">
            {t.scopeMixedHint}
          </span>
        </Link>
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
