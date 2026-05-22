import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { swaggerSpecV2 } from "../src/lib/api/openapiV2";

const outputPath = path.resolve(process.cwd(), "public/openapi.json");

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(swaggerSpecV2, null, 2), "utf-8");
console.log(`OpenAPI 3.1 spec written to ${outputPath}`);
