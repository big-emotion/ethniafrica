#!/usr/bin/env tsx
/**
 * Script to compare OpenAPI specifications and detect breaking changes.
 * Usage: tsx scripts/openapi-diff.ts [baseline-path]
 *
 * If no baseline path is provided, fetches from main branch.
 * Exit codes:
 *   0 - No breaking changes OR api-breaking: true override
 *   1 - Breaking changes detected
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

// HTTP methods to check for endpoints
const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
];

interface OpenAPISpec {
  openapi?: string;
  info?: { title?: string; version?: string };
  paths?: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  enum?: string[];
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  $ref?: string;
}

/**
 * Compare two schemas and find removed properties or narrowed types.
 */
export function compareSchemas(
  baseline: SchemaObject | undefined,
  current: SchemaObject | undefined,
  path: string
): string[] {
  const changes: string[] = [];

  if (!baseline || !current) {
    return changes;
  }

  // Check for type changes
  if (baseline.type && current.type && baseline.type !== current.type) {
    changes.push(
      `Type changed at '${path}': ${baseline.type} → ${current.type}`
    );
  }

  // Check for removed properties in objects
  if (baseline.properties) {
    const baselineProps = Object.keys(baseline.properties);
    const currentProps = Object.keys(current.properties || {});

    for (const prop of baselineProps) {
      if (!currentProps.includes(prop)) {
        changes.push(`Removed property '${prop}' from schema '${path}'`);
      } else {
        // Recursively check nested properties
        const nestedChanges = compareSchemas(
          baseline.properties[prop],
          current.properties?.[prop],
          `${path}.${prop}`
        );
        changes.push(...nestedChanges);
      }
    }
  }

  // Check for narrowed enums
  if (baseline.enum && current.enum) {
    const removedValues = baseline.enum.filter(
      (v) => !current.enum!.includes(v)
    );
    if (removedValues.length > 0) {
      changes.push(
        `Narrowed enum in schema '${path}': removed values [${removedValues.join(", ")}]`
      );
    }
  }

  // Check array items
  if (baseline.items) {
    const itemChanges = compareSchemas(
      baseline.items,
      current.items,
      `${path}[items]`
    );
    changes.push(...itemChanges);
  }

  // Check allOf, oneOf, anyOf compositions
  for (const composition of ["allOf", "oneOf", "anyOf"] as const) {
    if (baseline[composition] && current[composition]) {
      const baselineSchemas = baseline[composition] as SchemaObject[];
      const currentSchemas = current[composition] as SchemaObject[];

      // Simple length check - if we removed schemas from composition it could be breaking
      if (baselineSchemas.length > currentSchemas.length) {
        changes.push(`Reduced ${composition} schemas at '${path}'`);
      }
    }
  }

  return changes;
}

/**
 * Find all breaking changes between baseline and current OpenAPI specs.
 */
export function findBreakingChanges(
  baseline: OpenAPISpec,
  current: OpenAPISpec
): string[] {
  const changes: string[] = [];

  // Check for removed endpoints
  const baselinePaths = baseline.paths || {};
  const currentPaths = current.paths || {};

  for (const path of Object.keys(baselinePaths)) {
    if (!currentPaths[path]) {
      // Entire path removed - report all methods
      const methods = Object.keys(baselinePaths[path]).filter((m) =>
        HTTP_METHODS.includes(m.toLowerCase())
      );
      for (const method of methods) {
        changes.push(`Removed endpoint: ${method.toUpperCase()} ${path}`);
      }
    } else {
      // Path exists, check for removed methods
      const baselineMethods = Object.keys(baselinePaths[path]).filter((m) =>
        HTTP_METHODS.includes(m.toLowerCase())
      );
      const currentMethods = Object.keys(currentPaths[path]).filter((m) =>
        HTTP_METHODS.includes(m.toLowerCase())
      );

      for (const method of baselineMethods) {
        if (!currentMethods.includes(method)) {
          changes.push(`Removed endpoint: ${method.toUpperCase()} ${path}`);
        }
      }
    }
  }

  // Check for removed or modified schemas
  const baselineSchemas = baseline.components?.schemas || {};
  const currentSchemas = current.components?.schemas || {};

  for (const schemaName of Object.keys(baselineSchemas)) {
    if (!currentSchemas[schemaName]) {
      changes.push(`Removed schema: ${schemaName}`);
    } else {
      // Compare schema properties
      const schemaChanges = compareSchemas(
        baselineSchemas[schemaName],
        currentSchemas[schemaName],
        schemaName
      );
      changes.push(...schemaChanges);
    }
  }

  return changes;
}

