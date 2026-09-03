"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

export type NarrativeDisplayMode = "public_name" | "pseudonym" | "withheld";
export type NarrativePlacePrecision =
  "exact" | "locality" | "region" | "country" | "withheld";
export type NarrativeKind = "tradition" | "testimony" | "memory" | "story";
export type NarrativeVisibility = "restricted" | "public";
export type NarrativeReviewStatus = "pending" | "approved" | "rejected";
export type NarrativeRightsStatus = "pending" | "cleared" | "revoked";

export interface OralNarrativeIntakeValues {
  attribution: {
    displayMode: NarrativeDisplayMode;
    displayName: string | null;
    community: string;
    collector: string | null;
  };
  context: {
    narrativeDate: string | null;
    placePrecision: NarrativePlacePrecision;
    languageCode: string;
    narrativeKind: NarrativeKind;
  };
  content: {
    transcript: string | null;
    summary: string | null;
    mediaLocator: string | null;
  };
  variantOf: string | null;
  visibility: NarrativeVisibility;
}

export interface OralNarrativeIntakeFormProps {
  onSubmit: (values: OralNarrativeIntakeValues) => void | Promise<void>;
  onCancel?: () => void;
}

export interface OralNarrativeModerationState {
  reviewStatus: NarrativeReviewStatus;
  rightsStatus: NarrativeRightsStatus;
  visibility: NarrativeVisibility;
}

export interface OralNarrativeModerationFormProps {
  initialState: OralNarrativeModerationState;
  onSubmit: (state: OralNarrativeModerationState) => void | Promise<void>;
  onCancel?: () => void;
}

type IntakeErrors = Partial<
  Record<"displayName" | "community" | "language" | "content", string>
>;

const PLACE_PRECISIONS: ReadonlyArray<{
  value: NarrativePlacePrecision;
  label: string;
}> = [
  { value: "exact", label: "Lieu exact" },
  { value: "locality", label: "Localité" },
  { value: "region", label: "Région" },
  { value: "country", label: "Pays" },
  { value: "withheld", label: "Lieu retenu" },
];

const NARRATIVE_KINDS: ReadonlyArray<{ value: NarrativeKind; label: string }> =
  [
    { value: "tradition", label: "Tradition" },
    { value: "testimony", label: "Témoignage" },
    { value: "memory", label: "Mémoire" },
    { value: "story", label: "Récit" },
  ];

const DISPLAY_MODES: ReadonlyArray<NarrativeDisplayMode> = [
  "public_name",
  "pseudonym",
  "withheld",
];
const VISIBILITIES: ReadonlyArray<NarrativeVisibility> = [
  "restricted",
  "public",
];
const REVIEW_STATUSES: ReadonlyArray<NarrativeReviewStatus> = [
  "pending",
  "approved",
  "rejected",
];
const RIGHTS_STATUSES: ReadonlyArray<NarrativeRightsStatus> = [
  "pending",
  "cleared",
  "revoked",
];

function trimmedOrNull(value: string): string | null {
  return value.trim() || null;
}

function selectOption<T extends string>(
  value: string,
  options: ReadonlyArray<T>,
  setValue: (value: T) => void
) {
  const option = options.find((candidate) => candidate === value);
  if (option) setValue(option);
}

function validateIntake(values: OralNarrativeIntakeValues): IntakeErrors {
  const errors: IntakeErrors = {};

  if (
    values.attribution.displayMode !== "withheld" &&
    !values.attribution.displayName
  ) {
    errors.displayName = "Indiquez le nom affiché ou retenez l'anonymat.";
  }

  if (!values.attribution.community) {
    errors.community = "Indiquez la communauté concernée.";
  }

  if (!/^[a-z]{3}$/.test(values.context.languageCode)) {
    errors.language =
      "Saisissez un code ISO 639-3 en trois lettres minuscules.";
  }

  if (!values.content.transcript && !values.content.summary) {
    errors.content = "Ajoutez une transcription ou un résumé.";
  }

  return errors;
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;

  return (
    <p className="text-afh-small font-medium text-destructive">{children}</p>
  );
}

