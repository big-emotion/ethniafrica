"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFieldError } from "@/components/forms/FormFieldError";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/languageTag";
import { adminCopy } from "@/lib/i18n/copy/admin";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";
import type { Language } from "@/types/shared";
import { ApiKeyRevealCard } from "./ApiKeyRevealCard";

export interface ApiKeySummaryView {
  id: string;
  label: string | null;
  tier: string;
  active: boolean;
  key_prefix: string | null;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

interface CreatedApiKeyView extends ApiKeySummaryView {
  key: string;
}

export interface ApiKeysManagerProps {
  language: Language;
  initialKeys: ApiKeySummaryView[];
}

const KEY_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

function formatKeyDate(language: Language, value: string | null): string {
  if (!value) return "—";
  return formatDate(language, new Date(value), KEY_DATE);
}

async function sessionToken(): Promise<string> {
  const {
    data: { session },
  } = await createBrowserSupabaseClient().auth.getSession();
  return session?.access_token ?? "";
}

// @req REQ-056
export function ApiKeysManager({ language, initialKeys }: ApiKeysManagerProps) {
  const copy = adminCopy[language].apiKeys;
  const [keys, setKeys] = React.useState(initialKeys);
  const [label, setLabel] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState("");
  const [revealed, setRevealed] = React.useState<CreatedApiKeyView | null>(
    null
  );
  const [revokeError, setRevokeError] = React.useState<Record<string, string>>(
    {}
  );
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  async function createKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    setCreating(true);

    try {
      const response = await fetch("/api/v2/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await sessionToken()}`,
        },
        body: JSON.stringify({ label }),
      });
      const json = await response.json();

      if (!response.ok) {
        setCreateError(json?.errors?.[0]?.message ?? copy.createFailed);
        return;
      }

      const created: CreatedApiKeyView = json.data;
      const summary: ApiKeySummaryView = {
        id: created.id,
        label: created.label,
        tier: created.tier,
        active: created.active,
        key_prefix: created.key_prefix,
        created_at: created.created_at,
        last_used_at: created.last_used_at,
        expires_at: created.expires_at,
        revoked_at: created.revoked_at,
      };
      setKeys((current) => [summary, ...current]);
      setRevealed(created);
      setLabel("");
    } catch {
      setCreateError(copy.createFailed);
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    setRevokingId(id);
    setRevokeError((current) => ({ ...current, [id]: "" }));

    try {
      const response = await fetch(`/api/v2/keys/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${await sessionToken()}` },
      });
      const json = await response.json();

      if (!response.ok) {
        setRevokeError((current) => ({
          ...current,
          [id]: json?.errors?.[0]?.message ?? copy.revokeFailed,
        }));
        return;
      }

      setKeys((current) =>
        current.map((key) =>
          key.id === id
            ? { ...key, active: false, revoked_at: new Date().toISOString() }
            : key
        )
      );
    } catch {
      setRevokeError((current) => ({
        ...current,
        [id]: copy.revokeFailed,
      }));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {revealed ? (
        <ApiKeyRevealCard
          label={revealed.label ?? copy.unnamed}
          apiKey={revealed.key}
          language={language}
          onDismiss={() => setRevealed(null)}
        />
      ) : null}

      <Card className="rounded-afh-xl">
        <CardHeader className="p-5 md:p-6">
          <CardTitle className="text-afh-h2">{copy.createTitle}</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 md:p-6 md:pt-0">
          <form
            className="flex flex-col gap-4 md:flex-row md:items-end"
            onSubmit={createKey}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="api-key-label">{copy.keyName}</Label>
              <Input
                id="api-key-label"
                name="label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={80}
                required
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? copy.creating : copy.create}
            </Button>
          </form>
          {createError ? (
            <div className="mt-3">
              <FormFieldError>{createError}</FormFieldError>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-afh-xl">
        <CardHeader className="p-5 md:p-6">
          <CardTitle className="text-afh-h2">{copy.listTitle}</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 md:p-6 md:pt-0">
          {keys.length === 0 ? (
            <p className="text-afh-small text-muted-foreground">{copy.empty}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="rounded-afh-md border border-afh-border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{key.label ?? copy.unnamed}</p>
                      <p className="font-mono text-afh-caption text-muted-foreground">
                        {key.key_prefix}
                      </p>
                    </div>
                    {key.active ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={revokingId === key.id}
                          >
                            {copy.revoke}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {copy.revokeTitle}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {copy.revokeDescription}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeKey(key.id)}
                            >
                              {copy.confirmRevoke}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <span className="text-afh-caption text-muted-foreground">
                        {copy.revokedOn}{" "}
                        {formatKeyDate(language, key.revoked_at)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-afh-caption text-muted-foreground">
                    {copy.createdOn} {formatKeyDate(language, key.created_at)}
                  </p>
                  {revokeError[key.id] ? (
                    <div className="mt-2">
                      <FormFieldError>{revokeError[key.id]}</FormFieldError>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
