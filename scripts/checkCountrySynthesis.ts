/**
 * Run the synthesis derivation over the real corpus and report what it
 * yields, field by field.
 *
 * Unit tests prove the mapping is right on fixtures. This proves the corpus
 * actually fills it — the two are different questions, and the second is the
 * one that decides whether a card on the home renders or reads "—".
 */
import { loadAllCountries } from "@/lib/afrik/loaders/countryLoader";
import {
  deriveCountrySynthesis,
  hasRenderableSynthesis,
} from "@/lib/home/countrySynthesis";

async function main(): Promise<void> {
  const countries = await loadAllCountries();
  const syntheses = countries.map(deriveCountrySynthesis);

  const missing = {
    summary: syntheses.filter((s) => s.summary === null),
    formerNames: syntheses.filter((s) => s.formerNames.length === 0),
    peoples: syntheses.filter((s) => s.peoples.length === 0),
    languages: syntheses.filter((s) => s.languages.length === 0),
    kingdoms: syntheses.filter((s) => s.kingdoms.length === 0),
  };
  const unrenderable = syntheses.filter((s) => !hasRenderableSynthesis(s));

  console.log(`${syntheses.length} pays\n`);
  for (const [field, absent] of Object.entries(missing)) {
    const filled = syntheses.length - absent.length;
    const names = absent.map((s) => s.id).join(", ");
    console.log(
      `  ${field.padEnd(12)} ${String(filled).padStart(2)}/${syntheses.length}` +
        (names ? `   manquant : ${names}` : "")
    );
  }
  console.log(
    `\n  affichables  ${syntheses.length - unrenderable.length}/${syntheses.length}` +
      (unrenderable.length
        ? `   écartés : ${unrenderable.map((s) => s.id).join(", ")}`
        : "")
  );

  const sample = syntheses.find((s) => s.id === "BFA");
  if (sample) {
    console.log("\nExemple — BFA");
    console.log(`  chapeau  : ${sample.summary?.slice(0, 90)}…`);
    console.log(`  anciens  : ${sample.formerNames.join(" · ")}`);
    console.log(`  peuples  : ${sample.peoples.map((p) => p.name).join(", ")}`);
    console.log(`  langues  : ${sample.languages.join(", ")}`);
  }

  if (unrenderable.length > 0) process.exitCode = 1;
}

void main();
