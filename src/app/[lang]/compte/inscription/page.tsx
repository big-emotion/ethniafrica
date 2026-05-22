"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageLayout } from "@/components/layout/PageLayout";
import { useLanguage } from "@/hooks/use-language";

const content = {
  fr: {
    title: "Créer un compte",
    subtitle: "Rejoignez la communauté EthniAfrica pour contribuer.",
    emailLabel: "Adresse e-mail",
    emailPlaceholder: "votre@email.com",
    magicLinkButton: "Recevoir un lien magique",
    githubButton: "Continuer avec GitHub",
    googleButton: "Continuer avec Google",
    consentLabel:
      "J'accepte de publier mes contributions sous licence CC-BY-SA-4.0 — mes corrections et signalements seront librement réutilisables.",
    orSeparator: "ou",
    magicLinkSent:
      "Vérifiez votre boîte mail — un lien de connexion vous a été envoyé.",
    loginLink: "Vous avez déjà un compte ?",
    loginLinkText: "Se connecter",
    errors: {
      emailRequired: "L'adresse e-mail est requise.",
      consentRequired: "Vous devez accepter la licence CC-BY-SA-4.0.",
      generic: "Une erreur est survenue. Veuillez réessayer.",
    },
  },
};

export default function InscriptionPage() {
  const params = useParams();
  const lang = (params?.lang as string) || "fr";
  const { language, setLanguage } = useLanguage();
  const t = content.fr;

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createBrowserSupabaseClient();
  const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback?redirect=/${lang}/compte/profil`;

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg(t.errors.emailRequired);
      setStatus("error");
      return;
    }
    if (!consent) {
      setErrorMsg(t.errors.consentRequired);
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setErrorMsg(t.errors.generic);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function handleOAuth(provider: "github" | "google") {
    if (!consent) {
      setErrorMsg(t.errors.consentRequired);
      setStatus("error");
      return;
    }
    setErrorMsg("");
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  }

  return (
    <PageLayout language={language} onLanguageChange={setLanguage} hideHeader>
      <div className="max-w-md mx-auto space-y-8 py-12 px-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold">{t.title}</h1>
          <p className="text-muted-foreground text-sm">{t.subtitle}</p>
        </div>

        {status === "sent" ? (
          <p
            role="status"
            className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800"
          >
            {t.magicLinkSent}
          </p>
        ) : (
          <form onSubmit={handleMagicLink} noValidate className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-required="true"
                aria-invalid={
                  status === "error" && !email.trim() ? "true" : undefined
                }
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(Boolean(v))}
                aria-required="true"
                aria-invalid={
                  status === "error" && !consent ? "true" : undefined
                }
              />
              <Label
                htmlFor="consent"
                className="text-sm leading-snug cursor-pointer"
              >
                {t.consentLabel}
              </Label>
            </div>

            {status === "error" && errorMsg && (
              <p role="alert" className="text-sm text-red-600">
                {errorMsg}
              </p>
            )}

            <Button
              type="submit"
              disabled={status === "loading"}
              className="w-full"
            >
              {t.magicLinkButton}
            </Button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">
                {t.orSeparator}
              </span>
              <div className="flex-1 border-t" aria-hidden="true" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => handleOAuth("github")}
              disabled={status === "loading"}
            >
              <GitHubIcon aria-hidden="true" />
              {t.githubButton}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => handleOAuth("google")}
              disabled={status === "loading"}
            >
              <GoogleIcon aria-hidden="true" />
              {t.googleButton}
            </Button>
          </form>
        )}

        <p className="text-sm text-center text-muted-foreground">
          {t.loginLink}{" "}
          <Link
            href={`/${lang}/compte/connexion`}
            className="underline underline-offset-4"
          >
            {t.loginLinkText}
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}

function GitHubIcon({ "aria-hidden": hidden }: { "aria-hidden"?: "true" }) {
  return (
    <svg
      aria-hidden={hidden}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function GoogleIcon({ "aria-hidden": hidden }: { "aria-hidden"?: "true" }) {
  return (
    <svg aria-hidden={hidden} width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}
