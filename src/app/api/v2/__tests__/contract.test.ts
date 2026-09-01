/**
 * Contract suite for every documented `/api/v2/*` operation (ETNI-84 / FR33).
 *
 * Each operation is discovered from the OpenAPI spec (openapiV2.ts) and
 * cross-referenced against the actual route file on disk (routeRegistry.ts)
 * rather than hand-listed — a route added without a matching spec entry, or a
 * spec entry with no route behind it, is what the "spec <-> filesystem
 * drift" block below catches, in both directions, without anyone maintaining
 * a fixture list.
 *
 * Isolation (ETNI-1573): this suite never touches Supabase, Upstash, or any
 * other external system — it mocks the handler layer (`@/api/v2/handlers/*`)
 * exactly like the existing per-route tests already do (see countries.test.ts),
 * with the exact export names read off each route file's own imports rather
 * than hand-maintained. Every test calls `vi.resetModules()` and re-registers
 * its own `vi.doMock()` before importing the route module fresh, so no state
 * survives between tests: order and repetition cannot affect the result (see
 * the "test isolation" block, which asserts this directly).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { swaggerSpecV2 } from "@/lib/api/openapiV2";
import {
  generateExample,
  validateAgainstSchema,
} from "@/app/api/v2/__tests__/helpers/openapiValidator";
import {
  HTTP_METHODS,
  composeHandlerMockValue,
  discoverRoutes,
  extractHandlerImports,
  findRoute,
  invalidValueFor,
  type DiscoveredRoute,
  type HttpMethod,
} from "@/app/api/v2/__tests__/helpers/routeRegistry";
import { ROUTE_OVERRIDES } from "@/app/api/v2/__tests__/helpers/routeOverrides";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonSchema = Record<string, any>;

interface PathParamValue {
  /** The name the spec's @swagger block gives this parameter, e.g. "public_slug_or_id". */
  specName: string;
  /** The Next.js folder's own bracket name, e.g. "id" for flags/[id]/route.ts — what the
   *  route's own code destructures from `params`. Matched to specName positionally,
   *  since the two are independent identifiers for the same URL segment. */
  folderName: string;
  value: string;
  schema: JsonSchema;
}

interface OperationCase {
  method: HttpMethod;
  specPath: string;
  op: JsonSchema;
  route: DiscoveredRoute;
  successStatus: number;
  successSchema?: JsonSchema;
  pathParamValues: PathParamValue[];
  queryParams: URLSearchParams;
  requestBodyExample?: unknown;
  /** Present only for a multipart/form-data requestBody (reference-library/assets). */
  multipartSchema?: JsonSchema;
  invalidPathParam?: PathParamValue;
}

const specPaths = (swaggerSpecV2 as { paths: Record<string, JsonSchema> })
  .paths;

function buildOperationCases(): OperationCase[] {
  const cases: OperationCase[] = [];

  for (const [specPath, methods] of Object.entries(specPaths)) {
    for (const [methodLower, op] of Object.entries(methods)) {
      const method = methodLower.toUpperCase() as HttpMethod;
      const route = findRoute(specPath);
      if (!route) continue; // reported by the "spec <-> filesystem drift" test instead

      const responses = (op.responses ?? {}) as JsonSchema;
      const successCodes = Object.keys(responses)
        .map(Number)
        .filter((code) => code >= 200 && code < 300);
      if (successCodes.length === 0) continue;
      const successStatus = Math.min(...successCodes);
      const successSchema =
        responses[String(successStatus)]?.content?.["application/json"]?.schema;

      const pathParamValues: PathParamValue[] = [];
      let invalidPathParam: OperationCase["invalidPathParam"];
      const queryParams = new URLSearchParams();
      let pathParamIndex = 0;

      for (const param of op.parameters ?? []) {
        // OpenAPI allows `example` at the parameter level or nested under
        // its `schema` — this spec's authors use the parameter level. A
        // path segment always needs *some* value to form a URL, so an enum's
        // first member is an acceptable fallback there; an optional query
        // param gets no such fallback — guessing one for e.g. an enum whose
        // values are mutually exclusive with a sibling param (tree/branch's
        // `language`/`group`) would send both and trip a business rule
        // neither param's own schema expresses.
        const pathExample =
          param.example ?? param.schema?.example ?? param.schema?.enum?.[0];
        const queryExample = param.example ?? param.schema?.example;

        if (param.in === "path") {
          const example = pathExample;
          if (example === undefined) {
            throw new Error(
              `Contract suite: path param "${param.name}" on ${method} ${specPath} has ` +
                `no spec example or enum — add one to its @swagger block so the suite can drive it.`
            );
          }
          const folderName =
            route.dynamicSegmentNames[pathParamIndex] ?? param.name;
          pathParamIndex += 1;
          const value: PathParamValue = {
            specName: param.name,
            folderName,
            value: String(example),
            schema: param.schema,
          };
          pathParamValues.push(value);
          if (
            !invalidPathParam &&
            (param.schema.pattern || param.schema.enum)
          ) {
            invalidPathParam = value;
          }
        } else if (param.in === "query") {
          if (param.required && queryExample === undefined) {
            throw new Error(
              `Contract suite: required query param "${param.name}" on ${method} ${specPath} ` +
                `has no spec example — add one to its @swagger block so the suite can drive it.`
            );
          }
          if (queryExample !== undefined) {
            queryParams.set(param.name, String(queryExample));
          }
        }
      }

      const requestBodySchema =
        op.requestBody?.content?.["application/json"]?.schema;
      const multipartSchema =
        op.requestBody?.content?.["multipart/form-data"]?.schema;

      cases.push({
        method,
        specPath,
        op,
        route,
        successStatus,
        successSchema,
        pathParamValues,
        queryParams,
        requestBodyExample: requestBodySchema
          ? generateExample(requestBodySchema)
          : undefined,
        multipartSchema,
        invalidPathParam,
      });
    }
  }

  return cases;
}

