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

const { listMigrationPathsMock } = vi.hoisted(() => ({
  listMigrationPathsMock: vi.fn(),
}));
vi.mock("@/api/v2/services/migrations", () => ({
  listMigrationPaths: listMigrationPathsMock,
}));

const { getLanguageFamilyLabelsMock, getPeopleCountsMock } = vi.hoisted(() => ({
  getLanguageFamilyLabelsMock: vi.fn(),
  getPeopleCountsMock: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/languageFamilyLabels", () => ({
  getLanguageFamilyLabels: getLanguageFamilyLabelsMock,
}));
vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getPeopleCountsByLanguageFamily: getPeopleCountsMock,
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
const path = {
  id: "MGR_BANTU",
  nameMain: "Dispersion bantoue",
  geometry: { type: "LineString", coordinates: [[11.5, 6.5]] },
  timeRange: { startYear: -3000, endYear: -1500, datingNote: null },
};

beforeEach(() => {
  getGameRoundsHandlerMock.mockReset();
  listMigrationPathsMock.mockReset();
  getLanguageFamilyLabelsMock.mockReset();
  getPeopleCountsMock.mockReset();
});

describe("loadHeroPreview", () => {
  // @req REQ-115
  it("asks the corpus for nothing when the module is the globe", async () => {
    const preview = await loadHeroPreview(
      hubModule({ id: "mercator", heroable: "globe" })
    );

    expect(preview).toEqual({ kind: "globe" });
    expect(getGameRoundsHandlerMock).not.toHaveBeenCalled();
    expect(listMigrationPathsMock).not.toHaveBeenCalled();
  });

  // @req REQ-115
  it("builds a game's rounds server-side, as the game page does", async () => {
    getGameRoundsHandlerMock.mockResolvedValue({ data: { rounds: [round] } });

    const preview = await loadHeroPreview(
      hubModule({ id: "liens", heroable: "game", gameSlug: "liens" })
    );

    expect(preview?.kind).toBe("game");
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
  it("hands the migration module its sourced paths", async () => {
    listMigrationPathsMock.mockResolvedValue([path]);

    const preview = await loadHeroPreview(
      hubModule({ id: "frise", heroable: "migration-paths" })
    );

    expect(preview).toEqual({ kind: "migration-paths", paths: [path] });
  });

  // The crown sizes each family by the peoples it holds, so the two reads
  // have to be joined before they cross to the client.
  // @req REQ-115
  it("weights each family by the peoples it holds", async () => {
    getLanguageFamilyLabelsMock.mockResolvedValue([
      { id: "FLG_NIGER_CONGO", nameFr: "Niger-Congo" },
      { id: "FLG_KHOE", nameFr: "Khoe" },
    ]);
    getPeopleCountsMock.mockResolvedValue(new Map([["FLG_NIGER_CONGO", 512]]));

    const preview = await loadHeroPreview(
      hubModule({ id: "familles", heroable: "family-crown" })
    );

    expect(preview).toEqual({
      kind: "family-crown",
      families: [
        { id: "FLG_NIGER_CONGO", nameFr: "Niger-Congo", peopleCount: 512 },
        // A family the counts query never mentions is drawn at zero rather
        // than dropped: it exists in the corpus, it just holds no people.
        { id: "FLG_KHOE", nameFr: "Khoe", peopleCount: 0 },
      ],
    });
  });

  // @req REQ-115
  it("keeps the globe rather than opening on a band the corpus cannot fill", async () => {
    listMigrationPathsMock.mockResolvedValue([]);

    expect(
      await loadHeroPreview(
        hubModule({ id: "frise", heroable: "migration-paths" })
      )
    ).toBeNull();
  });

  // @req REQ-115
  it("degrades instead of throwing into the render when a read fails", async () => {
    getLanguageFamilyLabelsMock.mockRejectedValue(new Error("supabase down"));
    getPeopleCountsMock.mockResolvedValue(new Map());

    expect(
      await loadHeroPreview(
        hubModule({ id: "familles", heroable: "family-crown" })
      )
    ).toBeNull();
  });

  // @req REQ-115
  it("refuses a module that declares no hero shape at all", async () => {
    expect(await loadHeroPreview(hubModule({ id: "recherche" }))).toBeNull();
  });
});
