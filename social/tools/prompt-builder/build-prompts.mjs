// Génère Guides/prompts-a-coller-<date>.md : un bloc complet et autonome par
// contenu à produire, pour n'avoir qu'un seul copier-coller par session.
//
// CE FICHIER NE CONTIENT AUCUN TEXTE DE PROMPT. Il extrait les trois prompts
// canoniques de Guides/prompts-production-2026-09-09.md et se contente de les
// spécialiser. Si la doctrine change, on modifie le fichier canonique et on
// relance ce script : on n'édite jamais le fichier généré.
//
//   node social/tools/prompt-builder/build-prompts.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUIDES = join(HERE, "..", "..", "Guides");
const SOURCE = join(GUIDES, "prompts-production-2026-09-09.md");
const TARGET = join(GUIDES, "prompts-a-coller-2026-09-10.md");
const TARGET_FIN = join(GUIDES, "prompts-finition-2026-09-10.md");
const TARGET_VAL = join(GUIDES, "prompts-validation-2026-09-10.md");

const md = readFileSync(SOURCE, "utf8").split("\n");

/** Premier bloc ``` qui suit un titre commençant par `prefix`. */
function block(prefix, skip = 0) {
  let start = -1;
  for (let i = 0, seen = 0; i < md.length; i++) {
    if (md[i].startsWith(prefix)) {
      if (seen++ === skip) {
        start = i;
        break;
      }
    }
  }
  if (start < 0)
    throw new Error(`titre introuvable : ${prefix} (skip ${skip})`);
  const open = md.indexOf("```", start);
  if (open < 0) throw new Error(`bloc introuvable sous : ${prefix}`);
  const close = md.indexOf("```", open + 1);
  if (close < 0) throw new Error(`bloc non fermé sous : ${prefix}`);
  return md
    .slice(open + 1, close)
    .join("\n")
    .trimEnd();
}

const VIDEO = block("### 03 · Le prompt de tournage");
const CARROUSEL = block("### 00 · Le prompt commun");
const SERIE = block("### Le prompt, à coller tel quel");
const FINITION = block("### Le prompt, à coller tel quel", 1);
const VALIDATION = block("### Le prompt, à coller tel quel", 2);

const SEP =
  "────────────────────────────  LE SUJET  ────────────────────────────";

/** Le prompt des treize, dont la matière est ailleurs que dans les treize. */
function video(sujet, matiere, particulier) {
  const head = VIDEO.replace(
    /^VIDÉO N° ___.*$/m,
    `SUJET : ${sujet}\n\nCE SUJET N'EST PAS DANS LES TREIZE. Il n'a pas de numéro, et le tableau de\nproduction-list ne le porte pas. Sa matière est indiquée plus bas, et elle\nremplace les lignes « production-list », « narrations » et « legendes-110 » de\nla liste de lecture ci-dessous. Tout le reste du prompt s'applique tel quel.`
  );
  return [head, "", SEP, matiere.trimEnd(), "", particulier.trimEnd()].join(
    "\n"
  );
}

const SIX = `  Guides/narrations-six-2026-09-10.md          la narration, section du sujet
  Guides/direction-image-six-2026-09-10.md     quoi photographier, section du sujet
  Guides/legendes-six-2026-09-10.md            les cinq légendes, section du sujet`;

const ORAL = `PARTICULIER À CES SUJETS RÉCENTS
  Ces narrations sont approuvées mais récentes : elles ne sont pas gelées au sens
  des neuf premières. Si tu trouves une erreur de fond, tu la signales et tu
  t'arrêtes, tu ne corriges pas toi-même.
  L'entrée dans 00-Index/publications.json existe déjà, statut a-produire, avec
  son renderedFrom à remplir et son dossier de destination déjà créé.`;

const items = [];

items.push({
  n: 1,
  id: "bantou-les-gens",
  forme: "vidéo",
  projet: "Bantu-V5",
  titre:
    "« Bantou » veut dire « les gens ». Du Cameroun à l'Afrique du Sud, c'est devenu le nom de cinq cents langues.",
  etat: "prêt",
  corps: video(
    "Bantou, le mot et les noms.",
    `  Guides/bantou-2026-09-09.md                  la narration en huit temps ET les légendes
  Projects/Bantu-V5/post-source.json           la permission d'extrait, et ses obligations`,
    `PARTICULIER À CE SUJET, ET CE POINT EST CONTRACTUEL
  La permission de reprise du post a été accordée le 9 septembre 2026 par Pierre
  André Edzoa Ndengue. Le crédit nommé est OBLIGATOIRE à l'écran et dans les
  légendes Instagram, Facebook et LinkedIn. Une production qui l'omet ne sort pas.
  Le temps 7 est la relance, pas l'ouverture : c'est le changement par rapport à
  l'ancien montage v5, et il ne se redéplace pas.
  Projects/Bantu-V5/ contient l'ancienne production. Tu ne la reprends pas :
  gabarit neuf, rendu neuf. Elle sert de référence de voix et de sources.`
  ),
});

