# AGENTS.md

Instructions for coding agents that do not load `CLAUDE.md` automatically (Codex under Ferry reads this file). `CLAUDE.md` is the full project instruction and the single source; this file carries only what an agent must know before its first edit and points there for everything else. Do not add a rule here that `CLAUDE.md` does not carry.

## What this repository is

**EthniAfrica** is a Next.js 16 App Router app publishing an open, sourced atlas of African peoples, languages, linguistic families and countries, organised by the AFRIK methodology in a decolonial editorial posture. The corpus is JSON fiches under `dataset/source/afrik/`, loaded into Supabase and served through `/api/v2`.

## The site is bilingual

The code supports two locales, `en` and `fr`, while publication fails closed to
French-only. Missing or invalid `SITE_LOCALE_MODE` means `fr-only` (REQ-140);
`bilingual-fr-default` may expose both without moving `/` away from French, and
`bilingual-en-default` is a later explicit launch decision. A reader's explicit
choice is remembered in the `ethni-locale` cookie, `/fr/*` resolves unchanged,
and English URLs use English slugs that the middleware rewrites onto the French
route folders (DEC-049).

Content added or changed in either language must carry its counterpart in the
other (REQ-145). A French corpus record may temporarily defer English only with
the non-empty source marker `_translation.deferred.en`. The blocking gate is
`npm run check:translation-parity`; translation rules live in
`.claude/skills/afrik-translator/`. This content readiness rule never changes
`SITE_LOCALE_MODE` and therefore never publishes unfinished English.

## Read `CLAUDE.md` for everything else

Architecture, commands, every CI gate, the `@req` traceability rule, the Source Tier policy, the reader-facing register, the worktree and branch discipline. The section `### Bilingual content` is the doctrine this file summarises.

## Local gate

```bash
make check                          # lint + typecheck + format:check + all tests
npm run lint:req                    # @req annotation traceability
npm run check:dead                  # knip ratchet
npm run check:translation-parity    # full-tree survey; non-blocking
npm run check:translation-parity -- --staged
```
