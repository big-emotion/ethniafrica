"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type FlagKind =
  | "inaccurate"
  | "missing-source"
  | "broken-url"
  | "offensive"
  | "correction-proposal"
  | "other";

export interface FlagFormTarget {
  type: string;
  id: string;
  /**
   * What the reporter calls this thing — the people's or country's name. The
   * dialog used to identify the target by `id` alone, so a reader was asked to
   * confirm they were reporting "PPL_YORUBA". The id still travels in the
   * payload, where the moderator needs it.
   */
  name?: string;
  fieldPath?: string;
  /**
   * The rubric's own heading, worded by whoever mounted the trigger — they are
   * the ones who know what the section is called. Without it the dialog names
   * no field rather than printing `fieldPath`, which is a schema path.
   */
  fieldLabel?: string;
  snapshotQuote?: string;
}

export interface FlagSubmissionPayload {
  target_type: string;
  target_id: string;
  target_field_path?: string;
  flag_kind: FlagKind;
  reason_text: string;
  counter_source_url?: string;
  counter_source_citation?: string;
  proposed_rewrite?: string;
  turnstile_token: string;
}

export interface FlagFormProps {
  target: FlagFormTarget;
  onSubmit: (
    payload: FlagSubmissionPayload
  ) => Promise<{ public_slug: string }>;
  onCancel: () => void;
  renderTurnstile?: (callbacks: {
    onVerify: (token: string) => void;
    onError: () => void;
    onExpire: () => void;
  }) => ReactNode;
}

interface FormErrors {
  kind?: string;
  sources?: string;
  counterSourceUrl?: string;
  counterSourceCitation?: string;
  proposedRewrite?: string;
  reason?: string;
}

const FLAG_KINDS: ReadonlyArray<{ value: FlagKind; label: string }> = [
  { value: "inaccurate", label: "Contenu inexact" },
  { value: "missing-source", label: "Source manquante" },
  { value: "broken-url", label: "Lien cassé" },
  { value: "offensive", label: "Contenu offensant" },
  { value: "correction-proposal", label: "Proposition de correction" },
  { value: "other", label: "Autre" },
];

// Every target type the triggers mount, so the fallback below never has to
// print the raw enum value — `fiche_section` on a dialog is the database's
// vocabulary, not the reader's.
const TARGET_LABELS: Record<string, string> = {
  people: "Peuple",
  country: "Pays",
  language: "Langue",
  language_family: "Famille linguistique",
  fiche_section: "Section de fiche",
  assertion: "Affirmation",
  source: "Source",
};

const SOURCE_REQUIRED_KINDS: ReadonlyArray<FlagKind> = [
  "inaccurate",
  "missing-source",
  "correction-proposal",
];

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateForm({
  kind,
  counterSourceUrl,
  counterSourceCitation,
  proposedRewrite,
  reason,
}: {
  kind: FlagKind | "";
  counterSourceUrl: string;
  counterSourceCitation: string;
  proposedRewrite: string;
  reason: string;
}): FormErrors {
  const errors: FormErrors = {};

  if (!kind) {
    errors.kind = "Choisissez un type de signalement.";
    return errors;
  }

  if (
    SOURCE_REQUIRED_KINDS.includes(kind) &&
    !counterSourceUrl.trim() &&
    !counterSourceCitation.trim()
  ) {
    errors.sources = "Une source ou une citation est requise.";
  }

  if (counterSourceUrl.trim() && !isValidHttpUrl(counterSourceUrl.trim())) {
    errors.counterSourceUrl = "Saisissez une adresse HTTP ou HTTPS valide.";
  }

  if (counterSourceCitation.length > 2000) {
    errors.counterSourceCitation =
      "La citation ne peut pas dépasser 2 000 caractères.";
  }

  if (kind === "correction-proposal" && !proposedRewrite.trim()) {
    errors.proposedRewrite = "La proposition de correction est requise.";
  }

  if (reason.trim().length < 50 || reason.length > 2000) {
    errors.reason = "La raison doit contenir entre 50 et 2 000 caractères.";
  }

  return errors;
}