items.push({
  n: 2,
  id: "akan-quatre-noms",
  forme: "carrousel, 7 cartes",
  projet: "Akan-Quatre-Noms",
  titre:
    "Ashanti, Baoulé, Agni, Fanté : du Ghana à la Côte d'Ivoire, un seul peuple d'origine.",
  etat: "prêt",
  corps: [
    CARROUSEL,
    "",
    `SUJET : Ashanti, Baoulé, Agni, Fanté, un seul peuple d'origine.
Campagne : akan-quatre-noms
Pilier : Le vrai nom · 7 cartes
Cartes : Guides/narrations-six-2026-09-10.md, section B.
Direction d'image : Guides/direction-image-six-2026-09-10.md, section B.
Légendes : Guides/legendes-six-2026-09-10.md, section B.

PARTICULIER À CE SUJET
  Respecte les graphies : Asante et Mfantse sont les noms que ces peuples se
  donnent, Ashanti, Fanti et Agni sont les formes étrangères, et cette
  différence est tout le propos du carrousel.
  Sept cartes, on n'en ajoute pas.
  Deux cartes sur sept reposent sur un récit rapporté, Fanté et Baoulé, et leur
  ligne de source le dit. Ne la retire pas pour gagner de la place.`,
  ].join("\n"),
});

for (const [id, sujet, particulier] of [
  [
    "sawa-douala",
    "Sawa, le peuple avant la ville.",
    `PARTICULIER À CE SUJET
  Un carton « forme » Duàlá avec ses accents, que la voix ne rend pas.
  Un carton « mot » sawa avec son sens : le rôle échoue sans lui, c'est un
  contrôle du moteur.
  Aucune image ni aucune phrase ne doit évoquer une origine nubienne ou
  égyptienne : ce récit est écarté du script et il ne revient pas par l'image.`,
  ],
  [
    "vodun-esprit",
    "Vodun, l'esprit, et le mot qu'Haïti a gardé.",
    `PARTICULIER À CE SUJET, ET C'EST LE PLUS EXPOSÉ
  Aucune image sensationnaliste, aucune mise en scène de possession filmée comme
  une curiosité, aucun cliché d'horreur. C'est une religion pratiquée par des
  millions de personnes et reconnue par deux États.
  Photographie des cérémonies publiques, jamais un rite fermé.
  Cette vidéo se publie AVANT celle du zombie, dont elle porte l'amorce.`,
  ],
]) {
  items.push({
    n: items.length + 1,
    id,
    forme: "vidéo",
    projet: id === "sawa-douala" ? "Sawa-Douala" : "Vodun-Esprit",
    titre:
      id === "sawa-douala"
        ? "Au Cameroun, Douala est le nom d'un peuple avant d'être celui d'une ville."
        : "Au Bénin, vodun veut dire esprit. Haïti a gardé le mot.",
    etat: "prêt",
    corps: video(sujet, SIX, `${ORAL}\n\n${particulier}`),
  });
}

for (const [id, sujet, titre, bloque] of [
  [
    "mami-wata",
    "Mami Wata, et le nom anglais d'une divinité africaine.",
    "Au Bénin comme au Cameroun, Mami Wata porte un nom anglais.",
    "le prompt 10 de prompts-production, l'ancrage de Mami Wata dans le corpus",
  ],
  [
    "zombie-bantou",
    "Zombie, le mot bantou passé par Haïti.",
    "Le premier film de zombies est américain. Le mot, lui, est bantou.",
    "le prompt 11 de prompts-production, l'ancrage du mot zombie dans le corpus",
  ],
]) {
  items.push({
    n: items.length + 1,
    id,
    forme: "vidéo",
    projet: id === "mami-wata" ? "Mami-Wata" : "Zombie-Bantou",
    titre,
    etat: `**bloqué** tant que ${bloque} n'a pas abouti`,
    corps: video(
      sujet,
      SIX,
      `${ORAL}\n\nCE SUJET EST BLOQUÉ ET TU NE LE PRODUIS PAS ENCORE\n  Le corpus ne porte pas encore ce sujet, donc la vidéo n'a pas de fiche à\n  pointer. Vérifie l'ancrage AVANT toute chose : s'il n'est pas en ligne, tu me\n  le dis et tu t'arrêtes. Voir ${bloque}.`
    ),
  });
}

