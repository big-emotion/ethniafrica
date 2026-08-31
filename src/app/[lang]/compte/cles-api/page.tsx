import { redirect } from "next/navigation";

import { listUserApiKeys } from "@/api/v2/services/keyService";
import { SiteTrail } from "@/components/layout/SiteTrail";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { ApiKeysManager } from "./ApiKeysManager";

// @req REQ-056
export default async function ApiKeysPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/fr/compte/connexion");
  }

  const keys = await listUserApiKeys(user.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10 xl:py-12">
      <SiteTrail />
      <header className="mb-6 space-y-2 md:mb-8">
        <p className="text-afh-small font-medium text-primary">Votre compte</p>
        <h1 className="text-afh-h1 font-bold tracking-tight">Clés API</h1>
        <p className="max-w-2xl text-afh-small text-muted-foreground">
          Gérez les clés utilisées pour interroger l’API depuis vos propres
          outils.
        </p>
      </header>

      <ApiKeysManager initialKeys={keys} />
    </main>
  );
}
