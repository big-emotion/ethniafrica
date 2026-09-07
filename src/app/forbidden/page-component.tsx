"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StateMedallion } from "@/components/ui/StateMedallion";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";
import { systemStatesCopy } from "@/lib/i18n/copy/systemStates";
import { useRouteLanguage } from "@/hooks/use-language";
import type { Language } from "@/types/shared";

// @req REQ-099
export default function ForbiddenPageComponent({
  language,
}: {
  language?: Language;
} = {}) {
  const routeLanguage = useRouteLanguage();
  const activeLanguage = language ?? routeLanguage;
  const copy = systemStatesCopy[activeLanguage].forbidden;
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
          {copy.title}
        </h1>

        <p data-testid="state-copy" className="text-afh-text-soft">
          {copy.body}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild data-cta="primary">
            <Link href={`/${activeLanguage}`}>{copy.home}</Link>
          </Button>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-afh-small text-afh-text-soft underline underline-offset-2 hover:text-afh-text transition-colors"
          >
            {copy.signOut}
          </button>
        </div>
      </div>
    </div>
  );
}
