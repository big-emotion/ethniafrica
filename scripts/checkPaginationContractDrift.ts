#!/usr/bin/env tsx
/**
 * REQ-110 — Guard against drift between the documented pagination contract
 * (OpenAPI `perPage` parameter, sourced from the `@swagger` JSDoc blocks on
 * each list route) and the bounds actually enforced at runtime by
 * `validatePerPage` (src/api/v2/utils/validation.ts).
 *
 * A silently dropped or desynced page-size parameter is a public API
 * contract violation (see ETNI-1201); this check makes that drift fail CI
 * instead of shipping unnoticed.
 *
 * Usage: tsx scripts/checkPaginationContractDrift.ts
 */

import path from "node:path";
import { validatePerPage } from "../src/api/v2/utils/validation";

export interface PerPageBounds {
  default: number;
  maximum: number;
}

/** Derive the runtime-enforced perPage bounds directly from validatePerPage. */
export function getRuntimePerPageBounds(): PerPageBounds {
  return {
    default: validatePerPage(undefined),
    maximum: validatePerPage(String(Number.MAX_SAFE_INTEGER)),
  };
}

interface OpenAPIParameter {
  name?: string;
  in?: string;
  schema?: { default?: number; maximum?: number };
}

interface OpenAPIOperation {
  parameters?: OpenAPIParameter[];
}

export interface OpenAPISpec {
  paths?: Record<string, Record<string, OpenAPIOperation>>;
}

export interface DriftOffender {
  path: string;
  method: string;
  field: "default" | "maximum";
  documented: number | undefined;
  runtime: number;
}

/**
 * Compare every documented `perPage` query parameter against the bounds
 * `validatePerPage` actually enforces. Only endpoints that document a
 * `perPage` parameter are checked — endpoints without pagination are not
 * offenders.
 */
export function findPaginationDriftOffenders(
  spec: OpenAPISpec,
  runtimeBounds: PerPageBounds
): DriftOffender[] {
  const offenders: DriftOffender[] = [];
  const paths = spec.paths ?? {};

  for (const [pathKey, operations] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(operations)) {
      const perPageParam = operation.parameters?.find(
        (parameter) => parameter.name === "perPage" && parameter.in === "query"
      );
      if (!perPageParam?.schema) continue;

      if (perPageParam.schema.default !== runtimeBounds.default) {
        offenders.push({
          path: pathKey,
          method: method.toUpperCase(),
          field: "default",
          documented: perPageParam.schema.default,
          runtime: runtimeBounds.default,
        });
      }
      if (perPageParam.schema.maximum !== runtimeBounds.maximum) {
        offenders.push({
          path: pathKey,
          method: method.toUpperCase(),
          field: "maximum",
          documented: perPageParam.schema.maximum,
          runtime: runtimeBounds.maximum,
        });
      }
    }
  }

  return offenders;
}

async function runCli(): Promise<void> {
  const { swaggerSpecV2 } = await import("../src/lib/api/openapiV2");
  const runtimeBounds = getRuntimePerPageBounds();
  const offenders = findPaginationDriftOffenders(
    swaggerSpecV2 as OpenAPISpec,
    runtimeBounds
  );

  if (offenders.length > 0) {
    for (const offender of offenders) {
      console.error(
        `check:pagination-contract — ${offender.method} ${offender.path}: documented perPage.${offender.field} ` +
          `(${offender.documented ?? "undefined"}) does not match the runtime-enforced value (${offender.runtime})`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `check:pagination-contract — OK (perPage default=${runtimeBounds.default}, maximum=${runtimeBounds.maximum} matches every documented endpoint)`
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  runCli();
}
