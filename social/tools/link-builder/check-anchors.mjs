#!/usr/bin/env node
/**
 * Calls every retained production's destination page, live.
 *
 * Run it before writing links into the ledger, and again whenever the corpus
 * moves: a fiche identifier that changes turns twenty tagged links into twenty
 * spent clicks, and nothing else on disk would notice.
 *
 *   node check-anchors.mjs
 */
import { PRODUCTIONS } from "./productions.mjs";
import { tag, verify } from "./links.mjs";

let dead = 0;
for (const production of PRODUCTIONS) {
  const url = tag(production.path, "youtube", production.id, production.kind);
  const verdict = await verify(url);
  if (!verdict.ok) dead += 1;
  console.log(
    `${verdict.ok ? "  ok" : "DEAD"}  ${production.id.padEnd(24)} ${production.path.padEnd(46)} ${verdict.reason}`
  );
}

console.log(
  `\n${PRODUCTIONS.length} productions · ${dead} destination(s) morte(s).`
);
process.exit(dead ? 1 : 0);
