"use client";

import { useId, useState } from "react";

import { FormFieldError } from "@/components/forms/FormFieldError";
import { Button } from "@/components/ui/button";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_EMAIL } from "@/lib/brand";
import { cn } from "@/lib/utils";
import {
  CONTACT_CIVILITIES,
  CONTACT_CIVILITY_LABEL,
  CONTACT_SUBJECTS,
} from "@/lib/validations/contact";

/**
 * A native `<select>` rather than the Radix primitive beside it.
 *
 * On a phone — which is where this form is filled — the native control opens
 * the OS picker, which is a wheel the reader already knows and which cannot
 * be scrolled off the viewport by a sticky masthead. `mobile-text.css`
 * already names `select` among the elements that keep their own alignment,
 * so the site expects native ones.
 *
 * It carries the field dress by hand because `Input` is an `<input>`: the two
 * must not drift, and the shared half is the token list, not a component.
 */
const FIELD_CLASSES =
  "flex h-11 w-full rounded-afh-lg border border-afh-border bg-afh-surface px-3 py-2 text-afh-small text-afh-text disabled:cursor-not-allowed disabled:opacity-50";

type FieldErrors = Record<string, string[] | undefined>;

interface SendState {
  status: "idle" | "sending" | "sent" | "failed";
  /** What went wrong, in the reader's words. */
  message?: string;
}

const EMPTY_FORM = {
  civility: "",
  firstName: "",
  lastName: "",
  email: "",
  subject: "",
  message: "",
};

/**
 * The atlas's contact form.
 *
 * Validation is the server's — the same zod schema decides for the form and
 * for anything else that posts to the endpoint, so the two cannot disagree
 * about what a valid message is. The browser's own `required` and
 * `type="email"` still run first, which keeps the common mistakes off the
 * network without giving the field rules a second definition here.
 */
// @req REQ-045
export function ContactForm() {
  const fieldId = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [send, setSend] = useState<SendState>({ status: "idle" });

  const errorFor = (field: string) => fieldErrors[field]?.[0];

  const update = (field: keyof typeof EMPTY_FORM) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (send.status === "sending") return;

    setSend({ status: "sending" });
    setFieldErrors({});

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, honeypot }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        setSend({
          status: "failed",
          message:
            payload.message ??
            `Votre message n'a pas pu être envoyé. Écrivez-nous directement à ${CONTACT_EMAIL}.`,
        });
        return;
      }

      // Cleared only on success: a failed send that wipes the message makes
      // the reader retype what they already wrote.
      setForm(EMPTY_FORM);
      setSend({ status: "sent" });
    } catch {
      setSend({
        status: "failed",
        message: `Votre message n'a pas pu être envoyé. Écrivez-nous directement à ${CONTACT_EMAIL}.`,
      });
    }
  };

  const describedBy = (field: string) =>
    errorFor(field) ? `${fieldId}-${field}-error` : undefined;

  const fieldProps = (field: string) => ({
    id: `${fieldId}-${field}`,
    name: field,
    "aria-invalid": errorFor(field) ? true : undefined,
    "aria-describedby": describedBy(field),
  });

  return (
    // `text-left` is the block declaring its own alignment, which brand
    // charter §8.1 requires and `mobile-text.css` otherwise denies it: under
    // 768 px the site-wide centring reaches `<label>` — which is not in that
    // file's opt-out list — while the fields under those labels keep their
    // left edge. Every label sat centred over a left-aligned input, which is
    // the split-`dt`-from-`dd` failure the charter already records once.
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      <p className="text-afh-caption text-afh-text-soft">
        Les champs marqués d&apos;un astérisque sont obligatoires.
      </p>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-civility`}>Civilité</Label>
        <select
          {...fieldProps("civility")}
          className={cn(FIELD_CLASSES, CHARTER_FOCUS_RING)}
          value={form.civility}
          onChange={(event) => update("civility")(event.target.value)}
        >
          <option value="">Sélectionnez…</option>
          {CONTACT_CIVILITIES.map((civility) => (
            <option key={civility} value={civility}>
              {CONTACT_CIVILITY_LABEL[civility]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-firstName`}>Prénom *</Label>
          <Input
            {...fieldProps("firstName")}
            required
            autoComplete="given-name"
            value={form.firstName}
            onChange={(event) => update("firstName")(event.target.value)}
          />
          <FormFieldError id={describedBy("firstName")}>
            {errorFor("firstName")}
          </FormFieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-lastName`}>Nom *</Label>
          <Input
            {...fieldProps("lastName")}
            required
            autoComplete="family-name"
            value={form.lastName}
            onChange={(event) => update("lastName")(event.target.value)}
          />
          <FormFieldError id={describedBy("lastName")}>
            {errorFor("lastName")}
          </FormFieldError>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-email`}>Adresse électronique *</Label>
        <Input
          {...fieldProps("email")}
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(event) => update("email")(event.target.value)}
        />
        <FormFieldError id={describedBy("email")}>
          {errorFor("email")}
        </FormFieldError>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-subject`}>Objet *</Label>
        <select
          {...fieldProps("subject")}
          required
          className={cn(FIELD_CLASSES, CHARTER_FOCUS_RING)}
          value={form.subject}
          onChange={(event) => update("subject")(event.target.value)}
        >
          <option value="">Sélectionnez un objet</option>
          {CONTACT_SUBJECTS.map((subject) => (
            <option key={subject.value} value={subject.value}>
              {subject.label}
            </option>
          ))}
        </select>
        <FormFieldError id={describedBy("subject")}>
          {errorFor("subject")}
        </FormFieldError>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-message`}>Message *</Label>
        <Textarea
          {...fieldProps("message")}
          required
          rows={8}
          placeholder="Décrivez votre demande…"
          value={form.message}
          onChange={(event) => update("message")(event.target.value)}
        />
        <FormFieldError id={describedBy("message")}>
          {errorFor("message")}
        </FormFieldError>
      </div>

      {/* Offered to whatever fills every field it finds, and to nobody else:
          out of the accessibility tree, out of the tab order, off screen
          rather than `display: none`, which some fillers skip. */}
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={`${fieldId}-honeypot`}>
          Ne remplissez pas ce champ
        </label>
        <input
          id={`${fieldId}-honeypot`}
          name="honeypot"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <div className="space-y-3 pt-1">
        <Button
          type="submit"
          variant="accent"
          disabled={send.status === "sending"}
        >
          {send.status === "sending" ? "Envoi en cours…" : "Envoyer le message"}
        </Button>

        {send.status === "sent" && (
          <p
            role="status"
            className="rounded-afh-lg border border-afh-border bg-afh-bg-warm px-3 py-2 text-afh-small text-afh-text"
          >
            Votre message est bien parti. Nous vous répondons à l&apos;adresse
            que vous avez indiquée.
          </p>
        )}

        {send.status === "failed" && send.message && (
          <FormFieldError variant="banner">{send.message}</FormFieldError>
        )}
      </div>
    </form>
  );
}