const operationCases = buildOperationCases();

/** Builds a FormData body from a multipart/form-data schema's required properties. */
function buildMultipartBody(schema: JsonSchema): FormData {
  const form = new FormData();
  const properties = schema.properties ?? {};
  const required: string[] = schema.required ?? Object.keys(properties);
  for (const key of required) {
    const propSchema = properties[key];
    if (!propSchema) continue;
    if (propSchema.format === "binary") {
      form.append(
        key,
        new Blob(["contract-test-content"], { type: "text/plain" }),
        "contract-test.txt"
      );
    } else {
      form.append(key, String(generateExample(propSchema)));
    }
  }
  return form;
}

function buildUrl(
  specPath: string,
  pathParamValues: PathParamValue[],
  query: URLSearchParams,
  extraQuery?: Record<string, string>
): string {
  let path = specPath;
  for (const { specName, value } of pathParamValues) {
    path = path.replace(`{${specName}}`, encodeURIComponent(value));
  }
  const qp = new URLSearchParams(query);
  for (const [name, value] of Object.entries(extraQuery ?? {}))
    qp.set(name, value);
  const qs = qp.toString();
  return `http://localhost${path}${qs ? `?${qs}` : ""}`;
}

async function callOperation(
  opCase: OperationCase,
  overrides: {
    /** Keyed by folderName (see PathParamValue) — what the route's own code reads. */
    ctxParams?: Record<string, string>;
    extraQuery?: Record<string, string>;
  } = {}
): Promise<Response> {
  vi.resetModules();

  const override = ROUTE_OVERRIDES[`${opCase.method} ${opCase.specPath}`];
  if (override) {
    override();
  } else {
    const mockValue = composeHandlerMockValue(
      opCase.successSchema ? generateExample(opCase.successSchema) : null,
      opCase.successStatus
    );
    for (const { specifier, names } of extractHandlerImports(
      opCase.route.absPath
    )) {
      vi.doMock(specifier, () =>
        Object.fromEntries(
          names.map((name) => [name, vi.fn().mockResolvedValue(mockValue)])
        )
      );
    }
  }

  const ctxParams: Record<string, string> = {
    ...Object.fromEntries(
      opCase.pathParamValues.map((p) => [p.folderName, p.value])
    ),
    ...overrides.ctxParams,
  };
  const url = buildUrl(
    opCase.specPath,
    opCase.pathParamValues,
    opCase.queryParams,
    overrides.extraQuery
  );
  const init: RequestInit = { method: opCase.method };
  if (opCase.requestBodyExample !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(opCase.requestBodyExample);
  } else if (opCase.multipartSchema) {
    // Left to the fetch implementation to set its own multipart boundary
    // header — a hand-set content-type here would omit it and every field
    // would fail to parse server-side.
    init.body = buildMultipartBody(opCase.multipartSchema);
  }

  const mod = (await opCase.route.load()) as Record<
    string,
    (
      request: NextRequest,
      ctx: { params: Promise<Record<string, string>> }
    ) => Promise<Response>
  >;
  const handler = mod[opCase.method];
  if (!handler) {
    throw new Error(
      `Contract suite: ${opCase.route.absPath} does not export ${opCase.method}, but ` +
        `openapiV2.ts documents ${opCase.method} ${opCase.specPath}.`
    );
  }
  return handler(new NextRequest(url, init), {
    params: Promise.resolve(ctxParams),
  });
}

