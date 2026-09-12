# link-builder — the tagged outbound link

The 2026-09-07 audience audit found that no outbound link from any network
carried a parameter. Every visit a video earned therefore landed in Plausible's
`Direct / None` bucket — the site's second largest, and the one with its best
visit duration — where a video that converted cannot be told from one that did
not. This directory is what closes that.

The scheme is that of the production guide `description-template-2026-09-09.md`,
which lives in the library. It is
not restated as prose here: `links.mjs` is its executable copy and
`links.test.mjs` holds the two together.

```
?utm_source=<youtube|tiktok|instagram|facebook|linkedin>
&utm_medium=social
&utm_campaign=<subject slug, identical on all five networks>
&utm_content=<video|carrousel|image|story|commentaire-epingle|bio>
```

## Use

```bash
node link-builder.mjs --path /fr/atlas/noms/PAT_TRAORE --campaign traore-diop
node link-builder.mjs --path /fr/jeux/mercator --campaign mercator --content carrousel
node link-builder.mjs --bio          # the five profile links, and where to paste them

node check-anchors.mjs               # calls all twenty retained destinations, live
node --test                          # the scheme's own suite
```

## Why the destination is called before anything is printed

A tagged link to a dead page is worse than an untagged one: the click the video
earned is spent, and the campaign reports as working.

A status check alone does not establish this. Measured on production
2026-09-09, `/fr/atlas/noms/PAT_NEXISTEPAS` answers **200** and renders the root
layout's fallback title — a soft 404. So the check reads the title too, and
refuses a page that answers with the site's default. It also refuses a page that
answered but arrived stripped of the tagging, which is the failure a redirect
produces silently.

## What lives where

| File                   | What it is                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `links.mjs`            | The scheme. Pure, so `00-Index/build-index.mjs` renders the same links into every `post.md` without shelling out.                                                                     |
| `links.test.mjs`       | What the scheme owes. A parameter renamed or reordered fails here.                                                                                                                    |
| `link-builder.mjs`     | The command. Verifies, then prints.                                                                                                                                                   |
| `productions.mjs`      | The twenty retained productions, reduced to a destination and a campaign slug.                                                                                                        |
| `check-anchors.mjs`    | Calls all twenty, live. Run it whenever the corpus moves — a fiche identifier that changes turns twenty tagged links into twenty spent clicks, and nothing else on disk would notice. |
| `seed-productions.mjs` | Files them into `00-Index/publications.json`. Idempotent.                                                                                                                             |

## What the site does with the parameters

Verified end to end on production, 2026-09-09.

Redirections carry the query, including the locale hop and the English-slug
rewrite. The one exception was a deep-link redirect — `/fr/atlas/pays?country=BEN`
— which dropped the **whole** query rather than the identifier it had spent;
fixed in the site repository the same day, tests in `src/__tests__/middleware.test.ts`.

Plausible receives the full URL. The page emits a cleaned canonical link, but
the tracker sends `location.href` and does not read it. The consent banner does
not reload, so the pageview fires after acceptance with the parameters intact.

## What no script here can do

The five bio links are installed inside the platforms. `--bio` prints them with
the path to each setting; a human pastes them.

Publications already online are not re-tagged. Editing a `post.md` does not
change a caption on YouTube, and a `post.md` for a published post says so
instead of printing links it cannot install.
