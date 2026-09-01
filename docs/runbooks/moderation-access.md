# Moderation access

How somebody gets into `/fr/admin`, and the one piece of configuration that is
not in this repository and will silently break the whole thing if it is wrong.

## The model, in one paragraph

There are no public accounts. Reporting costs none (moderation charter §2), and
the console authorizes an **e-mail address** against the `admin_allowlist` table
— not a role, not a profile row. `/fr/admin/connexion` is the only sign-in
surface in the product; it sends a magic link to an address on the list and
answers a stranger with the identical sentence, so the form cannot be used to
enumerate moderators.

## 1. Supabase Auth URL configuration — do this first

**This is not in the repository and no test can catch it.** The application asks
Supabase for a link back to its own origin; Supabase checks that origin against
the project's redirect allow-list and, when it does not match, **silently
substitutes the project's Site URL**. That is how magic links ended up pointing
at `ethniafrica-big-emotion.vercel.app`, a stale preview deployment, from every
environment including localhost.

In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL** — the production domain. Never a Vercel preview URL.
- **Redirect URLs** — one entry per environment that must be able to sign in:
  - `http://localhost:3000/api/auth/callback`
  - the recette domain, `/api/auth/callback`
  - the production domain, `/api/auth/callback`

Do this on **both** Supabase projects. `shmrjtnfbqzceovroqjj` serves recette,
`jajggbeimfudpzcxytbb` serves production; both label their own environment
"production", which describes the project and not the application it serves.

**Proof it worked.** Request a link from `/fr/admin/connexion` on localhost and
read the URL in the e-mail: `redirect_to` must carry
`http://localhost:3000/api/auth/callback`. If it carries anything else, the
allow-list entry does not match and Supabase fell back to the Site URL.

## 2. Add the first moderator

Nobody can open the console until an address is on the list, and there is no
screen for adding one because adding one would need the console. The first entry
is written with the service-role key:

```bash
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  npx tsx scripts/seedAdminAllowlist.ts moderatrice@example.org "Rédactrice en chef"
```

The address does not need a Supabase account first: `signInWithOtp` is called
with `shouldCreateUser: true`, because the allowlist is the gate and an
authorized person should not additionally have to have registered.

## 3. Remove a moderator

Delete the row. The next request for a session — and every page load, since
`getModeratorSession()` consults the list on each one — refuses. There is no
cached role to expire.

```sql
delete from admin_allowlist where email = 'moderatrice@example.org';
```

## What breaks quietly

- **`RESEND_API_KEY` unset.** The console works, reports arrive, decisions get
  made — and no reader is ever told. Both the verification link and the decision
  are sent through Resend; unset, they log a warning and skip. The build stays
  green.
- **A redirect URL missing from Supabase.** Sign-in appears to work right up to
  the click, then lands on a stale deployment. See §1.
- **`admin_allowlist` unreadable.** `isEmailAllowlisted` fails closed: an outage
  locks moderators out rather than letting anyone in. This is deliberate; the
  symptom is everyone being bounced to the sign-in page.
