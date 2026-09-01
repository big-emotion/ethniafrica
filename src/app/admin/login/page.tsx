import { redirect } from "next/navigation";

/**
 * The legacy sign-in, reduced to a signpost.
 *
 * It offered a magic link *and* GitHub *and* Google, and it is one of two
 * sign-in surfaces the atlas used to carry. Both are gone: there is one door
 * now, and it checks an address against `admin_allowlist`.
 *
 * The page itself survives as a redirect rather than a 404 because the legacy
 * `/admin/contributions` workspace still points here from four places, and its
 * retirement is a separate decision (moderation charter §7).
 */
// @req REQ-042
export default function LegacyAdminLoginPage() {
  redirect("/fr/admin/connexion");
}
