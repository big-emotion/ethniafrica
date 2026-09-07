"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/components/forms/FormFieldError";
import { adminCopy } from "@/lib/i18n/copy/admin";
import type { Language } from "@/types/shared";
import { requestAdminSignInLink, type AdminSignInState } from "./actions";

const INITIAL: AdminSignInState = { status: "idle", message: "" };

/**
 * One field, one button, no alternatives.
 *
 * There is nothing to choose between: the atlas has no passwords, no SSO
 * providers and no accounts to create. Offering "continuer avec Google" here
 * would open a second door onto the same allowlist check, and fail for
 * everyone not on it — a choice that changes nothing is worse than no choice.
 *
 * `useTransition` rather than `useActionState`: this repository runs React
 * 18.3, where the latter does not exist.
 */
// @req REQ-042
export function AdminSignInForm({ language }: { language: Language }) {
  const copy = adminCopy[language].signIn;
  const [state, setState] = useState<AdminSignInState>(INITIAL);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const next = await requestAdminSignInLink(state, formData);
      if (next) setState(next);
    });
  }

  if (state.status === "sent") {
    return (
      <p
        role="status"
        className="text-afh-small text-afh-text"
        data-testid="admin-sign-in-sent"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-afh-lg">
      <input type="hidden" name="language" value={language} />
      <div className="space-y-afh-sm">
        <Label htmlFor="email">{copy.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={copy.emailPlaceholder}
          aria-required="true"
          aria-invalid={state.status === "invalid" ? "true" : undefined}
        />
      </div>

      {state.status === "invalid" && (
        <FormFieldError>{state.message}</FormFieldError>
      )}

      <Button type="submit" disabled={pending} className="w-full md:w-auto">
        {pending ? copy.sending : copy.submit}
      </Button>
    </form>
  );
}
