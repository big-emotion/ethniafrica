import type { GameId } from "@/lib/games/gameRegistry";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

/**
 * English name and standing question for every registered game — the
 * sidecar of `GAME_DEFINITIONS` in `gameRegistry.ts`, keyed by game id
 * (REQ-145). Slugs, kinds and round counts stay on the French definition:
 * they are structure, not prose. Agent-authored under DEC-048.
 */
export interface GameWordingEn {
  nameEn: string;
  promptEn: string;
  provenance: Extract<TranslationKind, "machine">;
}

// @req REQ-145
export const GAME_DEFINITIONS_EN: Record<GameId, GameWordingEn> = {
  mercator: {
    nameEn: "The size they hid from you",
    promptEn: "Which of these two countries covers the larger area?",
    provenance: "machine",
  },
};