function assertResponseMatchesSomeDocumentedStatus(
  opCase: OperationCase,
  response: Response
) {
  const documented = (opCase.op.responses as JsonSchema)[
    String(response.status)
  ];
  expect(
    documented,
    `${opCase.method} ${opCase.specPath} returned ${response.status}, which is not ` +
      `among its documented responses (${Object.keys(opCase.op.responses).join(", ")})`
  ).toBeDefined();
  return documented?.content?.["application/json"]?.schema as
    | JsonSchema
    | undefined;
}

beforeEach(() => {
  vi.resetModules();
});

describe("contract: success path", () => {
  const titled = operationCases.map(
    (c) => [`${c.method} ${c.specPath}`, c] as const
  );

  // @req REQ-033
  it.each(titled)(
    "%s -> documented success status with a schema-valid body",
    async (_title, opCase) => {
      const response = await callOperation(opCase);
      expect(response.status).toBe(opCase.successStatus);
      if (opCase.successSchema) {
        const body = await response.json();
        const errors = validateAgainstSchema(opCase.successSchema, body);
        expect(errors, JSON.stringify(errors)).toBeNull();
      }
    }
  );
});

describe("contract: validation-error path", () => {
  const titled = operationCases
    .filter((c) => c.invalidPathParam)
    .map(
      (c) =>
        [
          `${c.method} ${c.specPath} (invalid ${c.invalidPathParam!.specName})`,
          c,
        ] as const
    );

  // @req REQ-033
  it.each(titled)(
    "%s -> a documented non-success status with a schema-valid body",
    async (_title, opCase) => {
      const invalidValue = invalidValueFor(opCase.invalidPathParam!.schema);
      const response = await callOperation(opCase, {
        ctxParams: { [opCase.invalidPathParam!.folderName]: invalidValue },
      });

      expect(response.status).not.toBe(opCase.successStatus);
      const schema = assertResponseMatchesSomeDocumentedStatus(
        opCase,
        response
      );
      if (schema) {
        const body = await response.json();
        const errors = validateAgainstSchema(schema, body);
        expect(errors, JSON.stringify(errors)).toBeNull();
      }
    }
  );
});

describe("contract: unrecognized query parameter", () => {
  const titled = operationCases.map(
    (c) => [`${c.method} ${c.specPath}`, c] as const
  );

  // @req REQ-033
  it.each(titled)(
    "%s -> stays within its documented responses",
    async (_title, opCase) => {
      const response = await callOperation(opCase, {
        extraQuery: { __contract_test_unknown_param__: "1" },
      });

      const schema = assertResponseMatchesSomeDocumentedStatus(
        opCase,
        response
      );
      if (schema) {
        const body = await response.json();
        const errors = validateAgainstSchema(schema, body);
        expect(errors, JSON.stringify(errors)).toBeNull();
      }
    }
  );
});

describe("contract: test isolation", () => {
  // @req REQ-033
  it("produces identical results when the same operation runs twice in a row", async () => {
    const opCase = operationCases[0];

    const first = await callOperation(opCase);
    const firstBody = await first.json();
    const second = await callOperation(opCase);
    const secondBody = await second.json();

    expect(second.status).toBe(first.status);
    expect(secondBody).toEqual(firstBody);
  });
});

describe("contract: spec <-> filesystem drift", () => {
  // Compared by URL shape (dynamic segments collapsed), not literal param
  // names — a route folder's bracket name (`[id]`) has no obligation to
  // match what the spec calls that same segment (`{public_slug_or_id}`).
  const shapeOf = (path: string) => path.replace(/\{[^}]+\}/g, "*");

  function allSpecOperationKeys(): string[] {
    const keys: string[] = [];
    for (const [specPath, methods] of Object.entries(specPaths)) {
      for (const methodLower of Object.keys(methods)) {
        keys.push(`${methodLower.toUpperCase()} ${shapeOf(specPath)}`);
      }
    }
    return keys;
  }

  async function allFileOperationKeys(): Promise<string[]> {
    const keys: string[] = [];
    for (const route of discoverRoutes()) {
      const mod = await route.load();
      for (const method of HTTP_METHODS) {
        if (typeof mod[method] === "function")
          keys.push(`${method} ${shapeOf(route.specPath)}`);
      }
    }
    return keys;
  }

  // @req REQ-033
  it("documents exactly the /v2 operations implemented on disk, and vice versa", async () => {
    const specKeys = new Set(allSpecOperationKeys());
    const fileKeys = new Set(await allFileOperationKeys());

    const specOnly = [...specKeys].filter((key) => !fileKeys.has(key)).sort();
    const fileOnly = [...fileKeys].filter((key) => !specKeys.has(key)).sort();

    expect(
      specOnly,
      "documented in openapiV2.ts but no route file implements it"
    ).toEqual([]);
    expect(
      fileOnly,
      "implemented under src/app/api/v2 but missing from openapiV2.ts"
    ).toEqual([]);
  });
});