// @req REQ-095
export function OralNarrativeIntakeForm({
  onSubmit,
  onCancel,
}: OralNarrativeIntakeFormProps) {
  const [displayMode, setDisplayMode] =
    useState<NarrativeDisplayMode>("public_name");
  const [displayName, setDisplayName] = useState("");
  const [community, setCommunity] = useState("");
  const [collector, setCollector] = useState("");
  const [narrativeDate, setNarrativeDate] = useState("");
  const [placePrecision, setPlacePrecision] =
    useState<NarrativePlacePrecision>("country");
  const [languageCode, setLanguageCode] = useState("");
  const [narrativeKind, setNarrativeKind] =
    useState<NarrativeKind>("tradition");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [mediaLocator, setMediaLocator] = useState("");
  const [variantOf, setVariantOf] = useState("");
  const [visibility, setVisibility] =
    useState<NarrativeVisibility>("restricted");
  const [errors, setErrors] = useState<IntakeErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const values: OralNarrativeIntakeValues = {
      attribution: {
        displayMode,
        displayName:
          displayMode === "withheld" ? null : trimmedOrNull(displayName),
        community: community.trim(),
        collector: trimmedOrNull(collector),
      },
      context: {
        narrativeDate: trimmedOrNull(narrativeDate),
        placePrecision,
        languageCode: languageCode.trim(),
        narrativeKind,
      },
      content: {
        transcript: trimmedOrNull(transcript),
        summary: trimmedOrNull(summary),
        mediaLocator: trimmedOrNull(mediaLocator),
      },
      variantOf: trimmedOrNull(variantOf),
      visibility,
    };
    const nextErrors = validateIntake(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Proposer un récit oral</CardTitle>
        <p className="text-afh-small text-muted-foreground">
          Les récits restent restreints {"jusqu'à"} la revue éditoriale et à la
          clarification des droits.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-8" onSubmit={handleSubmit} noValidate>
          <fieldset className="space-y-4">
            <legend className="text-afh-small font-semibold">
              Attribution
            </legend>
            <RadioGroup
              value={displayMode}
              onValueChange={(value) =>
                selectOption(value, DISPLAY_MODES, (option) =>
                  setDisplayMode(option)
                )
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="public_name" id="display-public-name" />
                <Label htmlFor="display-public-name">Nom public</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pseudonym" id="display-pseudonym" />
                <Label htmlFor="display-pseudonym">Pseudonyme approuvé</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="withheld" id="display-withheld" />
                <Label htmlFor="display-withheld">Identité retenue</Label>
              </div>
            </RadioGroup>
            {displayMode !== "withheld" ? (
              <div className="space-y-2">
                <Label htmlFor="narrator-display-name">Nom affiché</Label>
                <Input
                  id="narrator-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
                <FieldError>{errors.displayName}</FieldError>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="narrator-community">Communauté</Label>
                <Input
                  id="narrator-community"
                  value={community}
                  onChange={(event) => setCommunity(event.target.value)}
                  required
                />
                <FieldError>{errors.community}</FieldError>
              </div>
              <div className="space-y-2">
                <Label htmlFor="narrator-collector">Collecté par</Label>
                <Input
                  id="narrator-collector"
                  value={collector}
                  onChange={(event) => setCollector(event.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-afh-small font-semibold">Contexte</legend>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="narrative-date">Date du récit</Label>
                <Input
                  id="narrative-date"
                  type="date"
                  value={narrativeDate}
                  onChange={(event) => setNarrativeDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="place-precision">Précision du lieu</Label>
                <select
                  id="place-precision"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-afh-small"
                  value={placePrecision}
                  onChange={(event) =>
                    selectOption(
                      event.target.value,
                      PLACE_PRECISIONS.map((option) => option.value),
                      (option) => setPlacePrecision(option)
                    )
                  }
                >
                  {PLACE_PRECISIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language-code">Code langue (ISO 639-3)</Label>
                <Input
                  id="language-code"
                  value={languageCode}
                  onChange={(event) => setLanguageCode(event.target.value)}
                  required
                />
                <FieldError>{errors.language}</FieldError>
              </div>
              <div className="space-y-2">
                <Label htmlFor="narrative-kind">Type de récit</Label>
                <select
                  id="narrative-kind"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-afh-small"
                  value={narrativeKind}
                  onChange={(event) =>
                    selectOption(
                      event.target.value,
                      NARRATIVE_KINDS.map((option) => option.value),
                      (option) => setNarrativeKind(option)
                    )
                  }
                >
                  {NARRATIVE_KINDS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-afh-small font-semibold">Contenu</legend>
            <div className="space-y-2">
              <Label htmlFor="narrative-transcript">Transcription</Label>
              <Textarea
                id="narrative-transcript"
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="narrative-summary">Résumé</Label>
              <Textarea
                id="narrative-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
              <FieldError>{errors.content}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor="narrative-media-locator">
                Emplacement du média
              </Label>
              <Input
                id="narrative-media-locator"
                type="url"
                value={mediaLocator}
                onChange={(event) => setMediaLocator(event.target.value)}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-afh-small font-semibold">
              Variante et visibilité
            </legend>
            <div className="space-y-2">
              <Label htmlFor="narrative-variant">Variante de</Label>
              <Input
                id="narrative-variant"
                value={variantOf}
                onChange={(event) => setVariantOf(event.target.value)}
                placeholder="ORL_…"
              />
            </div>
            <RadioGroup
              value={visibility}
              onValueChange={(value) =>
                selectOption(value, VISIBILITIES, (option) =>
                  setVisibility(option)
                )
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="restricted" id="visibility-restricted" />
                <Label htmlFor="visibility-restricted">Restreint</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="public" id="visibility-public" />
                <Label htmlFor="visibility-public">
                  Public après validation
                </Label>
              </div>
            </RadioGroup>
          </fieldset>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Envoi en cours…" : "Soumettre le récit"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// @req REQ-095
export function OralNarrativeModerationForm({
  initialState,
  onSubmit,
  onCancel,
}: OralNarrativeModerationFormProps) {
  const [reviewStatus, setReviewStatus] = useState<NarrativeReviewStatus>(
    initialState.reviewStatus
  );
  const [rightsStatus, setRightsStatus] = useState<NarrativeRightsStatus>(
    initialState.rightsStatus
  );
  const [visibility, setVisibility] = useState<NarrativeVisibility>(
    initialState.visibility
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      visibility === "public" &&
      (reviewStatus !== "approved" || rightsStatus !== "cleared")
    ) {
      setError(
        "La publication exige une revue approuvée et des droits clarifiés."
      );
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({ reviewStatus, rightsStatus, visibility });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Décision de modération</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="review-status">État de la revue</Label>
            <select
              id="review-status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-afh-small"
              value={reviewStatus}
              onChange={(event) =>
                selectOption(event.target.value, REVIEW_STATUSES, (option) =>
                  setReviewStatus(option)
                )
              }
            >
              <option value="pending">En attente</option>
              <option value="approved">Approuvée</option>
              <option value="rejected">Refusée</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rights-status">État des droits</Label>
            <select
              id="rights-status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-afh-small"
              value={rightsStatus}
              onChange={(event) =>
                selectOption(event.target.value, RIGHTS_STATUSES, (option) =>
                  setRightsStatus(option)
                )
              }
            >
              <option value="pending">En attente</option>
              <option value="cleared">Clarifiés</option>
              <option value="revoked">Révoqués</option>
            </select>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-afh-small font-medium">Publication</legend>
            <RadioGroup
              value={visibility}
              onValueChange={(value) =>
                selectOption(value, VISIBILITIES, (option) =>
                  setVisibility(option)
                )
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="restricted" id="moderation-restricted" />
                <Label htmlFor="moderation-restricted">
                  Conserver restreint
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="public" id="moderation-public" />
                <Label htmlFor="moderation-public">Publier</Label>
              </div>
            </RadioGroup>
          </fieldset>
          {error ? (
            <p className="text-afh-small font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement…" : "Enregistrer la décision"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
