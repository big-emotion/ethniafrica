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

## 1. Auth redirect allow-lists — do this first

**No test can catch this.** The application asks Supabase for a link back to its
own origin; GoTrue checks that origin against the redirect allow-list and, when
it does not match, **silently substitutes the Site URL**. No error, no warning.
That is how magic links ended up pointing at `ethniafrica-big-emotion.vercel.app`
— a stale preview deployment — from every environment including localhost, while
the code asked for exactly the right URL.

**Every entry must carry the callback path.** `http://localhost:3000` does not
match `http://localhost:3000/api/auth/callback`; it is a non-match like any
other, and it fails the same silent way.

The two databases are configured by completely different means, because only one
of them is a hosted Supabase project.

### Recette — hosted project `shmrjtnfbqzceovroqjj`

Either push the repository's own declaration, which is the version-controlled
path and the reason `supabase/config.toml` carries these values:

```bash
supabase link --project-ref shmrjtnfbqzceovroqjj
supabase config push
```

**Expect this command to exit non-zero, and check the auth line rather than the
exit code.** It pushes each service in turn and the storage step fails on the
free tier — `402: Please upgrade the project to a paid tier to enable vector
buckets`, provoked by `[storage] enabled = true` and unrelated to auth. Auth is
pushed first. Run it a second time and read the third line: `Remote Auth config
is up to date.` is the confirmation.

Applied to recette on 2026-09-01; the remote now matches this repository.

or type the same values into the dashboard → **Authentication → URL
Configuration**: Site URL `http://localhost:3000` is fine for a recette used from
a developer machine; Redirect URLs must list
`http://localhost:3000/api/auth/callback` and
`https://recette.africatlas.com/api/auth/callback`.

### Production — self-hosted, not a dashboard

Production is **not** `jajggbeimfudpzcxytbb`. It is a self-hosted stack at
`https://supabase.ethniafrica.com`, on the Francfort VPS `145.239.76.125`, with
its compose project in `/home/ubuntu/supabase/docker/`. There is no Supabase
dashboard for it: GoTrue reads `GOTRUE_SITE_URL` and `GOTRUE_URI_ALLOW_LIST`
from `SITE_URL` and `ADDITIONAL_REDIRECT_URLS` in that directory's `.env`.

This was the production failure, and it is now fixed. `SITE_URL` was already
correct; `ADDITIONAL_REDIRECT_URLS` was **empty**, so a production magic link
landed on the home page rather than the callback and established no session at
all. Applied 2026-09-01 — the running `supabase-auth` container reports
`GOTRUE_URI_ALLOW_LIST=https://ethniafrica.com/api/auth/callback`, which is the
check worth making: the file and the process can disagree until the container is
recreated.

The procedure is kept because it is how the value is changed again, and because
`.env` is not in version control — nothing else records what production holds.

```bash
ssh ubuntu@145.239.76.125
cd /home/ubuntu/supabase/docker
cp .env .env.bak-$(date +%Y%m%d)
# ADDITIONAL_REDIRECT_URLS=https://ethniafrica.com/api/auth/callback
nano .env
docker compose up -d --force-recreate auth
```

**Only the production callback belongs in this list.** Adding localhost or
recette would let a _production_ magic link redirect a session to a developer's
machine, which is the classic magic-link phishing vector. The environments do not
share a database and must not share an allow-list.

**Proof it worked.** Request a link and read the URL in the e-mail: `redirect_to`
must carry the `/api/auth/callback` of the environment you asked from. Anything
else means the entry did not match and GoTrue fell back to the Site URL.

## 2. Add the first moderator

Nobody can open the console until an address is on the list, and there is no
screen for adding one because adding one would need the console. The first entry
is written with the service-role key:

```bash
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  npx tsx scripts/seedAdminAllowlist.ts moderation@example.org "Responsable éditorial de la modération"
```

The address does not need a Supabase account first: `signInWithOtp` is called
with `shouldCreateUser: true`, because the allowlist is the gate and an
authorized person should not additionally have to have registered.

Recette carries one entry as of 2026-09-01. Production carries none: the table
arrives there with the release, and the first entry has to be written after it.

## 3. Remove a moderator

Delete the row. The next request for a session — and every page load, since
`getModeratorSession()` consults the list on each one — refuses. There is no
cached role to expire.

```sql
delete from admin_allowlist where email = 'moderation@example.org';
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