// @req REQ-012
export function FlagForm({
  target,
  onSubmit,
  onCancel,
  renderTurnstile,
}: FlagFormProps) {
  const idPrefix = useId();
  const [kind, setKind] = useState<FlagKind | "">("");
  const [counterSourceUrl, setCounterSourceUrl] = useState("");
  const [counterSourceCitation, setCounterSourceCitation] = useState("");
  const [proposedRewrite, setProposedRewrite] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);

  const kindErrorId = `${idPrefix}-kind-error`;
  const sourceRequirementId = `${idPrefix}-sources-requirement`;
  const sourcesErrorId = `${idPrefix}-sources-error`;
  const counterSourceUrlErrorId = `${idPrefix}-counter-source-url-error`;
  const counterSourceCitationErrorId = `${idPrefix}-counter-source-citation-error`;
  const proposedRewriteId = `${idPrefix}-proposed-rewrite`;
  const proposedRewriteCounterId = `${idPrefix}-proposed-rewrite-counter`;
  const proposedRewriteErrorId = `${idPrefix}-proposed-rewrite-error`;
  const counterSourceUrlId = `${idPrefix}-counter-source-url`;
  const counterSourceCitationId = `${idPrefix}-counter-source-citation`;
  const reasonId = `${idPrefix}-reason`;
  const reasonCounterId = `${idPrefix}-reason-counter`;
  const reasonErrorId = `${idPrefix}-reason-error`;
  const turnstileHeadingId = `${idPrefix}-turnstile-heading`;
  const turnstileErrorId = `${idPrefix}-turnstile-error`;
  const sourceIsRequired = Boolean(
    kind && SOURCE_REQUIRED_KINDS.includes(kind)
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm({
      kind,
      counterSourceUrl,
      counterSourceCitation,
      proposedRewrite,
      reason,
    });
    setErrors(nextErrors);

    if (!turnstileToken) {
      setTurnstileError(turnstileError || "Validez le contrôle anti-robot.");
    }

    if (!kind || Object.keys(nextErrors).length > 0 || !turnstileToken) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const result = await onSubmit({
        target_type: target.type,
        target_id: target.id,
        ...(target.fieldPath ? { target_field_path: target.fieldPath } : {}),
        flag_kind: kind,
        reason_text: reason.trim(),
        ...(counterSourceUrl.trim()
          ? { counter_source_url: counterSourceUrl.trim() }
          : {}),
        ...(counterSourceCitation.trim()
          ? { counter_source_citation: counterSourceCitation.trim() }
          : {}),
        ...(kind === "correction-proposal" && proposedRewrite.trim()
          ? { proposed_rewrite: proposedRewrite.trim() }
          : {}),
        turnstile_token: turnstileToken,
      });
      setPublicSlug(result.public_slug);
    } catch {
      setTurnstileToken("");
      setTurnstileError("Validez de nouveau le contrôle anti-robot.");
      setTurnstileAttempt((attempt) => attempt + 1);
      setSubmissionError("L’envoi du signalement a échoué. Réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (publicSlug) {
    return (
      <section
        aria-labelledby={`${idPrefix}-success-heading`}
        className="w-full space-y-afh-4xl rounded-afh-lg border border-afh-border bg-afh-surface p-afh-2xl text-afh-text shadow-afh-1 md:p-afh-5xl min-[1200px]:p-afh-6xl"
        role="status"
      >
        <h2
          className="font-afh-display text-afh-h3 font-semibold text-afh-conf-high"
          id={`${idPrefix}-success-heading`}
        >
          Signalement enregistré
        </h2>
        <p className="text-afh-body">
          Merci — vous recevrez un email quand la modération aura tranché.
        </p>
        <a
          className="inline-flex min-h-11 items-center font-semibold text-afh-terracotta underline underline-offset-4"
          href={`/fr/signalements/${publicSlug}`}
        >
          Consulter le signalement
        </a>
      </section>
    );
  }

  return (
    <form
      className="w-full space-y-afh-5xl rounded-afh-lg border border-afh-border bg-afh-surface p-afh-2xl text-afh-text shadow-afh-1 md:p-afh-5xl min-[1200px]:p-afh-6xl"
      noValidate
      onSubmit={handleSubmit}
    >
      <section aria-labelledby={`${idPrefix}-target-heading`}>
        <h2
          className="font-afh-display text-afh-h3 font-semibold"
          id={`${idPrefix}-target-heading`}
        >
          Élément signalé
        </h2>
        <p className="mt-afh-md text-afh-small text-afh-text-soft">
          {TARGET_LABELS[target.type] ?? target.type}
          {target.name ? ` · ${target.name}` : ""}
        </p>
        {target.fieldLabel && (
          <p className="mt-afh-xs text-afh-caption text-afh-fg-muted">
            {target.fieldLabel}
          </p>
        )}
        {target.snapshotQuote && (
          <blockquote className="mt-afh-lg border-l-4 border-afh-terracotta bg-afh-bg px-afh-lg py-afh-md text-afh-body">
            {target.snapshotQuote}
          </blockquote>
        )}
      </section>

      <fieldset
        aria-describedby={errors.kind ? kindErrorId : undefined}
        className="space-y-afh-lg"
      >
        <legend className="text-afh-body font-semibold">
          Type de signalement
        </legend>
        <div className="grid gap-afh-md md:grid-cols-2">
          {FLAG_KINDS.map((option) => {
            const optionId = `${idPrefix}-kind-${option.value}`;
            return (
              <label
                className="flex min-h-11 cursor-pointer items-center gap-afh-lg rounded-afh-md border border-afh-border px-afh-lg py-afh-md text-afh-body focus-within:ring-2 focus-within:ring-afh-terracotta"
                htmlFor={optionId}
                key={option.value}
              >
                <input
                  checked={kind === option.value}
                  className="size-4 accent-[var(--afh-terracotta)]"
                  id={optionId}
                  name="flag_kind"
                  onChange={() => {
                    setKind(option.value);
                    setErrors({});
                  }}
                  required
                  type="radio"
                  value={option.value}
                />
                {option.label}
              </label>
            );
          })}
        </div>
        {errors.kind && (
          <p
            className="text-afh-small text-afh-flag-open"
            id={kindErrorId}
            role="alert"
          >
            {errors.kind}
          </p>
        )}
      </fieldset>

      {kind && (
        <fieldset
          aria-describedby={[
            sourceRequirementId,
            errors.sources ? sourcesErrorId : "",
          ]
            .filter(Boolean)
            .join(" ")}
          className="space-y-afh-lg"
        >
          <legend className="text-afh-body font-semibold">
            Sources à l’appui
          </legend>
          <p
            className="text-afh-small text-afh-text-soft"
            id={sourceRequirementId}
          >
            {sourceIsRequired
              ? "Ajoutez au moins un lien ou une citation."
              : "Ajoutez un lien ou une citation si vous en disposez."}
          </p>
          <div className="space-y-afh-md">
            <Label htmlFor={counterSourceUrlId}>Lien de la contre-source</Label>
            <Input
              aria-describedby={[
                sourceRequirementId,
                errors.sources ? sourcesErrorId : "",
                errors.counterSourceUrl ? counterSourceUrlErrorId : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-invalid={Boolean(errors.counterSourceUrl)}
              id={counterSourceUrlId}
              onChange={(event) => {
                setCounterSourceUrl(event.target.value);
                setErrors((current) => ({
                  ...current,
                  sources: undefined,
                  counterSourceUrl: undefined,
                }));
              }}
              type="url"
              value={counterSourceUrl}
            />
            {errors.counterSourceUrl && (
              <p
                className="text-afh-small text-afh-flag-open"
                id={counterSourceUrlErrorId}
                role="alert"
              >
                {errors.counterSourceUrl}
              </p>
            )}
          </div>
          <div className="space-y-afh-md">
            <Label htmlFor={counterSourceCitationId}>
              Citation de la contre-source
            </Label>
            <Textarea
              aria-describedby={[
                sourceRequirementId,
                errors.sources ? sourcesErrorId : "",
                errors.counterSourceCitation
                  ? counterSourceCitationErrorId
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-invalid={Boolean(errors.counterSourceCitation)}
              id={counterSourceCitationId}
              maxLength={2000}
              onChange={(event) => {
                setCounterSourceCitation(event.target.value);
                setErrors((current) => ({
                  ...current,
                  sources: undefined,
                  counterSourceCitation: undefined,
                }));
              }}
              value={counterSourceCitation}
            />
            {errors.counterSourceCitation && (
              <p
                className="text-afh-small text-afh-flag-open"
                id={counterSourceCitationErrorId}
                role="alert"
              >
                {errors.counterSourceCitation}
              </p>
            )}
          </div>
          {errors.sources && (
            <p
              className="text-afh-small text-afh-flag-open"
              id={sourcesErrorId}
              role="alert"
            >
              {errors.sources}
            </p>
          )}
        </fieldset>
      )}

      {kind === "correction-proposal" && (
        <div className="space-y-afh-md">
          <Label htmlFor={proposedRewriteId}>Proposition de correction</Label>
          <Textarea
            aria-describedby={`${proposedRewriteCounterId}${
              errors.proposedRewrite ? ` ${proposedRewriteErrorId}` : ""
            }`}
            aria-invalid={Boolean(errors.proposedRewrite)}
            id={proposedRewriteId}
            maxLength={5000}
            onChange={(event) => setProposedRewrite(event.target.value)}
            required
            value={proposedRewrite}
          />
          <p
            className="text-right text-afh-caption text-afh-fg-muted"
            id={proposedRewriteCounterId}
          >
            {proposedRewrite.length.toLocaleString("fr-FR")} / 5 000
          </p>
          {errors.proposedRewrite && (
            <p
              className="text-afh-small text-afh-flag-open"
              id={proposedRewriteErrorId}
              role="alert"
            >
              {errors.proposedRewrite}
            </p>
          )}
        </div>
      )}

      {kind && (
        <div className="space-y-afh-md">
          <Label htmlFor={reasonId}>Raison du signalement</Label>
          <Textarea
            aria-describedby={`${reasonCounterId}${
              errors.reason ? ` ${reasonErrorId}` : ""
            }`}
            aria-invalid={Boolean(errors.reason)}
            id={reasonId}
            maxLength={2000}
            minLength={50}
            onChange={(event) => setReason(event.target.value)}
            required
            value={reason}
          />
          <p
            className="text-right text-afh-caption text-afh-fg-muted"
            id={reasonCounterId}
          >
            {reason.length.toLocaleString("fr-FR")} / 2 000
          </p>
          {errors.reason && (
            <p
              className="text-afh-small text-afh-flag-open"
              id={reasonErrorId}
              role="alert"
            >
              {errors.reason}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-afh-lg md:flex-row md:justify-end">
        <Button
          className="min-h-11"
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Annuler
        </Button>
        <Button className="min-h-11" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Envoi en cours…" : "Envoyer"}
        </Button>
      </div>

      <section
        aria-describedby={turnstileError ? turnstileErrorId : undefined}
        aria-labelledby={turnstileHeadingId}
        className="space-y-afh-md"
      >
        <h3 className="text-afh-body font-semibold" id={turnstileHeadingId}>
          Vérification anti-robot
        </h3>
        {renderTurnstile ? (
          <div key={turnstileAttempt}>
            {renderTurnstile({
              onVerify: (token) => {
                setTurnstileToken(token);
                setTurnstileError("");
              },
              onError: () => {
                setTurnstileToken("");
                setTurnstileError(
                  "Le contrôle anti-robot a échoué. Réessayez."
                );
                setTurnstileAttempt((attempt) => attempt + 1);
              },
              onExpire: () => {
                setTurnstileToken("");
                setTurnstileError(
                  "Le contrôle anti-robot a expiré. Recommencez."
                );
                setTurnstileAttempt((attempt) => attempt + 1);
              },
            })}
          </div>
        ) : (
          <p className="text-afh-small text-afh-text-soft">
            Le contrôle anti-robot sera chargé ici.
          </p>
        )}
        {turnstileError && (
          <p
            className="text-afh-small text-afh-flag-open"
            id={turnstileErrorId}
            role="alert"
          >
            {turnstileError}
          </p>
        )}
      </section>

      {submissionError && (
        <p className="text-afh-small text-afh-flag-open" role="alert">
          {submissionError}
        </p>
      )}
    </form>
  );
}
