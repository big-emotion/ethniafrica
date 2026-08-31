import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ApiDocsV2Page from "@/app/docs/api/v2/page";

// The real explorer pulls the whole Swagger bundle. What this page owes it is
// a spec and a stylesheet — the widget's own rendering is not under test.
vi.mock("swagger-ui-react", () => ({
  __esModule: true,
  default: ({ spec }: { spec: Record<string, unknown> }) => (
    <div
      data-testid="swagger-ui"
      data-spec-title={String(spec?.info?.["title"] ?? "")}
    />
  ),
}));

const OPENAPI_SPEC = {
  openapi: "3.0.0",
  info: { title: "EthniAfrica API v2", version: "2.0.0" },
  paths: {},
};

describe("the API v2 documentation page", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => OPENAPI_SPEC,
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // @req REQ-099
  it("says it is fetching the specification before the explorer can exist", () => {
    render(<ApiDocsV2Page />);

    expect(screen.getByText(/loading api documentation/i)).toBeInTheDocument();
    expect(screen.queryByTestId("swagger-ui")).not.toBeInTheDocument();
  });

  // @req REQ-099
  it("hands the fetched specification to the explorer", async () => {
    render(<ApiDocsV2Page />);

    const explorer = await screen.findByTestId("swagger-ui");
    expect(explorer).toHaveAttribute("data-spec-title", "EthniAfrica API v2");
    expect(fetch).toHaveBeenCalledWith("/api/docs/v2");
  });

  // The explorer ships its own stylesheet and renders as bare, unstyled HTML
  // without it — which is exactly how this page reached production. No
  // assertion on the DOM can witness the defect: Vitest resolves a CSS import
  // to an empty module, so the import is only observable in the source.
  // @req REQ-099
  it("loads the Swagger UI stylesheet the explorer needs to render as a UI", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/docs/api/v2/page.tsx"),
      "utf8"
    );

    expect(source).toMatch(/^import "swagger-ui-react\/swagger-ui\.css";$/m);
  });
});
