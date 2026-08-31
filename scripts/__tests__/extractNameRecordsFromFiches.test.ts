// @req REQ-032
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  draftNameRecordFromAppellations,
  extractNameRecordsFromFiches,
} from "../extractNameRecordsFromFiches";

// ─── helpers ──────────────────────────────────────────────────────────────────

// Real content.appellations excerpt from
// dataset/source/afrik/peuples/FLG_BENOUECONGO/PPL_YORUBA.json — used verbatim
// so the extraction is exercised against real fiche prose, not invented text.
const YORUBA_APPELLATIONS = {
  mainName: "Yoruba",
  selfAppellation: "Yoruba (Yoruba eniyan)",
  exonyms: [
    "Nago (terme colonial francophone, connotation reductrice, encore employe au Benin et au Togo)",
    "Aku (diaspora historique en Sierra Leone et en Gambie)",
  ],
  originOfExonyms:
    "Nago est un terme utilise par les colons francais pour designer les Yoruba du Dahomey (actuel Benin) et du Togo ; il a une connotation reductrice et est evite en contexte academique. Aku designe les Yoruba liberes de la traite et reinstalles en Sierra Leone au 19e siecle ; il derive probablement de oka ou oka, un terme de salutation yoruba.",
  whyProblematic:
    "Nago peut etre percu comme reducteur par les communautes concernees. L'appellation Aku en Sierra Leone est specifique a la diaspora musulmane liberee et non a la totalite des Yoruba.",
  contemporaryUsage:
    "Yoruba est le terme universel dans les contextes academiques, officiels et communautaires en Afrique de l'Ouest et dans la diaspora.",
};

function writePplFiche(
  root: string,
  flgFolder: string,
  pplId: string,
  appellations?: Record<string, unknown>
) {
  const dir = join(root, flgFolder);
  mkdirSync(dir, { recursive: true });
  const data: Record<string, unknown> = { id: pplId, nameMain: pplId };
  if (appellations) {
    data.content = { appellations };
  }
  writeFileSync(join(dir, `${pplId}.json`), JSON.stringify(data, null, 2));
}

// ─── draftNameRecordFromAppellations (pure, no fs) ─────────────────────────────

describe("draftNameRecordFromAppellations (Story 8.4)", () => {
  // @req REQ-032
  it("returns null when there is no selfAppellation and no exonyms", () => {
    expect(draftNameRecordFromAppellations("PPL_EMPTY", {})).toBeNull();
    expect(
      draftNameRecordFromAppellations("PPL_EMPTY", { exonyms: [] })
    ).toBeNull();
  });

  // @req REQ-032
  it("drafts an endonym record from selfAppellation, sortRank 0, no sources", () => {
    const draft = draftNameRecordFromAppellations("PPL_YORUBA", {
      selfAppellation: "Yoruba (Yoruba eniyan)",
    });

    expect(draft).not.toBeNull();
    expect(draft!.id).toBe("PPL_YORUBA");
    expect(draft!.entityType).toBe("people");
    expect(draft!._meta.draft).toBe(true);
    expect(draft!.names).toHaveLength(1);
    const endonym = draft!.names[0];
    expect(endonym.nameType).toBe("endonym");
    expect(endonym.nameText).toBe("Yoruba (Yoruba eniyan)");
    expect(endonym.sortRank).toBe(0);
    expect(endonym.sources).toEqual([]);
    expect(endonym.extractionSource).toBe(
      "content.appellations.selfAppellation"
    );
  });

  // @req REQ-032
  it("drafts one exonym record per entry in exonyms[], carrying shared imposition-context fields", () => {
    const draft = draftNameRecordFromAppellations(
      "PPL_YORUBA",
      YORUBA_APPELLATIONS
    );

    expect(draft).not.toBeNull();
    // 1 endonym + 2 exonyms
    expect(draft!.names).toHaveLength(3);

    const [endonym, nago, aku] = draft!.names;
    expect(endonym.nameType).toBe("endonym");
    expect(endonym.sortRank).toBe(0);

    expect(nago.nameType).toBe("exonym");
    expect(nago.nameText).toBe("Nago");
    expect(nago.sortRank).toBe(1);
    expect(nago.sources).toEqual([]);
    expect(nago.whyProblematic).toBe(YORUBA_APPELLATIONS.whyProblematic);
    expect(nago.contemporaryUsage).toBe(YORUBA_APPELLATIONS.contemporaryUsage);
    expect(nago.rawExonymText).toBe(YORUBA_APPELLATIONS.exonyms[0]);
    expect(nago.originOfExonyms).toBe(YORUBA_APPELLATIONS.originOfExonyms);
    expect(nago.extractionSource).toBe("content.appellations.exonyms[0]");

    expect(aku.nameType).toBe("exonym");
    expect(aku.nameText).toBe("Aku");
    expect(aku.sortRank).toBe(2);
    expect(aku.extractionSource).toBe("content.appellations.exonyms[1]");
  });

  // @req REQ-032
  it("never invents imposedBy, impositionPeriod, meaning or languageOfOrigin", () => {
    const draft = draftNameRecordFromAppellations(
      "PPL_YORUBA",
      YORUBA_APPELLATIONS
    );

    for (const name of draft!.names) {
      expect(name.imposedBy).toBeNull();
      expect(name.impositionPeriod).toBeNull();
      expect(name.meaning).toBeNull();
      expect(name.languageOfOrigin).toBeNull();
      expect(name.periodLabel).toBeNull();
      expect(name.sources).toEqual([]);
    }
  });

  // @req REQ-032
  it("strips a leading parenthetical from exonym nameText but keeps the raw text alongside", () => {
    const draft = draftNameRecordFromAppellations("PPL_X", {
      exonyms: ["Plain Name"],
    });

    expect(draft!.names[0].nameText).toBe("Plain Name");
    expect(draft!.names[0].rawExonymText).toBe("Plain Name");
  });

  // @req REQ-032
  it("only drafts exonym records when selfAppellation is absent", () => {
    const draft = draftNameRecordFromAppellations("PPL_X", {
      exonyms: ["Solo"],
    });

    expect(draft!.names).toHaveLength(1);
    expect(draft!.names[0].nameType).toBe("exonym");
  });
});

