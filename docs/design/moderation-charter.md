# Moderation charter

What the atlas owes a reader who says "this is wrong", and what it owes the
moderator who has to answer them.

The corpus is open and incomplete, and it says so. That claim is only honest if
the correction path is real. This charter fixes that path: who may act, at which
state, what the public sees at each one, and what the reader is told back.

Read it alongside `atlas-charter.md`, which governs how a fiche presents its
claims. This one governs what happens when a claim is contested.

---

## 1. The reader writes; the atlas classifies

**A reader is never asked to file the atlas's paperwork.**

The report form asks one question — _what is wrong?_ — and offers two further
answers it never requires: the correction, and the source. Nothing else.

It used to open on a mandatory choice between six categories (`inaccurate`,
`missing-source`, `broken-url`, `offensive`, `correction-proposal`, `other`),
and that choice then imposed extra mandatory fields: picking _missing source_
required supplying a source. The atlas was asking the person reporting a gap to
fill it before they were allowed to report it.

`flag_kind` survives in the database. It is the moderator's vocabulary, and it
is **derived** from what the reader actually supplied:

| What the reader filled            | Kind recorded                       |
| --------------------------------- | ----------------------------------- |
| the statement only                | `other` — to be qualified at triage |
| statement + a proposed correction | `correction-proposal`               |
| statement + a source              | `missing-source`                    |

The moderator confirms or overrides it during triage. A derived value is a
starting point, never an assertion about what the reader meant.

**The rule generalises.** No internal taxonomy is ever a question put to a
visitor. If the atlas needs a category, the atlas derives it or a moderator
assigns it.

---

## 2. Reporting costs two actions and no account

**Given** a reader on a fiche,
**when** they find an error,
**then** they can report it in two actions: open, send.

No account, no e-mail, no age confirmation stands between the reader and the
send button. A proof of work is the control, computed by the reader's own
browser and verified server-side; it asks the reader for nothing and sends
nothing about them anywhere. It replaced Cloudflare Turnstile, which sent the
reader's IP to a third party.

**It has one server-only secret, `ANTIBOT_HMAC_SECRET`, and it is not optional.**
Unset, `GET /api/v2/antibot/challenge` answers 503, the dialog tells the reader
the verification did not complete, and this whole section is untrue — silently,
on a green build. The deployment checklist carries the curl that proves it.

### Why no account

An account is a toll on the one gesture the atlas most wants to receive. It buys
three things, and none of them is needed for a first report:

- **attribution** — a benefit to the contributor, not a precondition;
- **follow-up** — the public slug already gives anyone a stable URL to watch;
- **anti-abuse** — magic-link accounts are free to create, so an account is a
  weak control where the proof of work and rate limiting are the real ones.

The atlas has since taken this to its conclusion: **there are no public accounts
at all.** Sign-up, sign-in and the GitHub and Google providers are gone. The only
sign-in left is `/fr/admin/connexion`, which sends a link to an address on
`admin_allowlist` and to no other. Nothing a reader does requires one.

### The address is optional, and it is not an account

**Given** a reader who wants to know what became of their report,
**when** they send it,
**then** they may leave an address, and the report is published either way.

This is the one thing §2 collects about a person, and it is worth stating what it
is not. It is not an account: no password, no profile, no name attached to the
report, which stays anonymous on the public queue. It is not a condition: the
report is created, published and queued whether the field was filled or left
empty, and the send button never waits on it. And it is not usable until the
reader proves it — a single-use link, valid 24 hours, stored only as a hash.

The proof matters because anyone can type anyone's address into a public form.
Confirming is what turns an address into a channel; an unconfirmed one is written
to exactly once, with the confirmation itself, and then never again.

The address is never published, never returned by the API, and never joins
`flags` — it lives in `flag_reporter_contacts`, which carries RLS and no policy.
A column on `flags` would be readable straight off PostgREST, because
`flags_read_public` is `SELECT USING (true)` and our own column allowlist does
not apply there.

### Where age belongs