const SERIE_SUJETS = [
  [1, "Kongo", "kongo-quatre-pays"],
  [2, "Soninké", "soninke-onze-pays"],
  [3, "Wolof", "wolof-trois-pays"],
  [4, "Peul", "peul-douze-pays"],
  [5, "Malinké", "malinke-six-pays"],
  [6, "Mossi", "mossi-six-pays"],
  [7, "Sérère", "serere-trois-pays"],
  [8, "Bambara", "bambara-cinq-pays"],
  [9, "Dioula", "dioula-cinq-pays"],
  [10, "Songhaï et Zarma", "songhai-zarma"],
  [11, "Haoussa", "hausa-huit-pays"],
  [12, "Yoruba", "yoruba-cinq-pays"],
  [13, "Teke", "teke-trois-pays"],
  [14, "Fang", "fang-quatre-pays"],
  [15, "Sara", "sara-trois-pays"],
  [16, "Amazigh", "amazigh-neuf-pays"],
  [17, "Kabyles", "kabyle-france"],
  [18, "Touareg", "touareg-cinq-pays"],
  [19, "La Tanzanie", "tanzanie-densite"],
];

const SERIE_ETAT = {
  15: "prêt, à écrire sans prendre parti dans le clivage nord-sud tchadien",
  16: "prêt, mais c'est un macro-groupe et la carte 2 doit le dire",
  17: "**bloqué**, vingt-deux sources sur vingt-cinq en attente de revue : curation d'abord",
  18: "prêt sous la doctrine de pluralité, sans un mot sur les conflits contemporains",
};

const TITRES = {};
for (const l of readFileSync(
  join(GUIDES, "..", "..", "00-Index", "publications.json"),
  "utf8"
).match(/"id": "[^"]+",\n\s+"dir"[\s\S]*?"title": "[^"]*"/g) || []) {
  const id = l.match(/"id": "([^"]+)"/)[1];
  const t = l.match(/"title": "([^"]*)"/)[1];
  TITRES[id] = t;
}

for (const [n, nom, campagne] of SERIE_SUJETS) {
  items.push({
    n: items.length + 1,
    id: campagne,
    forme: "carrousel, 7 cartes",
    projet: campagne,
    titre: TITRES[campagne] || nom,
    etat: SERIE_ETAT[n] || "prêt",
    corps: SERIE.replace(
      "carrousel numéro <N>",
      `carrousel numéro ${n}`
    ).replace("« <Nom> »", `« ${nom} »`),
  });
}

const out = [
  "# Les vingt-cinq prompts à coller, un par contenu",
  "",
  "**Fichier généré. Ne pas l'éditer à la main.**",
  "Il est produit par `social/tools/prompt-builder/build-prompts.mjs`, qui",
  "extrait les trois prompts canoniques de `prompts-production-2026-09-09.md` et",
  "les spécialise. La doctrine vit dans le fichier canonique ; celui-ci n'est",
  "qu'une commodité de copier-coller. Si la doctrine change, on relance le script.",
  "",
  "Un bloc, une session, un contenu. Il n'y a rien à composer et rien à compléter",
  "sauf ce que le bloc demande explicitement.",
  "",
  `**Vingt-cinq contenus : cinq vidéos et vingt carrousels.** Trois sont bloqués et`,
  "le disent en tête de leur bloc.",
  "",
  "---",
  "",
];

for (const it of items) {
  out.push(`## ${it.n} · ${it.titre}`, "");
  out.push(
    `_${it.forme} · \`${it.id}\` · projet \`${it.projet}\` · ${it.etat}_`,
    ""
  );
  out.push("```", it.corps, "```", "", "---", "");
}

out.push(
  `_Généré le 10 septembre 2026 depuis \`prompts-production-2026-09-09.md\`._`
);
writeFileSync(TARGET, out.join("\n") + "\n", "utf8");
console.log(`${items.length} prompts écrits dans ${TARGET}`);

const FINITIONS = [
  [
    "bantou-cent-soixante-dix",
    "carrousel",
    "Familles-Bantu",
    "24 images livrées, ligne de licence manquante",
  ],
  [
    "noms-refuses-ameriques",
    "carrousel",
    "Peuples-diaspora",
    "24 images livrées, ligne de licence manquante",
  ],
  [
    "noms-de-metier",
    "carrousel",
    "Noms-metiers",
    "21 images livrées, ligne de licence manquante",
  ],
  [
    "noms-imposes",
    "carrousel",
    "Peuples-exonymes",
    "21 images livrées, ligne de licence manquante",
  ],
  [
    "villes-ville",
    "carrousel",
    "Villes-Serie",
    "21 images livrées, ligne de licence manquante",
  ],
  [
    "alliances-maliennes",
    "carrousel",
    "Noms-alliances",
    "20 images livrées, ligne de licence manquante",
  ],
  [
    "peul-fula-fulani",
    "carrousel",
    "Peuples-Peul",
    "20 images livrées, ligne de licence manquante",
  ],
  [
    "noms-de-commerce",
    "carrousel",
    "Peuples-commerce",
    "18 images livrées, ligne de licence manquante",
  ],
  [
    "mercator",
    "carrousel",
    "Carrousel-Mercator",
    "15 images livrées, ligne de licence manquante",
  ],
  [
    "benin-royaume",
    "carrousel",
    "Pays-Benin",
    "15 images livrées, ligne de licence manquante",
  ],
];

