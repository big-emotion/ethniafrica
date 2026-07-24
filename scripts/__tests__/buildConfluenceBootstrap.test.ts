import { describe, expect, it } from "vitest";

import {
  assignRequirementIds,
  extractCanonicalRequirements,
  renderEngineeringIndex,
  renderRequirementsPage,
  resolveCanonicalPageIds,
  validateBootstrapCatalog,
} from "../buildConfluenceBootstrap";

const PRD = `
- **FR1:** Users can browse people fiches.
- **FR2:** Users can search by endonym.
- **NFR1:** Public pages meet the mobile performance budget.
- **NFR2:** API responses stay within the latency budget.
`;

describe("extractCanonicalRequirements", () => {
  // @req REQ-085
  it("extracts functional requirements before non-functional requirements", () => {
    expect(extractCanonicalRequirements(PRD)).toEqual([
      { sourceId: "FR1", statement: "Users can browse people fiches." },
      { sourceId: "FR2", statement: "Users can search by endonym." },
      {
        sourceId: "NFR1",
        statement: "Public pages meet the mobile performance budget.",
      },
      {
        sourceId: "NFR2",
        statement: "API responses stay within the latency budget.",
      },
    ]);
  });

  // @req REQ-085
  it("rejects duplicate canonical source IDs", () => {
    expect(() =>
      extractCanonicalRequirements(`${PRD}\n- **FR1:** Duplicate requirement.`)
    ).toThrow("Duplicate canonical requirement source ID: FR1");
  });
});

describe("assignRequirementIds", () => {
  // @req REQ-085
  it("assigns stable sequential REQ identifiers", () => {
    expect(assignRequirementIds(extractCanonicalRequirements(PRD))).toEqual([
      {
        id: "REQ-001",
        sourceId: "FR1",
        statement: "Users can browse people fiches.",
      },
      {
        id: "REQ-002",
        sourceId: "FR2",
        statement: "Users can search by endonym.",
      },
      {
        id: "REQ-003",
        sourceId: "NFR1",
        statement: "Public pages meet the mobile performance budget.",
      },
      {
        id: "REQ-004",
        sourceId: "NFR2",
        statement: "API responses stay within the latency budget.",
      },
    ]);
  });
});

describe("renderRequirementsPage", () => {
  // @req REQ-085
  it("renders Confluence HTML statuses and traceability anchors", () => {
    const requirements = assignRequirementIds(
      extractCanonicalRequirements(PRD)
    );
    const body = renderRequirementsPage(requirements, {
      "REQ-001": ["src/lib/example.test.ts"],
    });

    expect(body).toContain(
      "<h2>REQ-001 — Users can browse people fiches.</h2>"
    );
    expect(body).toContain(
      '<span data-type="status" data-color="green">Approved</span>'
    );
    expect(body).toContain("<code>src/lib/example.test.ts</code>");
    expect(body).toContain("TODO: GWT");
  });
});

describe("validateBootstrapCatalog", () => {
  // @req REQ-085
  it("accepts unique sequential decisions and architecture contracts", () => {
    expect(
      validateBootstrapCatalog({
        decisions: [
          {
            id: "DEC-001",
            title: "Use Confluence as the source of truth",
            context: "Intent currently drifts.",
            decision: "Use Confluence.",
            alternatives: "Keep repository-only documentation.",
            tradeoffs: "Confluence availability becomes a dependency.",
            requirementsSatisfied: ["REQ-001"],
            source: "docs/adr/0002-confluence-source-of-truth.md",
            status: "Approved",
          },
        ],
        architectures: [
          {
            id: "ARCH-001",
            title: "Application shell",
            summary: "Next.js application shell.",
            sourceFiles: ["package.json"],
            tests: ["src/app/__tests__/layout.test.tsx"],
            source: "docs/architecture.md",
            status: "Approved",
          },
        ],
        obsolete: [],
      })
    ).toEqual([]);
  });

  // @req REQ-085
  it("rejects non-sequential identifiers", () => {
    const errors = validateBootstrapCatalog({
      decisions: [
        {
          id: "DEC-002",
          title: "Skipped identifier",
          context: "Context.",
          decision: "Decision.",
          alternatives: "Alternative.",
          tradeoffs: "Tradeoff.",
          requirementsSatisfied: [],
          source: "source.md",
          status: "Approved",
        },
      ],
      architectures: [],
      obsolete: [],
    });

    expect(errors).toContain(
      "decisions: expected DEC-001 at position 1, found DEC-002"
    );
  });
});

describe("renderEngineeringIndex", () => {
  // @req REQ-085
  it("renders links to all canonical branches", () => {
    const body = renderEngineeringIndex({
      requirements: "100",
      decisions: "101",
      architecture: "102",
      obsolete: "103",
    });

    expect(body).toContain("/pages/100");
    expect(body).toContain("/pages/101");
    expect(body).toContain("/pages/102");
    expect(body).toContain("/pages/103");
  });
});

describe("resolveCanonicalPageIds", () => {
  // @req REQ-085
  it("uses persisted IDs after publication and placeholders before publication", () => {
    expect(
      resolveCanonicalPageIds({
        requirementsPageId: "100",
        decisionsPageId: "101",
        architecturePageId: "102",
        obsoletePageId: "103",
      })
    ).toEqual({
      requirements: "100",
      decisions: "101",
      architecture: "102",
      obsolete: "103",
    });

    expect(resolveCanonicalPageIds({})).toEqual({
      requirements: "__REQUIREMENTS_PAGE_ID__",
      decisions: "__DECISIONS_PAGE_ID__",
      architecture: "__ARCHITECTURE_PAGE_ID__",
      obsolete: "__OBSOLETE_PAGE_ID__",
    });
  });
});
