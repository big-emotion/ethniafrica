/**
 * Script pour invalider le cache Next.js
 * Usage: tsx scripts/invalidateCache.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function invalidateCache() {
  const revalidateSecret = process.env.REVALIDATE_SECRET;
  let apiUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Ajouter le protocole si manquant
  if (!apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
    apiUrl = `http://${apiUrl}`;
  }

  if (!revalidateSecret) {
    console.error("\n❌ REVALIDATE_SECRET not set in .env.local");
    console.error(
      "   Please add REVALIDATE_SECRET to .env.local to enable cache invalidation."
    );
    process.exit(1);
  }

  console.log("\n🔄 Invalidating Next.js cache...");
  console.log(`   URL: ${apiUrl}/api/admin/revalidate`);

  try {
    const response = await fetch(`${apiUrl}/api/admin/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${revalidateSecret}`,
      },
      body: JSON.stringify({
        tags: ["regions", "countries", "ethnicities", "population", "africa"],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log("✅ Cache invalidated successfully!");
    console.log(
      `   Invalidated tags: ${result.invalidatedTags?.join(", ") || "all"}`
    );
  } catch (error) {
    console.error("\n❌ Failed to invalidate cache:");
    console.error(
      "   Error:",
      error instanceof Error ? error.message : String(error)
    );
    console.error("\n   Make sure:");
    console.error("   1. The Next.js server is running");
    console.error("   2. REVALIDATE_SECRET is correct in .env.local");
    console.error(`   3. The server is accessible at ${apiUrl}`);
    process.exit(1);
  }
}

invalidateCache();
