import { describe, it, expect, vi, beforeEach } from "vitest";

const { unstableCacheMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn(
    (callback: (...args: unknown[]) => unknown) => callback
  ),
}));
vi.mock("next/cache", () => ({ unstable_cache: unstableCacheMock }));

const { getGameRoundsHandlerMock } = vi.hoisted(() => ({
  getGameRoundsHandlerMock: vi.fn(),
}));
vi.mock("@/api/v2/handlers/games", () => ({
  getGameRoundsHandler: getGameRoundsHandlerMock,
}));

import { loadHeroPreview } from "@/lib/home/heroPreviewData";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

const hubModule = (overrides: Partial<HubModule>): HubModule => ({
  id: "x",
  name: "X",
  accessMode: "jouer",
  page: null,
  availability: "data",
  available: true,
  ...overrides,
});

const round = { kind: "binary" } as never;

beforeEach(() => {
  getGameRoundsHandlerMock.mockReset();
});

describe("loadHeroPreview", () => {
  // @req REQ-115
  it("asks the corpus for nothing when the preview is standalone", async () => {
    const preview = await loadHeroPreview(
      hubModule({ id: "mercator", heroable: "standalone" })
    );

    expect(preview).toEqual({ kind: "standalone", moduleId: "mercator" });
    expect(getGameRoundsHandlerMock).not.toHaveBeenCalled();
  });

  // @req REQ-115
  it("builds a game's rounds server-side, as the game page does", async () => {
    getGameRoundsHandlerMock.mockResolvedValue({ data: { rounds: [round] } });

    const preview = await loadHeroPreview(
      hubModule({ id: "liens", heroable: "game", gameSlug: "liens" })
    );

    expect(preview?.kind).toBe("game");
    expect(getGameRoundsHandlerMock).toHaveBeenCalledTimes(1);
  });

  // Same slug, same seed, always — only *which* module the home draws is
  // random, never what that module then shows.
  // @req REQ-115
  it("seeds a game from its slug, so it opens on the same round every time", async () => {
    getGameRoundsHandlerMock.mockResolvedValue({ data: { rounds: [round] } });
    const liens = hubModule({
      id: "liens",
      heroable: "game",
      gameSlug: "liens",
    });

    await loadHeroPreview(liens);
    await loadHeroPreview(liens);

    const [, firstSeed] = getGameRoundsHandlerMock.mock.calls[0];
    const [, secondSeed] = getGameRoundsHandlerMock.mock.calls[1];
    expect(firstSeed).toBe(secondSeed);
  });

  // @req REQ-115
  it("keeps the globe rather than opening on a band the corpus cannot fill", async () => {
    getGameRoundsHandlerMock.mockResolvedValue({ data: { rounds: [] } });

    expect(
      await loadHeroPreview(
        hubModule({ id: "liens", heroable: "game", gameSlug: "liens" })
      )
    ).toBeNull();
  });

  // @req REQ-115
  it("degrades instead of throwing into the render when rounds fail", async () => {
    getGameRoundsHandlerMock.mockRejectedValue(new Error("supabase down"));

    expect(
      await loadHeroPreview(
        hubModule({ id: "liens", heroable: "game", gameSlug: "liens" })
      )
    ).toBeNull();
  });

  // @req REQ-115
  it("refuses a module that declares no hero path at all", async () => {
    expect(await loadHeroPreview(hubModule({ id: "recherche" }))).toBeNull();
  });
});
