import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildClaudeArgs, parseClaudeResult } from "../lib/claudeCliProvider";

const fixture = (name: string) =>
  readFileSync(
    resolve(__dirname, "__fixtures__", "claude-print", `${name}.json`),
    "utf8"
  );

const SCHEMA = {
  type: "object",
  properties: { translations: { type: "object" } },
  required: ["translations"],
};

describe("claudeCliProvider (REQ-146)", () => {
  // The naive invocation loaded the whole harness — CLAUDE.md, skills, ~250
  // MCP tools — and billed 138 888 tokens ($0.56) before reading a word;
  // these four flags took the overhead to 1 122 tokens ($0.006).
  // @req REQ-146
  it("pins the flags that keep a call cheap and hermetic", () => {
    const args = buildClaudeArgs({
      systemPrompt: "Translate.",
      model: "sonnet",
      jsonSchema: SCHEMA,
      maxBudgetUsd: 0.5,
    });

    expect(args[0]).toBe("-p");
    expect(args).toContain("--safe-mode");
    expect(args).toContain("--strict-mcp-config");
    expect(args).toContain("--disable-slash-commands");
    expect(args).toContain("--no-session-persistence");
    expect(
      args.slice(args.indexOf("--tools"), args.indexOf("--tools") + 2)
    ).toEqual(["--tools", ""]);
    expect(args.slice(args.indexOf("--system-prompt") + 1)[0]).toBe(
      "Translate."
    );
    expect(args).toContain("--output-format");
    expect(args[args.indexOf("--output-format") + 1]).toBe("json");
    expect(args[args.indexOf("--model") + 1]).toBe("sonnet");
    expect(JSON.parse(args[args.indexOf("--json-schema") + 1])).toEqual(SCHEMA);
    expect(args[args.indexOf("--max-budget-usd") + 1]).toBe("0.5");
    // The user prompt travels on stdin: a family fiche is 35 KB and argv is
    // not the place for it.
    expect(args.every((arg) => !arg.includes("leaves"))).toBe(true);
  });

  // @req REQ-146
  it("returns the structured output, the model that answered and the cost on success", () => {
    const parsed = parseClaudeResult(fixture("success"));

    expect(parsed).toEqual({
      ok: true,
      output: {
        translations: {
          "content.origins.ancientOrigins":
            "The Asante belong to the Akan group.",
        },
      },
      // The incidental haiku entry is bookkeeping, not the translator.
      model: "claude-sonnet-5",
      costUsd: 0.005971,
    });
  });

  // @req REQ-146
  it("returns the terminal reason and never a partial translation when the budget is exhausted", () => {
    const parsed = parseClaudeResult(fixture("budget-exhausted"));

    expect(parsed).toEqual({
      ok: false,
      error: "error_max_budget_usd",
      terminalReason: "budget_exhausted",
    });
  });

  // @req REQ-146
  it("reports unparsable output as a failure rather than throwing", () => {
    expect(parseClaudeResult("not json at all")).toMatchObject({
      ok: false,
      error: expect.stringMatching(/not JSON/),
    });
    expect(
      parseClaudeResult(JSON.stringify({ type: "result", subtype: "success" }))
    ).toMatchObject({ ok: false, error: expect.stringMatching(/structured/) });
  });
});