const fin = [
  "# Les prompts de finition, un par publication qui dort en brouillon",
  "",
  "**Fichier généré. Ne pas l'éditer à la main.**",
  "Produit par `social/tools/prompt-builder/build-prompts.mjs` depuis la",
  "section 15 de `prompts-production-2026-09-09.md`, qui porte la doctrine.",
  "",
  "Ces publications sont DÉJÀ produites. On ne reproduit rien : on complète ce qui",
  "manque, on repose, on s'arrête. Dix carrousels attendent la même chose, une",
  "ligne de licence que le moteur calcule et que personne n'a recopiée.",
  "",
  "**Trois vidéos ne sont pas ici et n'y seront pas** : `baka-pygmees`,",
  "`bingerville-kong` et `libreville-52` attendent une oreille humaine, pas une",
  "session. Sous un tempo de 0,85, aucune machine de la chaîne ne peut entendre si",
  "la voix souffre.",
  "",
  "---",
  "",
];

FINITIONS.forEach(([slug, forme, projet, manque], i) => {
  fin.push(`## ${i + 1} · ${slug}`, "");
  fin.push(`_${forme} · projet \`${projet}\` · ${manque}_`, "");
  fin.push(
    "```",
    FINITION.replace("« <slug> »", `« ${slug} »`),
    "```",
    "",
    "---",
    ""
  );
});

fin.push(
  "_Généré le 10 septembre 2026 depuis la section 15 de `prompts-production-2026-09-09.md`._"
);
writeFileSync(TARGET_FIN, fin.join("\n") + "\n", "utf8");
console.log(
  `${FINITIONS.length} prompts de finition écrits dans ${TARGET_FIN}`
);

const A_VALIDER = [
  ["traore-diop", ""],
  ["sanankuya", ""],
  [
    "senegal-correction",
    "se valide, mais ne se publie qu'après la fusion de `b3dcda67` sur `recette`",
  ],
  ["krou-klao", ""],
  ["bassa-deux-langues", ""],
  ["azande-fleur", ""],
  ["baka-pygmees", "**écoute attentive** : tempo 0,66"],
  ["nzebi-clans", ""],
  ["lesotho-botswana", ""],
  ["libreville-52", "**écoute attentive** : tempo 0,79"],
  ["bingerville-kong", "**écoute attentive** : tempo 0,74"],
  [
    "congo-onze-villes",
    "se publie AVANT `brazzaville-mfoa`, dont elle porte l'amorce",
  ],
  ["brazzaville-mfoa", "ne se publie qu'après `congo-onze-villes`"],
  ["baoule-ashanti", ""],
];

const val = [
  "# Les prompts de passage en validé",
  "",
  "**Fichier généré. Ne pas l'éditer à la main.**",
  "Produit par `social/tools/prompt-builder/build-prompts.mjs` depuis la",
  "section 16 de `prompts-production-2026-09-09.md`, qui porte la doctrine.",
  "",
  "**Aucun dossier ne se déplace à la main.** Le bac est déduit du statut : on",
  "change le statut, `migrate-library.mjs` déplace le dossier pour suivre.",
  "",
  "**Une session ne valide rien.** Elle contrôle, elle te montre, elle attend ton",
  "oui, et alors seulement elle change le statut. Un post, un oui, jamais un lot.",
  "",
  "Avant de coller quoi que ce soit : `node 00-Index/pret-a-valider.mjs`.",
  "",
  "---",
  "",
];

A_VALIDER.forEach(([slug, note], i) => {
  val.push(`## ${i + 1} · ${slug}`, "");
  val.push(`_vidéo${note ? ` · ${note}` : ""}_`, "");
  val.push("```", VALIDATION.split("<slug>").join(slug), "```", "", "---", "");
});

val.push(
  "_Généré le 10 septembre 2026 depuis la section 16 de `prompts-production-2026-09-09.md`._"
);
writeFileSync(TARGET_VAL, val.join("\n") + "\n", "utf8");
console.log(
  `${A_VALIDER.length} prompts de validation écrits dans ${TARGET_VAL}`
);