// ─── extractNameRecordsFromFiches (fs walk + write) ────────────────────────────

describe("extractNameRecordsFromFiches (Story 8.4)", () => {
  let peuplesRoot: string;
  let outputDir: string;

  beforeEach(() => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    peuplesRoot = join(__dirname, `tmp_peuples_${suffix}`);
    outputDir = join(__dirname, `tmp_drafts_${suffix}`);
    mkdirSync(peuplesRoot, { recursive: true });
  });

  afterEach(() => {
    for (const dir of [peuplesRoot, outputDir]) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  // @req REQ-032
  it("writes one draft file per fiche with usable appellations, shaped like modele-nom.json", () => {
    writePplFiche(
      peuplesRoot,
      "FLG_BENOUECONGO",
      "PPL_YORUBA",
      YORUBA_APPELLATIONS
    );

    const stats = extractNameRecordsFromFiches(peuplesRoot, outputDir);

    expect(stats.fichesScanned).toBe(1);
    expect(stats.fichesWithAppellations).toBe(1);
    expect(stats.fichesSkipped).toBe(0);
    expect(stats.draftsWritten).toBe(1);
    expect(stats.endonymDraftsWritten).toBe(1);
    expect(stats.exonymDraftsWritten).toBe(2);

    const draftPath = join(outputDir, "PPL_YORUBA.json");
    expect(existsSync(draftPath)).toBe(true);
    const written = JSON.parse(readFileSync(draftPath, "utf8"));
    expect(written.id).toBe("PPL_YORUBA");
    expect(written.entityType).toBe("people");
    expect(written._meta.format).toBe("AFRIK JSON v2");
    expect(written._meta.entity).toBe("nom");
    expect(written._meta.draft).toBe(true);
    expect(written.names).toHaveLength(3);
  });

  // @req REQ-032
  it("skips fiches without content.appellations and does not write a draft", () => {
    writePplFiche(peuplesRoot, "FLG_TEST", "PPL_NOAPPEL");

    const stats = extractNameRecordsFromFiches(peuplesRoot, outputDir);

    expect(stats.fichesScanned).toBe(1);
    expect(stats.fichesWithAppellations).toBe(0);
    expect(stats.fichesSkipped).toBe(1);
    expect(stats.draftsWritten).toBe(0);
    expect(existsSync(join(outputDir, "PPL_NOAPPEL.json"))).toBe(false);
  });

  // @req REQ-032
  it("walks nested FLG_* directories and aggregates stats across multiple fiches", () => {
    writePplFiche(
      peuplesRoot,
      "FLG_BENOUECONGO",
      "PPL_YORUBA",
      YORUBA_APPELLATIONS
    );
    writePplFiche(peuplesRoot, "FLG_NILOTIQUE", "PPL_DINKA", {
      selfAppellation: "Jieng",
    });
    writePplFiche(peuplesRoot, "FLG_TEST", "PPL_NOAPPEL");

    const stats = extractNameRecordsFromFiches(peuplesRoot, outputDir);

    expect(stats.fichesScanned).toBe(3);
    expect(stats.fichesWithAppellations).toBe(2);
    expect(stats.fichesSkipped).toBe(1);
    expect(stats.draftsWritten).toBe(2);
    expect(existsSync(join(outputDir, "PPL_YORUBA.json"))).toBe(true);
    expect(existsSync(join(outputDir, "PPL_DINKA.json"))).toBe(true);
  });

  // @req REQ-032
  it("refuses to write drafts into dataset/source/afrik/noms/ — working directory only", () => {
    writePplFiche(
      peuplesRoot,
      "FLG_BENOUECONGO",
      "PPL_YORUBA",
      YORUBA_APPELLATIONS
    );

    expect(() =>
      extractNameRecordsFromFiches(
        peuplesRoot,
        join("dataset", "source", "afrik", "noms")
      )
    ).toThrow(/dataset\/source\/afrik\/noms/);

    expect(() =>
      extractNameRecordsFromFiches(
        peuplesRoot,
        join("dataset", "source", "afrik", "noms", "wave1")
      )
    ).toThrow(/dataset\/source\/afrik\/noms/);
  });
});
