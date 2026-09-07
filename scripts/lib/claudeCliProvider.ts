/**
 * The Claude Code CLI as a translation provider (REQ-146).
 *
 * `claude -p` is only a usable provider with four flags. Measured on
 * 2026-09-05: the naive invocation loads the whole harness — CLAUDE.md, the
 * skills, some 250 MCP tools — and bills 138 888 cache-creation tokens
 * ($0.556 at list) before reading a word of the fiche; with `--safe-mode
 * --strict-mcp-config --disable-slash-commands --tools ""` the same call
 * costs 1 122 tokens ($0.006). `buildClaudeArgs` pins them, the test pins
 * `buildClaudeArgs`, and the process runs from the OS temp directory so no
 * CLAUDE.md is discovered even if the flags are ever weakened.
 *
 * The user prompt travels on stdin: a family fiche is 35 KB and argv is not
 * the place for it. Only `spawn` itself is untested; everything around it
 * is pure and measured against the two JSON shapes the CLI actually returns.
 */

import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

import type {
  TranslationProvider,
  TranslationRequest,
  TranslationResult,
} from "@/lib/afrik/translations/provider";

export interface ClaudeArgsInput {
  systemPrompt: string;
  model: string;
  jsonSchema: Record<string, unknown>;
  maxBudgetUsd: number;
}

// @req REQ-146
export function buildClaudeArgs(input: ClaudeArgsInput): string[] {
  return [
    "-p",
    "--safe-mode",
    "--system-prompt",
    input.systemPrompt,
    "--tools",
    "",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--no-session-persistence",
    "--output-format",
    "json",
    "--model",
    input.model,
    "--json-schema",
    JSON.stringify(input.jsonSchema),
    "--max-budget-usd",
    String(input.maxBudgetUsd),
  ];
}

interface ClaudePrintResult {
  subtype?: string;
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
  terminal_reason?: string;
  total_cost_usd?: number;
  modelUsage?: Record<string, { costUSD?: number }>;
}

/** The model that did the work: the costliest entry, never the incidental haiku call. */
function translatingModel(usage: ClaudePrintResult["modelUsage"]): string {
  const entries = Object.entries(usage ?? {}).filter(
    ([name]) => !name.startsWith("claude-haiku")
  );
  if (entries.length === 0) return Object.keys(usage ?? {})[0] ?? "unknown";
  return entries.sort(
    ([, a], [, b]) => (b.costUSD ?? 0) - (a.costUSD ?? 0)
  )[0][0];
}

// @req REQ-146
export function parseClaudeResult(stdout: string): TranslationResult {
  let parsed: ClaudePrintResult;
  try {
    parsed = JSON.parse(stdout) as ClaudePrintResult;
  } catch {
    return {
      ok: false,
      error: `claude output is not JSON: ${stdout.slice(0, 200)}`,
    };
  }

  if (parsed.is_error || (parsed.subtype && parsed.subtype !== "success")) {
    return {
      ok: false,
      error: parsed.subtype ?? parsed.result ?? "claude reported an error",
      ...(parsed.terminal_reason
        ? { terminalReason: parsed.terminal_reason }
        : {}),
    };
  }

  if (parsed.structured_output === undefined) {
    return { ok: false, error: "claude returned no structured output" };
  }

  return {
    ok: true,
    output: parsed.structured_output,
    model: translatingModel(parsed.modelUsage),
    costUsd: parsed.total_cost_usd ?? 0,
  };
}

export interface ClaudeCliOptions {
  /** The binary to spawn; `claude` on PATH by default. */
  binary?: string;
  /** Working directory — outside the repository on purpose. */
  cwd?: string;
}

// @req REQ-146
export function claudeCliProvider(
  options: ClaudeCliOptions = {}
): TranslationProvider {
  const binary = options.binary ?? "claude";
  const cwd = options.cwd ?? tmpdir();

  return {
    translate(input: TranslationRequest): Promise<TranslationResult> {
      return new Promise((resolve) => {
        const child = spawn(binary, buildClaudeArgs(input), {
          cwd,
          stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => (stdout += String(chunk)));
        child.stderr.on("data", (chunk) => (stderr += String(chunk)));
        child.on("error", (error) =>
          resolve({
            ok: false,
            error: `could not spawn ${binary}: ${error.message}`,
          })
        );
        child.on("close", (code) => {
          if (stdout.trim() === "") {
            resolve({
              ok: false,
              error: `${binary} exited ${code} with no output: ${stderr.trim().slice(0, 300)}`,
            });
            return;
          }
          resolve(parseClaudeResult(stdout));
        });
        child.stdin.end(input.userPrompt);
      });
    },
  };
}
