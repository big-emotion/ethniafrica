/**
 * The one seam between the translation command and whatever produces the
 * English (REQ-146).
 *
 * The interim provider is the Claude Code CLI in headless mode, because it
 * needs no secret to provision and already returns schema-validated JSON.
 * An SDK provider metered on an API key is a drop-in behind this interface
 * and touches nothing in the pipeline — which is the point of having one.
 */

export interface TranslationRequest {
  systemPrompt: string;
  userPrompt: string;
  /** JSON Schema of the expected output; the provider enforces it. */
  jsonSchema: Record<string, unknown>;
  model: string;
  maxBudgetUsd: number;
}

export type TranslationResult =
  | { ok: true; output: unknown; model: string; costUsd: number }
  | { ok: false; error: string; terminalReason?: string };

export interface TranslationProvider {
  translate(input: TranslationRequest): Promise<TranslationResult>;
}