Age confirmation is a consequence of **account creation**, not of reporting.
GDPR Article 8 governs consent as the legal basis for processing a minor's
personal data. Reporting anonymously collects no identifier and publishes
nothing under a name; creating an account does both, and the registration page
already asks for the confirmation there.

So the flag path never blocks on age. Instead:

> **A report from a contributor whose age is not confirmed is recorded
> anonymously, never refused.**

Nobody is turned away, and no name is published without the confirmation that
licenses it. This also removes the user-visible harm of a known defect: an
account created through the sign-in page rather than the registration page can
never confirm its age today, and used to be permanently unable to report.

### What is recorded

`contributor_id` is set only when a session exists **and** that account has
confirmed its age. Otherwise it is null and the public queue shows _anonyme_ —
a case `PublicFlagsQueue` already handles.

---

## 3. Where the button lives

**A report control is reachable at every moment of the reading, and it knows
what is being read.**

The fiche's chapter bar is `position: sticky` and already tracks the chapter in
view. The report control belongs there: always on screen, thumb-reachable on
mobile, and anchored to the chapter the reader is actually looking at, so the
dialog opens saying _Section de fiche · Afrique du Sud — Culture et société_
without asking.

The per-section controls stay. They serve the reader who wants to aim at
something narrower than a chapter.

A floating button detached from the reading would have been reachable and
context-free — it would have moved the "which part?" question from the page back
onto the reader, which is §1 again.

### One general entry point, and why it is not a contradiction

The footer offers "Signaler une erreur" on every screen of the site, and
`/fr/report-error` answers it with a form filed against a **`general`** target.

That is an exception to everything above, taken deliberately. The rule's
reasoning holds — an aimed report is a better report, and the rail now makes one
available on every fiche. But the rule was being used to justify a page that
gave the reader _nothing_: a Typeform embed the site's own CSP blocked, under
four paragraphs promising "le formulaire ci-dessous". A reader reporting a
broken page, a wrong translation, or something they saw and did not bookmark has
no fiche to aim from, and **an entry point that leads nowhere is worse than one
that lands imprecisely.**

Two conditions keep the exception honest:

- **`general` is its own column in the public register**, never folded into
  `assertion`. A general report contests nothing in particular, and filing it as
  an assertion would make every moderator filtering for assertions open reports
  that dispute no statement.
- **The page names the aimed path** and says it is the better one, so the
  general form is the fallback it is and not the front door.

The page is also where the form _is_, not what a button on it opens: a reader
who has already chosen "Signaler une erreur" has stated their intent, and a
second control before the field is exactly the toll §2 exists to remove.

### Which word gives way at 430 px

The rail holds three things and cannot show them all on a narrow screen. The
order of sacrifice is fixed: **the chapter title ellipsizes first**, because it
is the one thing on the rail the reader can also read off the page itself. Then
the word "Sommaire", which names a control the position readout and the caret
already explain. **"Signaler" never goes**, and never becomes an icon — the
actions charter licenses no glyph but the arrow (§7), and an unlabelled flag
asks the reader to guess at the one gesture this charter exists to make easy.

### This rule was written before it was built

For as long as it went unbuilt, every report control in the product hung off a
single chapter of the parchment — "Culture et société" on a country fiche. A
reader who found an error in chapter two had to scroll to chapter seven to say
so, and arrived at a dialog naming the wrong section. Held by
`src/components/fiche/__tests__/ficheChapterBarReportCharter.test.tsx`, so the
control cannot quietly go back to riding one chapter.

---

## 4. The lifecycle, and who may drive it

The state machine is enforced by Postgres, not by the application
(`flags_enforce_state_machine`, migration `022`). The application may only
propose transitions the trigger already allows.

```
                 ┌── withdrawn        (contributor, own flag, via RLS)
open ────────────┤
                 └── under_review ────┬── accepted
                                      ├── rejected
                                      └── duplicate
```

Terminal states have no exit. There is no DELETE policy on `flags`: the register
is append-only, and a mistaken decision is corrected by a new report, never by
erasing the old one.