/**
 * Check if the override flag is set via environment variable or commit message.
 */
function hasOverride(): boolean {
  // Check environment variable
  if (process.env.API_BREAKING === "true") {
    return true;
  }

  // Check git commit message
  try {
    const commitMessage = execSync("git log -1 --pretty=%B", {
      encoding: "utf-8",
    });
    if (commitMessage.includes("api-breaking: true")) {
      return true;
    }
  } catch {
    // Git not available or not in a git repo - skip commit message check
  }

  return false;
}

/**
 * Fetch the baseline spec from the main branch.
 */
function fetchBaselineFromMain(): OpenAPISpec | null {
  try {
    // Try to get the spec file from main branch
    const specContent = execSync(
      "git show main:openapi-spec.json 2>/dev/null",
      {
        encoding: "utf-8",
      }
    );
    return JSON.parse(specContent);
  } catch {
    // Try origin/main if local main doesn't exist
    try {
      const specContent = execSync(
        "git show origin/main:openapi-spec.json 2>/dev/null",
        {
          encoding: "utf-8",
        }
      );
      return JSON.parse(specContent);
    } catch {
      console.log(
        "⚠️  Could not fetch baseline from main branch. Skipping diff."
      );
      return null;
    }
  }
}

async function main(): Promise<void> {
  // Dynamic import to avoid loading swagger spec during test imports
  const { swaggerSpecV2 } = await import("../src/lib/api/openapiV2");

  const baselinePath = process.argv[2];
  let baseline: OpenAPISpec | null = null;

  if (baselinePath) {
    const absolutePath = resolve(process.cwd(), baselinePath);
    if (!existsSync(absolutePath)) {
      console.error(`❌ Baseline file not found: ${absolutePath}`);
      process.exit(1);
    }
    try {
      baseline = JSON.parse(readFileSync(absolutePath, "utf-8"));
    } catch (error) {
      console.error(`❌ Failed to parse baseline file:`, error);
      process.exit(1);
    }
  } else {
    baseline = fetchBaselineFromMain();
  }

  if (!baseline) {
    console.log(
      "✅ No baseline available for comparison. Exiting successfully."
    );
    process.exit(0);
  }

  const current = swaggerSpecV2 as OpenAPISpec;

  console.log("🔍 Comparing OpenAPI specifications for breaking changes...\n");

  const breakingChanges = findBreakingChanges(baseline, current);

  if (breakingChanges.length === 0) {
    console.log("✅ No breaking changes detected.");
    process.exit(0);
  }

  console.log(`⚠️  Found ${breakingChanges.length} breaking change(s):\n`);
  for (const change of breakingChanges) {
    console.log(`  • ${change}`);
  }
  console.log();

  if (hasOverride()) {
    console.log(
      "ℹ️  Override flag detected (api-breaking: true). Allowing breaking changes."
    );
    process.exit(0);
  }

  console.log("❌ Breaking changes detected without override.");
  console.log("   To allow breaking changes, either:");
  console.log("   - Set environment variable: API_BREAKING=true");
  console.log("   - Include 'api-breaking: true' in your commit message");
  process.exit(1);
}

// Only run main when executed directly (not when imported)
if (require.main === module) {
  main();
}
