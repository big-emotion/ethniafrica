import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin";

async function checkMigration() {
  const supabase = createAdminClient();

  console.log("🔍 Vérification de la migration...\n");

  // Check language families count
  const { count, error: countError } = await supabase
    .from("afrik_language_families")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("❌ Erreur:", countError);
    return;
  }

  console.log(`📊 Nombre de familles linguistiques: ${count}`);

  // Get FLG_AFROASIATIQUE
  const { data: afro, error: afroError } = await supabase
    .from("afrik_language_families")
    .select("id, name_fr, content")
    .eq("id", "FLG_AFROASIATIQUE")
    .single();

  if (afroError) {
    console.error("❌ Erreur FLG_AFROASIATIQUE:", afroError);
  } else {
    console.log("\n📝 FLG_AFROASIATIQUE:");
    console.log("  ID:", afro?.id);
    console.log("  Nom:", afro?.name_fr);
    console.log("  Speakers (raw):", afro?.content?.generalInfo?.totalSpeakers);
    console.log("  Type:", typeof afro?.content?.generalInfo?.totalSpeakers);
    console.log("  Aires géo:", afro?.content?.generalInfo?.geographicArea);
    console.log("  Peuples:", afro?.content?.associatedPeoples?.length);
    console.log("\n  Content complet:");
    console.log(JSON.stringify(afro?.content, null, 2));
  }

  // Get FLG_BANTU
  const { data: bantu, error: bantuError } = await supabase
    .from("afrik_language_families")
    .select("id, name_fr, content")
    .eq("id", "FLG_BANTU")
    .single();

  if (bantuError) {
    console.error("❌ Erreur FLG_BANTU:", bantuError);
  } else {
    console.log("\n📝 FLG_BANTU:");
    console.log("  ID:", bantu?.id);
    console.log("  Nom:", bantu?.name_fr);
    console.log(
      "  Speakers (raw):",
      bantu?.content?.generalInfo?.totalSpeakers
    );
    console.log("  Type:", typeof bantu?.content?.generalInfo?.totalSpeakers);
    console.log("  Peuples:", bantu?.content?.associatedPeoples?.length);
  }
}

checkMigration();
