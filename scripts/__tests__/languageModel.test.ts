// @req REQ-136
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import {
  checkLanguageModel,
  checkLanguageStrictSchema,
} from "../validateAfrikData";

// ─── helpers ──────────────────────────────────────────────────────────────────

function validFiche(overrides: Record<string, unknown> = {}) {
  return {
    id: "yor",
    isoCode639_3: "yor",
    glottocode: "yoru1245",
    nameFr: "Yoruba",
    nameEn: "Yoruba",
    alternateNames: ["Yariba"],
    familyId: "FLG_BENOUECONGO",
    peoples: [{ name: "Yoruba", peopleId: "PPL_YORUBA" }],
    content: {
      vehicularRole: "regional_lingua_franca",
      dialects: ["Ọ̀yọ́", "Ìjẹ̀bú"],
      vitalityStatus: {
        status: "Institutional",
        scale: "EGIDS (Ethnologue)",
        asOf: 2026,
      },
      sources: [
        {
          title: "yor | ISO 639-3",
          url: "https://iso639-3.sil.org/code/yor",
          tier: "official",
          notes: "SIL International.",
        },
      ],
    },
    ...overrides,
  };
}

function writeLanguageFiche(
  root: string,
  fileName: string,
  fiche: Record<string, unknown>
) {
  const dir = join(root, "langues");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), JSON.stringify(fiche));
}

function writeFamilyFiche(root: string, familyId: string) {
  const dir = join(root, "famille_linguistique");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${familyId}.json`),
    JSON.stringify({ id: familyId })
  );
}

// ─── test suite ───────────────────────────────────────────────────────────────

describe("checkLanguageModel (ETNI-1503)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
    writeFamilyFiche(tmpDir, "FLG_BENOUECONGO");
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  // @req REQ-136
  it("returns ok when the corpus directory does not exist", () => {
    rmSync(join(tmpDir, "langues"), { recursive: true, force: true });
    const result = checkLanguageModel(tmpDir);
    expect(result.ok).toBe(true);
  });

  // AC1: ISO 639-3 code and family are required, and every source carries a tier.
  // @req REQ-136
  it("accepts a conforming language fiche", () => {
    writeLanguageFiche(tmpDir, "yor.json", validFiche());
    const result = checkLanguageModel(tmpDir);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // @req REQ-136
  it("rejects a fiche with a missing or malformed ISO 639-3 id", () => {
    writeLanguageFiche(tmpDir, "yor.json", validFiche({ id: "YOR1" }));
    const result = checkLanguageModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("LNG-iso"))).toBe(true);
  });

  // @req REQ-136
  it("rejects a fiche whose id does not match its filename", () => {
    writeLanguageFiche(tmpDir, "yor.json", validFiche({ id: "ibo" }));
    const result = checkLanguageModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => e.includes("LNG-iso") && e.includes("filename"))
    ).toBe(true);
  });

  // @req REQ-136
  it("rejects a fiche missing its family reference", () => {
    const fiche = validFiche();
    delete (fiche as Record<string, unknown>).familyId;
    writeLanguageFiche(tmpDir, "yor.json", fiche);
    const result = checkLanguageModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("LNG-family"))).toBe(true);
  });

  // @req REQ-136
  it("rejects a fiche whose family reference does not resolve to an existing fiche", () => {
    writeLanguageFiche(
      tmpDir,
      "yor.json",
      validFiche({ familyId: "FLG_DOES_NOT_EXIST" })
    );
    const result = checkLanguageModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("LNG-family"))).toBe(true);
  });

  // @req REQ-136
  it("rejects a fiche with a tier-less source", () => {
    writeLanguageFiche(
      tmpDir,
      "yor.json",
      validFiche({
        content: {
          ...validFiche().content,
          sources: [{ title: "T", url: "https://un.org/x" }],
        },
      })
    );
    const result = checkLanguageModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("LNG-tier"))).toBe(true);
  });
});

describe("checkLanguageStrictSchema (ETNI-1503)", () => {
  let tmpDir: string;
  const modelPath = join(__dirname, "../../public/modele-langue.json");

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  // @req REQ-136
  it("returns ok when the corpus directory does not exist", () => {
    const result = checkLanguageStrictSchema(tmpDir, modelPath);
    expect(result.ok).toBe(true);
  });

  // @req REQ-136
  it("accepts a fiche whose keys match modele-langue.json exactly", () => {
    writeLanguageFiche(tmpDir, "yor.json", validFiche());
    const result = checkLanguageStrictSchema(tmpDir, modelPath);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // AC2: a language fiche using a field that belongs to the family model is rejected.
  // @req REQ-136
  it("rejects a fiche carrying a family-only top-level field", () => {
    writeLanguageFiche(
      tmpDir,
      "yor.json",
      validFiche({ branches: ["Yoruboid"] })
    );
    const result = checkLanguageStrictSchema(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("branches") && e.includes("LNG-schema")
      )
    ).toBe(true);
  });

  // @req REQ-136
  it("rejects a fiche carrying a family-only content field", () => {
    const fiche = validFiche();
    (fiche.content as Record<string, unknown>).numberOfLanguages = 20;
    writeLanguageFiche(tmpDir, "yor.json", fiche);
    const result = checkLanguageStrictSchema(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("numberOfLanguages") && e.includes("LNG-schema")
      )
    ).toBe(true);
  });

  // @req REQ-136
  it("rejects a fiche missing a required top-level key", () => {
    const fiche = validFiche();
    delete (fiche as Record<string, unknown>).glottocode;
    writeLanguageFiche(tmpDir, "yor.json", fiche);
    const result = checkLanguageStrictSchema(tmpDir, modelPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("glottocode") && e.includes("LNG-schema")
      )
    ).toBe(true);
  });
});
