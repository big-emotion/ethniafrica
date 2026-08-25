import { describe, it, expect } from "vitest";
import {
  findPaginationDriftOffenders,
  getRuntimePerPageBounds,
  type OpenAPISpec,
} from "../checkPaginationContractDrift";

const RUNTIME_BOUNDS = { default: 20, maximum: 100 };

function specWithPerPage(defaultValue?: number, maximum?: number): OpenAPISpec {
  return {
    paths: {
      "/api/v2/language-families": {
        get: {
          parameters: [
            { name: "page", in: "query", schema: { default: 1 } },
            {
              name: "perPage",
              in: "query",
              schema: { default: defaultValue, maximum },
            },
          ],
        },
      },
    },
  };
}

describe("findPaginationDriftOffenders", () => {
  // @req REQ-110
  it("reports no offenders when the documented bounds match runtime", () => {
    const spec = specWithPerPage(20, 100);
    expect(findPaginationDriftOffenders(spec, RUNTIME_BOUNDS)).toEqual([]);
  });

  // @req REQ-110
  it("fails when the documented maximum is desynced from the runtime cap", () => {
    const spec = specWithPerPage(20, 250);
    const offenders = findPaginationDriftOffenders(spec, RUNTIME_BOUNDS);

    expect(offenders).toHaveLength(1);
    expect(offenders[0]).toMatchObject({
      path: "/api/v2/language-families",
      method: "GET",
      field: "maximum",
      documented: 250,
      runtime: 100,
    });
  });

  // @req REQ-110
  it("fails when the documented default is desynced from the runtime default", () => {
    const spec = specWithPerPage(10, 100);
    const offenders = findPaginationDriftOffenders(spec, RUNTIME_BOUNDS);

    expect(offenders).toHaveLength(1);
    expect(offenders[0]).toMatchObject({ field: "default", documented: 10 });
  });

  // @req REQ-110
  it("ignores endpoints that do not document a perPage parameter", () => {
    const spec: OpenAPISpec = {
      paths: { "/api/v2/sources": { get: { parameters: [] } } },
    };
    expect(findPaginationDriftOffenders(spec, RUNTIME_BOUNDS)).toEqual([]);
  });
});

describe("getRuntimePerPageBounds", () => {
  // @req REQ-110
  it("matches the current validatePerPage defaults (default 20, max 100)", () => {
    expect(getRuntimePerPageBounds()).toEqual({ default: 20, maximum: 100 });
  });
});
