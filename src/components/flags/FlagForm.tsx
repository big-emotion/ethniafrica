"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Proof as AntibotProof } from "@/lib/antibot/proofOfWork";

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
  antibot: AntibotProof;
  /** Always empty. Present so a bot that fills every field gives itself away. */
  website?: string;
  /** How long the form was open. A submission in under three seconds is not a reader. */
  elapsedMs?: number;
}

export interface FlagFormProps {
  target: FlagFormTarget;
  onSubmit: (
    payload: FlagSubmissionPayload
  ) => Promise<{ public_slug: string }>;
  onCancel: () => void;
  /**
   * The anti-bot control, injected rather than imported.
   *
   * The form has never known which control it renders — it was a render prop
   * under Turnstile too, which is why replacing Cloudflare cost this file a
   * type and not a rewrite.
   */
  renderVerification?: (callbacks: {
    onSolved: (proof: AntibotProof) => void;
    onFailed: () => void;
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

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * What kind of report this is, read off what the reader supplied.
 *
 * It used to be their first decision: six categories, required, before a word
 * could be written — and the choice then imposed further mandatory fields, so
 * picking "source manquante" obliged the reader to supply the source they had
 * just said was missing. The reader states the problem; the atlas files it,
 * and a moderator confirms or overrides at triage (moderation charter §1).
 */
// @req REQ-012
export function deriveFlagKind({
  counterSourceUrl,
  counterSourceCitation,
  proposedRewrite,
}: {
  counterSourceUrl: string;
  counterSourceCitation: string;
  proposedRewrite: string;
}): FlagKind {
  if (proposedRewrite.trim()) return "correction-proposal";
  if (counterSourceUrl.trim() || counterSourceCitation.trim())
    return "missing-source";
  return "other";
}

function validateForm({
  counterSourceUrl,
  counterSourceCitation,
  reason,
}: {
  counterSourceUrl: string;
  counterSourceCitation: string;
  proposedRewrite: string;
  reason: string;
}): FormErrors {
  const errors: FormErrors = {};

  // Only what the reader actually opened can be wrong. A collapsed panel they
  // never touched cannot hold an error.
  if (counterSourceUrl.trim() && !isValidHttpUrl(counterSourceUrl.trim())) {
    errors.counterSourceUrl = "Saisissez une adresse HTTP ou HTTPS valide.";
  }

  if (counterSourceCitation.length > 2000) {
    errors.counterSourceCitation =
      "La citation ne peut pas dépasser 2 000 caractères.";
  }

  // Ten, not fifty. The API has always accepted ten (`reason_text` min(10)),
  // and the form asked for five times that without saying why — enough to
  // turn "l'orthographe de Bété est fausse" into a validation error.
  if (reason.trim().length < 10 || reason.length > 2000) {
    errors.reason =
      "La description doit contenir entre 10 et 2 000 caractères.";
  }

  return errors;
}

// @req REQ-012
export function FlagForm({
  target,
  onSubmit,
  onCancel,
  renderVerification,
}: FlagFormProps) {
  const idPrefix = useId();
  const [counterSourceUrl, setCounterSourceUrl] = useState("");
  const [counterSourceCitation, setCounterSourceCitation] = useState("");
  const [proposedRewrite, setProposedRewrite] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [proof, setProof] = useState<AntibotProof | null>(null);
  const [verificationError, setVerificationError] = useState("");
  // Set once, when the form mounts: the reader opened it now, and how long
  // they take from here is the signal.
  const [openedAt] = useState(() => Date.now());
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");

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
  const verificationErrorId = `${idPrefix}-verification-error`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm({
      counterSourceUrl,
      counterSourceCitation,
      proposedRewrite,
      reason,
    });
    setErrors(nextErrors);

    if (!proof) {
      setVerificationError(
        verificationError ||
          "La vérification anti-robot n'est pas terminée. Patientez un instant."
      );
    }

    if (Object.keys(nextErrors).length > 0 || !proof) {
      return;
    }

    const derivedKind = deriveFlagKind({
      counterSourceUrl,
      counterSourceCitation,
      proposedRewrite,
    });

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const result = await onSubmit({
        target_type: target.type,
        target_id: target.id,
        ...(target.fieldPath ? { target_field_path: target.fieldPath } : {}),
        flag_kind: derivedKind,
        reason_text: reason.trim(),
        ...(counterSourceUrl.trim()
          ? { counter_source_url: counterSourceUrl.trim() }
          : {}),
        ...(counterSourceCitation.trim()
          ? { counter_source_citation: counterSourceCitation.trim() }
          : {}),
        ...(proposedRewrite.trim()
          ? { proposed_rewrite: proposedRewrite.trim() }
          : {}),
        antibot: proof,
        website: "",
        elapsedMs: Date.now() - openedAt,
      });
      setPublicSlug(result.public_slug);
    } catch {
      // The thrown message is not shown. It may be a transport failure in
      // English ("Network unavailable"), and a reporter can act on none of it
      // — the moderation queue is where an API's own words belong, because a
      // moderator can.
      //
      // The proof is cleared because it may well be spent: the server consumes
      // the salt before it can fail on anything downstream. Clearing it means
      // a second click cannot silently resubmit against a burnt challenge —
      // the reader is told to reload, and reloading is what actually works.
      setProof(null);
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

      <div className="space-y-afh-md">
        <Label htmlFor={reasonId}>Qu&apos;est-ce qui ne va pas&nbsp;?</Label>
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

      {/* Everything below is optional and collapsed. The reader who has only
          a remark writes one line and leaves; the reader who has the answer,
          or a source, opens a panel. The kind of report is derived from which
          of them they filled — the atlas classifies, the reader does not
          (moderation charter §1). */}
      <details className="afh-report-disclosure rounded-afh-md border border-afh-border px-afh-lg py-afh-md">
        <summary className="min-h-11 cursor-pointer list-none text-afh-body font-semibold marker:content-['']">
          Vous connaissez la bonne réponse&nbsp;?{" "}
          <span aria-hidden="true">▸</span>
        </summary>
        <div className="pt-afh-md">
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
        </div>
      </details>

      <details className="afh-report-disclosure rounded-afh-md border border-afh-border px-afh-lg py-afh-md">
        <summary className="min-h-11 cursor-pointer list-none text-afh-body font-semibold marker:content-['']">
          Vous avez une source&nbsp;? <span aria-hidden="true">▸</span>
        </summary>
        <div className="pt-afh-md">
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
              {false
                ? "Ajoutez au moins un lien ou une citation."
                : "Ajoutez un lien ou une citation si vous en disposez."}
            </p>
            <div className="space-y-afh-md">
              <Label htmlFor={counterSourceUrlId}>
                Lien de la contre-source
              </Label>
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
        </div>
      </details>

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

      <div aria-hidden="true" hidden>
        <label htmlFor={`${idPrefix}-website`}>
          Ne remplissez pas ce champ
        </label>
        <input
          autoComplete="off"
          id={`${idPrefix}-website`}
          name="website"
          tabIndex={-1}
          type="text"
        />
      </div>

      <section
        aria-describedby={verificationError ? verificationErrorId : undefined}
        aria-labelledby={turnstileHeadingId}
        className="space-y-afh-md"
      >
        <h3 className="text-afh-body font-semibold" id={turnstileHeadingId}>
          Vérification anti-robot
        </h3>
        {/* Nothing is asked of the reader: the browser pays a small
            computational cost and reports when it is done. */}
        {renderVerification ? (
          renderVerification({
            onSolved: (solved) => {
              setProof(solved);
              setVerificationError("");
            },
            onFailed: () => {
              setProof(null);
              setVerificationError(
                "La vérification anti-robot n'a pas abouti. Rechargez la page pour réessayer."
              );
            },
          })
        ) : (
          <p className="text-afh-small text-afh-text-soft">
            La vérification anti-robot sera chargée ici.
          </p>
        )}
        {verificationError && (
          <p
            className="text-afh-small text-afh-flag-open"
            id={verificationErrorId}
            role="alert"
          >
            {verificationError}
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
