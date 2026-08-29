import type { GameScope } from "@/lib/games/corpus";
import type { GameScopeChoices } from "@/api/v2/handlers/games";
import { cn } from "@/lib/utils";

const COPY_FR = {
  legend: "Composer la partie",
  countryLabel: "Pays",
  familyLabel: "Famille linguistique",
  anyCountry: "Tous les pays",
  anyFamily: "Toutes les familles",
  submit: "Lancer cette sélection",
  hint: "Une partie sur un seul pays ou une seule famille pose des questions plus serrées : les mauvaises réponses y sont toutes plausibles.",
} as const;

export interface GameScopePickerProps {
  choices: GameScopeChoices;
  scope: GameScope | null;
  /** The game's own path — where the form submits its two query parameters. */
  action: string;
  className?: string;
}

/**
 * Narrows a session to one country or one language family (charter §10 step 5).
 *
 * A plain `GET` form, and therefore a server component: the rounds are built
 * on the server, so picking a scope is a navigation, not a state change. That
 * also means the picker works with no JavaScript at all, which no amount of
 * client-side filtering would have bought.
 *
 * `QuizSegmentPicker` was the obvious thing to reuse and turned out not to be:
 * its segments were *audiences* — children, teens, adults — not places or
 * families. **That is no longer true.** The quiz dropped the audience axis and
 * is now scoped by country or family exactly as this is, through
 * `QuizScopePicker`, which is this component's shape submitted to a different
 * route: a `GET` form of two selects, defaults meaning "no filter", and a
 * chosen scope that lives in the URL.
 *
 * They stay two files rather than one parameterised picker. The pair share a
 * shape, not a contract: this one narrows a corpus the page has already loaded
 * and cannot say how many rounds a choice yields, while the quiz's reads
 * per-track counts off the question bank and disables a track that cannot fill
 * a session. Folding them together would mean one component carrying both, and
 * the note above is what that costs when the assumption underneath moves.
 */
// @req REQ-120
export const GameScopePicker = ({
  choices,
  scope,
  action,
  className,
}: GameScopePickerProps) => {
  const fieldClass =
    "min-h-11 w-full rounded-afh-lg border border-afh-border bg-afh-surface px-3 py-2 text-afh-body text-afh-text";

  return (
    <form
      method="get"
      action={action}
      data-testid="game-scope-picker"
      className={cn(
        "flex flex-col gap-3 rounded-afh-lg border border-afh-border bg-afh-surface p-4",
        className
      )}
    >
      <fieldset className="flex flex-col gap-3 border-0 p-0">
        <legend className="font-afh-display text-afh-h3 font-bold text-afh-text">
          {COPY_FR.legend}
        </legend>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="game-scope-country"
            className="text-afh-small font-medium text-afh-text-soft"
          >
            {COPY_FR.countryLabel}
          </label>
          <select
            id="game-scope-country"
            name="pays"
            defaultValue={scope?.countryId ?? ""}
            className={fieldClass}
          >
            <option value="">{COPY_FR.anyCountry}</option>
            {choices.countries.map((option) => (
              <option key={option.id} value={option.id}>
                {option.labelFr}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="game-scope-family"
            className="text-afh-small font-medium text-afh-text-soft"
          >
            {COPY_FR.familyLabel}
          </label>
          <select
            id="game-scope-family"
            name="famille"
            defaultValue={scope?.familyId ?? ""}
            className={fieldClass}
          >
            <option value="">{COPY_FR.anyFamily}</option>
            {choices.families.map((option) => (
              <option key={option.id} value={option.id}>
                {option.labelFr}
              </option>
            ))}
          </select>
        </div>

        <p className="text-afh-small text-afh-text-soft">{COPY_FR.hint}</p>

        <button
          type="submit"
          className="min-h-11 w-full rounded-afh-lg px-4 py-2 font-medium"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-foreground)",
          }}
        >
          {COPY_FR.submit}
        </button>
      </fieldset>
    </form>
  );
};

export default GameScopePicker;
