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
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";
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
  initialKeys: ApiKeySummaryView[];
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

async function sessionToken(): Promise<string> {
  const {
    data: { session },
  } = await createBrowserSupabaseClient().auth.getSession();
  return session?.access_token ?? "";
}

// @req REQ-056
export function ApiKeysManager({ initialKeys }: ApiKeysManagerProps) {
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
        setCreateError(
          json?.errors?.[0]?.message ?? "La création de la clé a échoué."
        );
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
      setCreateError("La création de la clé a échoué.");
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
          [id]: json?.errors?.[0]?.message ?? "La révocation a échoué.",
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
        [id]: "La révocation a échoué.",
      }));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {revealed ? (
        <ApiKeyRevealCard
          label={revealed.label ?? "Sans nom"}
          apiKey={revealed.key}
          onDismiss={() => setRevealed(null)}
        />
      ) : null}

      <Card className="rounded-afh-xl">
        <CardHeader className="p-5 md:p-6">
          <CardTitle className="text-afh-h2">Créer une clé</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 md:p-6 md:pt-0">
          <form
            className="flex flex-col gap-4 md:flex-row md:items-end"
            onSubmit={createKey}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="api-key-label">Nom de la clé</Label>
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
              {creating ? "Création…" : "Créer une clé"}
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
          <CardTitle className="text-afh-h2">Vos clés API</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 md:p-6 md:pt-0">
          {keys.length === 0 ? (
            <p className="text-afh-small text-muted-foreground">
              Vous n’avez pas encore de clé API.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="rounded-afh-md border border-afh-border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{key.label ?? "Sans nom"}</p>
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
                            Révoquer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Révoquer cette clé ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              cette action est irréversible — toute application
                              qui utilise cette clé cessera immédiatement de
                              fonctionner
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeKey(key.id)}
                            >
                              Confirmer la révocation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <span className="text-afh-caption text-muted-foreground">
                        Révoquée le {formatDate(key.revoked_at)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-afh-caption text-muted-foreground">
                    Créée le {formatDate(key.created_at)}
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

export default ApiKeysManager;
