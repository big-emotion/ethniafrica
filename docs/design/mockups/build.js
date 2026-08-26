/**
 * Assemble les maquettes publiables.
 *
 * Les pièces lourdes (moteur three.js, frontières admin-0, corpus AFRIK)
 * vivent une seule fois sur disque et sont injectées à la construction :
 * les fichiers de page restent lisibles et éditables à la main.
 */
const fs = require("fs");
const path = require("path");

const part = (f) => fs.readFileSync(path.join(__dirname, "parts", f), "utf8");

const THREE = part("three.inline.js");
const GEO = part("africa-admin0.json");
const CORPUS = part("corpus.json");
const AFRICA_PATH = part("africa-path.txt");
const SHELLCSS = part("globe-shell.css");
const NAVCORE = part("nav-core.js");
const GLOBECORE = part("globe-core.js");

const SLOTS = {
  "/*@THREE@*/": THREE,
  "/*@GEO@*/": GEO,
  "/*@CORPUS@*/": CORPUS,
  "/*@AFRICA_PATH@*/": AFRICA_PATH,
  "/*@SHELLCSS@*/": SHELLCSS,
  "/*@NAVCORE@*/": NAVCORE,
  "/*@GLOBECORE@*/": GLOBECORE,
};

fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });

for (const file of fs.readdirSync(path.join(__dirname, "pages"))) {
  let html = fs.readFileSync(path.join(__dirname, "pages", file), "utf8");
  for (const [slot, value] of Object.entries(SLOTS)) {
    html = html.split(slot).join(value);
  }
  const out = path.join(__dirname, "dist", file);
  fs.writeFileSync(out, html);
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`${file.padEnd(14)} ${kb.padStart(6)} KB`);
}
