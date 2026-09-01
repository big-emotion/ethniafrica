/**
 * ajv-backed validation against the /v2 OpenAPI spec (src/lib/api/openapiV2.ts),
 * plus a minimal example generator used to drive the contract suite without
 * hand-maintaining a fixture per endpoint.
 *
 * $ref resolution trick: every schema/ref in openapiV2.ts is written relative
 * to the document root (`#/components/schemas/X`). Ajv has no notion of that
 * root on its own, so each call wraps the target schema together with the
 * spec's `components` under one throwaway root object — `$ref` then resolves
 * exactly as it would in a real OpenAPI tool, with no schema registry to keep
 * in sync.
 */
import Ajv, { type ErrorObject, type Schema } from "ajv";
import addFormats from "ajv-formats";
import { swaggerSpecV2 } from "@/lib/api/openapiV2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonSchema = Record<string, any>;

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const components =
  (swaggerSpecV2 as { components?: JsonSchema }).components ?? {};

/**
 * Validate `payload` against `schema` (a schema object or a `{ $ref }`
 * pointing into the spec's components). Returns `null` on success, or the
 * ajv error list otherwise.
 */
// @req REQ-033
export function validateAgainstSchema(
  schema: JsonSchema,
  payload: unknown
): ErrorObject[] | null {
  const rootSchema: Schema = { ...schema, components };
  const validate = ajv.compile(rootSchema);
  const valid = validate(payload);
  return valid ? null : (validate.errors ?? []);
}

function resolveRef(ref: string): JsonSchema {
  const name = ref.replace("#/components/schemas/", "");
  const resolved = components.schemas?.[name];
  if (!resolved) {
    throw new Error(`openapiValidator: unresolved $ref "${ref}"`);
  }
  return resolved;
}

function mergeAllOf(schemas: JsonSchema[]): JsonSchema {
  const merged: JsonSchema = { type: "object", properties: {}, required: [] };
  for (const part of schemas) {
    const resolved = part.$ref ? resolveRef(part.$ref) : part;
    Object.assign(merged.properties, resolved.properties ?? {});
    merged.required = [...merged.required, ...(resolved.required ?? [])];
  }
  merged.required = [...new Set(merged.required)];
  return merged;
}

/**
 * Generate the smallest instance that satisfies `schema`: every required
 * property is filled, nothing optional is added. Good enough to drive a
 * mocked handler and to feed straight back into `validateAgainstSchema` — it
 * is not a fuzzer, just a way to avoid writing ~40 fixtures by hand.
 */
// @req REQ-033
export function generateExample(
  schema: JsonSchema,
  seen: Set<string> = new Set()
): unknown {
  if (schema.$ref) {
    const name = schema.$ref.replace("#/components/schemas/", "");
    if (seen.has(name)) return {};
    return generateExample(resolveRef(schema.$ref), new Set(seen).add(name));
  }
  if (schema.allOf) return generateExample(mergeAllOf(schema.allOf), seen);
  if (schema.example !== undefined) return schema.example;
  if (schema.enum) return schema.enum[0];
  if (schema.const !== undefined) return schema.const;
  if (schema.oneOf) return generateExample(schema.oneOf[0], seen);
  if (schema.anyOf) return generateExample(schema.anyOf[0], seen);

  const type = Array.isArray(schema.type)
    ? (schema.type.find((t: string) => t !== "null") ?? schema.type[0])
    : schema.type;

  switch (type) {
    case "object": {
      const properties = schema.properties ?? {};
      const required: string[] = schema.required ?? Object.keys(properties);
      const obj: Record<string, unknown> = {};
      for (const key of required) {
        if (properties[key]) obj[key] = generateExample(properties[key], seen);
      }
      return obj;
    }
    case "array": {
      if (schema.maxItems === 0) return [];
      if (!schema.items) return [];
      const count = Math.max(1, schema.minItems ?? 1);
      return Array.from({ length: count }, () =>
        generateExample(schema.items, seen)
      );
    }
    case "string":
      if (schema.format === "date-time") return "2026-01-01T00:00:00.000Z";
      if (schema.format === "date") return "2026-01-01";
      if (schema.format === "uuid")
        return "3fa85f64-5717-4562-b3fc-2c963f66afa6";
      if (schema.format === "uri" || schema.format === "url")
        return "https://ethniafrica.com/example";
      return "example-string";
    case "integer":
    case "number":
      return typeof schema.minimum === "number" ? schema.minimum : 0;
    case "boolean":
      return true;
    case "null":
      return null;
    default:
      return null;
  }
}
