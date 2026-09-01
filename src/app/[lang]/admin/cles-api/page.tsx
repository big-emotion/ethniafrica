import { listUserApiKeys } from "@/api/v2/services/keyService";
import { SiteTrail } from "@/components/layout/SiteTrail";
import { getModeratorSession } from "@/lib/supabase/moderator";
import { ApiKeysManager } from "./ApiKeysManager";

/**
 * API-key self-service, moved under the admin with the rest of what needs a
 * session.
 *
 * It used to live at `/fr/compte/cles-api` and was the only thing a public
 * account was still good for. With the account path gone, the keys follow the
 * one door that remains: an address on `admin_allowlist`. That narrows who can
 * mint a key from "anyone who signs up" to "whoever the atlas has authorized",
 * which is a change of policy and is recorded as one.
 */
// @req REQ-056
export default async function ApiKeysPage() {
  const { user } = await getModeratorSession();

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
