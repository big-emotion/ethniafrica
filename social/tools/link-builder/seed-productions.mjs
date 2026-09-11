#!/usr/bin/env node
/**
 * Files the twenty retained productions into the ledger, each with the tagged
 * destination it will publish against.
 *
 * Run once. It is idempotent — a production already in `publications.json`
 * keeps whatever the operator has since written on it, and only its `links`
 * block is refreshed. A production is retained months before it is shot, and
 * the link has to exist by then: a link improvised at publication time is the
 * link that goes out untagged, which is the whole finding of the 2026-09-07
 * audience audit.
 *
 *   node seed-productions.mjs           # dry run, prints what would change
 *   node seed-productions.mjs --write
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PRODUCTIONS } from "./productions.mjs";
import { postRelPath } from "../../../00-Index/library-paths.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIBRARY = resolve(HERE, "../../..");
const LEDGER = join(LIBRARY, "00-Index/publications.json");
const PUBLICATIONS = join(LIBRARY, "02-Reseaux-sociaux");

const write = process.argv.includes("--write");

/**
 * The subject folder. It groups a subject's posts the way the library already
 * groups them — `Pays-Senegal`, `Peuples-Bantu` — so a production filed today
 * lands beside whatever that subject published before.
 */
function subjectFolder(subject) {
  return subject
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*·\s*/g, "-")
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));
const existing = new Map(ledger.posts.map((p) => [p.id, p]));

let added = 0;
let relinked = 0;
for (const production of PRODUCTIONS) {
  const links = {
    path: production.path,
    campaign: production.id,
    content: production.kind,
  };
  const known = existing.get(production.id);
  if (known) {
    known.links = links;
    relinked += 1;
    continue;
  }
  ledger.posts.push({
    id: production.id,
    dir: `${subjectFolder(production.subject)}/${production.id}`,
    title: production.title,
    subject: production.subject,
    pillar: production.pillar,
    status: "a-produire",
    // No date. The production list retains a subject and orders it; it does not
    // schedule it, and a date written here would be one this file invented.
    date: "",
    dateKind: "",
    videos: [],
    channels: {},
    views: "",
    notes: production.notes ?? "",
    links,
  });
  added += 1;
}

// The bucket is asked of `library-paths.mjs` rather than assumed here. Writing
// `Brouillon` by hand is how the first run put twenty folders where
// `build-index.mjs` does not look for them.
for (const post of ledger.posts) {
  if (post.status !== "a-produire") continue;
  const folder = join(PUBLICATIONS, postRelPath(post));
  if (existsSync(folder)) continue;
  console.log(`  dossier  ${postRelPath(post)}`);
  if (write) mkdirSync(folder, { recursive: true });
}

console.log(
  `\n${added} production(s) ajoutée(s), ${relinked} déjà présente(s) et re-liée(s).`
);
if (write) {
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + "\n");
  console.log(
    "publications.json réécrit. Lancer `node 00-Index/build-index.mjs`."
  );
} else {
  console.log("Essai à blanc. Relancer avec --write.");
}
