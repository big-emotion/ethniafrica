#!/usr/bin/env node
/**
 * Prints the tagged links for one subject, ready to paste.
 *
 *   node link-builder.mjs --path /fr/atlas/noms/PAT_TRAORE --campaign traore-diop
 *   node link-builder.mjs --path /fr/jeux/mercator --campaign mercator --content carrousel
 *   node link-builder.mjs --bio
 *
 * The page is called live before anything is printed. A tagged link to a dead
 * page is worse than an untagged one: the click is spent, and the campaign
 * reports as working. `--no-check` exists for writing offline and is a promise
 * to check later, not a way round the rule.
 */
import { buildLinks, buildBioLinks, verify, tag, NETWORKS } from "./links.mjs";

const BIO_INSTALL = {
  youtube: "YouTube Studio → Personnalisation → Informations de base → Liens",
  tiktok: "TikTok → Profil → Modifier le profil → Site web",
  instagram: "Instagram → Modifier le profil → Liens → Ajouter un lien externe",
  facebook: "Page Facebook → Modifier les infos → Site web",
  linkedin: "LinkedIn → Profil personnel → Modifier → Site web",
};

function readArguments(argv) {
  const parsed = { check: true };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--bio") parsed.bio = true;
    else if (token === "--no-check") parsed.check = false;
    else if (token.startsWith("--")) parsed[token.slice(2)] = argv[++i];
  }
  return parsed;
}

const options = readArguments(process.argv.slice(2));

if (options.bio) {
  const links = buildBioLinks(options.path ?? "/fr");
  if (options.check) await check(links);
  console.log("\nLiens de bio — à installer à la main sur les cinq profils\n");
  for (const { network, url } of links) {
    console.log(`  ${network}`);
    console.log(`    ${url}`);
    console.log(`    ${BIO_INSTALL[network]}\n`);
  }
  process.exit(0);
}

if (!options.path || !options.campaign) {
  console.error(
    "usage: node link-builder.mjs --path <chemin> --campaign <slug> [--content video|carrousel|image] [--no-check]"
  );
  process.exit(2);
}

const links = buildLinks({
  path: options.path,
  campaign: options.campaign,
  content: options.content ?? "video",
});

if (options.check) await check(links);

console.log(`\n${options.path} · campagne « ${options.campaign} »\n`);
for (const { network, content, url } of links) {
  console.log(`  ${network} · ${content}`);
  console.log(`    ${url}\n`);
}

/**
 * One call, not one per link: the seven differ only by two parameters the
 * server never reads, so seven requests would measure the same thing seven
 * times. The one call is made *with* the parameters, because a redirect eating
 * them is the failure this is guarding against.
 */
async function check(candidates) {
  const probe = candidates[0].url;
  let verdict;
  try {
    verdict = await verify(probe);
  } catch (error) {
    console.error(`\n  Site injoignable : ${error.message}`);
    console.error("  Rien n'est imprimé.\n");
    process.exit(1);
  }
  if (!verdict.ok) {
    console.error(`\n  ${probe}`);
    console.error(`  ${verdict.reason}. Aucun lien imprimé.\n`);
    process.exit(1);
  }
  console.log(`\n  ${verdict.reason}`);
}

export { tag, NETWORKS };
