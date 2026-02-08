import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { loadAllLanguageFamilies } from "@/lib/afrik/loaders/languageFamilyLoader";

async function test() {
  try {
    console.log("Loading language families...");
    const families = await loadAllLanguageFamilies();
    console.log(`Found ${families.length} families`);

    if (families.length > 0) {
      const first = families[0];
      console.log("\nFirst family:");
      console.log("  ID:", first.id);
      console.log("  Name:", first.nameFr);
      console.log("  Speakers:", first.content.generalInfo?.totalSpeakers);
      console.log(
        "  Geographic areas:",
        first.content.generalInfo?.geographicArea
      );
    }
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
  }
}

test();
