import { describe, expect, it } from "vitest";

import {
  extractRunScripts,
  validateWorkflowShellSyntax,
} from "../checkWorkflowShellSyntax";

describe("extractRunScripts", () => {
  // @req REQ-085
  it("dedents a literal block scalar and reports the line it starts on", () => {
    const workflow = `jobs:
  gate:
    steps:
      - name: Guard
        run: |
          : "\${TOKEN:?TOKEN is not set}"
          npm ci
`;

    expect(extractRunScripts(workflow)).toEqual([
      { line: 5, script: ': "${TOKEN:?TOKEN is not set}"\nnpm ci' },
    ]);
  });

  // @req REQ-085
  it("folds a folded block scalar the way YAML does", () => {
    const workflow = `      - run: >-
          gh pr create
          --title "Sync"

          --body "second paragraph"
`;

    expect(extractRunScripts(workflow)).toEqual([
      {
        line: 1,
        script: 'gh pr create --title "Sync"\n--body "second paragraph"',
      },
    ]);
  });

  // @req REQ-085
  it("reads an inline run scalar, quoted or bare", () => {
    const workflow = `      - run: npm run build
      - run: "npm run test"
`;

    expect(extractRunScripts(workflow)).toEqual([
      { line: 1, script: "npm run build" },
      { line: 2, script: "npm run test" },
    ]);
  });

  // @req REQ-085
  it("skips a step that declares a shell bash cannot parse", () => {
    const workflow = `      - name: Windows step
        shell: pwsh
        run: |
          Write-Host "it's fine in PowerShell"

      - name: Linux step
        shell: bash
        run: echo ok
`;

    expect(extractRunScripts(workflow)).toEqual([
      { line: 8, script: "echo ok" },
    ]);
  });

  // @req REQ-085
  it("ignores a run input of an action, keeping the step's own run", () => {
    const workflow = `      - uses: owner/action@sha
        with:
          run: this is prose, not a shell script - "

      - run: npm ci
`;

    expect(extractRunScripts(workflow)).toEqual([
      { line: 5, script: "npm ci" },
    ]);
  });
});

describe("validateWorkflowShellSyntax", () => {
  // @req REQ-085
  it("accepts a run block bash can parse", () => {
    const workflow = `      - run: |
          : "\${TOKEN:?TOKEN is not set — set it to the recette project service-role key.}"
          npm ci
`;

    expect(validateWorkflowShellSyntax(workflow, "sync.yml")).toEqual([]);
  });

  // @req REQ-085
  it("rejects the apostrophe that broke the recette data sync", () => {
    const workflow = `      - run: |
          : "\${TOKEN:?TOKEN is not set — this must be the recette project's key.}"
`;

    const errors = validateWorkflowShellSyntax(workflow, "sync.yml");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("sync.yml:1:");
    expect(errors[0]).toContain("unexpected EOF");
  });

  // @req REQ-085
  it("treats a GitHub expression as an ordinary word instead of shell syntax", () => {
    const workflow = `      - run: gh pr merge \${{ github.event.pull_request.number }} --squash
`;

    expect(validateWorkflowShellSyntax(workflow, "merge.yml")).toEqual([]);
  });

  // @req REQ-085
  it("reports an unbalanced quote and an unterminated heredoc separately", () => {
    const workflow = `      - run: echo "unclosed
      - run: |
          cat <<'EOF'
          never closed
`;

    expect(validateWorkflowShellSyntax(workflow, "broken.yml")).toHaveLength(2);
  });
});
