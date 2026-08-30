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
send button. Cloudflare Turnstile is the control, verified server-side; it asks
the reader for nothing.

### Why no account

An account is a toll on the one gesture the atlas most wants to receive. It buys
three things, and none of them is needed for a first report:

- **attribution** — a benefit to the contributor, not a precondition;
- **follow-up** — the public slug already gives anyone a stable URL to watch;
- **anti-abuse** — magic-link accounts are free to create, so an account is a
  weak control where Turnstile and rate limiting are the real ones.

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
dialog can open saying _Fiche Bénin — Culture et société_ without asking.

The per-section controls stay. They serve the reader who wants to aim at
something narrower than a chapter.

A floating button detached from the reading would have been reachable and
context-free — it would have moved the "which part?" question from the page back
onto the reader, which is §1 again.

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
| _(create)_ → `open`                                      | anyone, Turnstile verified         | `POST /v2/flags`                        |
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
feedback loop for an anonymous reporter: a stable URL they can return to.

E-mail notification on state change is a real improvement and is **not** part of
this charter's minimum — it presupposes an address, which §2 deliberately does
not collect. It belongs to the account path, where an address already exists.

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
  and `api_keys.tier` do not interoperate; only the second one opens any door.
  This charter uses it and takes no position on unifying them.
- **The legacy `contributions` stack** and the Typeform on `/fr/report-error`
  are two further report paths that bypass this one entirely. Their retirement
  is a separate decision.
