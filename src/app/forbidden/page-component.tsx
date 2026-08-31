"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StateMedallion } from "@/components/ui/StateMedallion";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";

// @req REQ-099
export default function ForbiddenPageComponent() {
  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-afh-bg-warm px-4 py-12">
      <div className="max-w-md w-full space-y-6 text-center">
        <StateMedallion className="mx-auto" />

        <h1 className="text-afh-h2 font-display font-semibold text-afh-text">
          Accès non autorisé
        </h1>

        <p data-testid="state-copy" className="text-afh-text-soft">
          Cette ressource nécessite un rôle que votre compte n&apos;a pas
          encore.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild data-cta="primary">
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-afh-small text-afh-text-soft underline underline-offset-2 hover:text-afh-text transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