| Transition                                               | Who                                | How                                     |
| -------------------------------------------------------- | ---------------------------------- | --------------------------------------- |
| _(create)_ → `open`                                      | anyone, proof of work verified     | `POST /v2/flags`                        |
| `open` → `withdrawn`                                     | the contributor, on their own flag | RLS policy `flags_contributor_withdraw` |
| `open` → `under_review`                                  | moderator                          | `PATCH /v2/flags/{id}`                  |
| `under_review` → `accepted` \| `rejected` \| `duplicate` | moderator                          | `PATCH /v2/flags/{id}`                  |

**A moderator is an account, not a form.** Sign-in is the same magic link every
visitor uses; the role comes from `contributor_profiles.moderator_role ∈
{editor, senior_editor, admin}`. There is no separate credential to hold and no
password anywhere in the product.

**Moderator writes go through the service-role admin client**, server-side only.
RLS deliberately gives a contributor no path to a status transition, so the
authorization check lives in the handler and is the only thing standing between
a session and a state change. It must therefore be explicit, tested, and refuse
by default.

Every transition writes an `audit_log` entry. A register that records decisions
without recording who made them is not auditable.

---

## 5. What the public sees at each state

The register at `/fr/signalements` is public at every state, including `open`.
Publishing only resolved reports would let the atlas choose which criticism
exists.

| State          | Shown publicly                       | Moderator note |
| -------------- | ------------------------------------ | -------------- |
| `open`         | the report, its target, its date     | none yet       |
| `under_review` | same, marked as being examined       | optional       |
| `accepted`     | same, marked accepted                | **required**   |
| `rejected`     | same, marked rejected                | **required**   |
| `duplicate`    | same, pointing at the original       | **required**   |
| `withdrawn`    | the fact of withdrawal, not the text | none           |

**A terminal decision carries its reason.** Accepting or rejecting in silence
tells the reader their report was read and nothing more. The note is what makes
the register a conversation rather than a bin.

The report's own text is published as written, under the contributor's name when
one is attributed and as _anonyme_ otherwise. A report is not a signed
contribution to the corpus — it is a message about it — which is why it does not
carry the CC-BY-SA consent that an authored contribution does.

---

## 6. What the reader is told back

The reader who sends a report receives, in the dialog and without navigating:
the confirmation, and the public slug of their report. That slug is the whole
feedback loop for a reader who left no address: a stable URL they can return to,
where the status is shown and kept up to date.

**E-mail notification on the decision is now part of the minimum**, for the
reader who asked for it. This section used to say the opposite — that it
"presupposes an address, which §2 deliberately does not collect", and that it
"belongs to the account path". Both halves are void: §2 collects an optional
address, and there is no account path any more.

What was true and stayed true is that the confirmation panel must not promise
what the atlas cannot deliver. It said "vous recevrez un email quand la
modération aura tranché" to every reader, including the ones who had left no
address and to whom nothing could ever be sent. It now says one thing to a reader
who left an address — confirm it — and another to a reader who did not.

A decision is sent only to a **confirmed** address. An unconfirmed one is treated
as belonging to someone who never reported anything, because it may.

---

## 7. What this charter does not settle

Named here so the gaps are visible rather than discovered:

- **Revisions.** Accepting a report should produce a correction to the corpus.
  The `revision_drafts` table and `RevisionDrawer` exist and are wired to
  nothing. Until that loop closes, `accepted` means "the atlas agrees", not "the
  atlas has fixed it", and the note must say which.
- **Rate limiting.** Anonymous reporting makes it a prerequisite rather than a
  refinement.
- **The three role models.** `user_roles`, `contributor_profiles.moderator_role`
  and `api_keys.tier` did not interoperate, and only the second opened any door
  — badly: it lived on a row the sign-in wrote under `id` while every reader
  queried `user_id`, so no profile was ever found and nobody ever held a role.
  The console now authorizes against `admin_allowlist` and reads none of the
  three. `moderator_role` survives for `revision_drafts` RLS; unifying what is
  left is still open.
- **The legacy `contributions` stack** and the Typeform on `/fr/report-error`
  are two further report paths that bypass this one entirely. Their retirement
  is a separate decision.
