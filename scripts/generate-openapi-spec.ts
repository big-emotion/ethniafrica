#!/usr/bin/env tsx
/**
 * Script to generate the OpenAPI specification to a JSON file.
 * Usage: tsx scripts/generate-openapi-spec.ts [output-path]
 *
 * Default output: openapi-spec.json
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import { swaggerSpecV2 } from "../src/lib/api/openapiV2";

const DEFAULT_OUTPUT = "openapi-spec.json";

function main(): void {
  const outputPath = process.argv[2] || DEFAULT_OUTPUT;
  const absolutePath = resolve(process.cwd(), outputPath);

  try {
    const specJson = JSON.stringify(swaggerSpecV2, null, 2);
    writeFileSync(absolutePath, specJson, "utf-8");
    console.log(`✅ OpenAPI spec written to: ${absolutePath}`);
  } catch (error) {
    console.error("❌ Failed to generate OpenAPI spec:", error);
    process.exit(1);
  }
}

main();
