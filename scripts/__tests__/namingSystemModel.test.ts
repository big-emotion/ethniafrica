// @req REQ-080
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { checkNamingSystemModel } from "../validateAfrikData";

// ─── helpers ──────────────────────────────────────────────────────────────────

function sharedFields(overrides: Record<string, unknown> = {}) {
  return {
    attestedForms: [
      {
        spelling: "Forme attestée",
        attestation: {
          title: "T",
          url: "https://un.org/x",
          tier: "official",
          notes: "",
        },
      },
    ],
    transmissionMode: "patrilineal",
    designatedSocialUnit: "clan",
    associatedPeoples: ["PPL_TEST"],
    associatedCountries: ["NGA"],
    origin: {
      originType: "griot_oral_tradition",
      sources: [
        {
          title: "T",
          url: "https://un.org/x",
          tier: "official",
          notes: "",
        },
      ],
    },
    ...overrides,
  };
}

function totemicFiche(overrides: Record<string, unknown> = {}) {
  return {
    id: "ONS_TEST",
    nameMain: "Système totémique test",
    namingSystem: "totemic_clan",
    ...sharedFields(),
    totemicFoodProhibition: "Interdit alimentaire",
    permittedGivenNames: ["Prénom autorisé"],
    casteOrSocialFunction: "Fonction sociale",
    ...overrides,
  };
}

function undeterminedFiche(overrides: Record<string, unknown> = {}) {
  return {
    id: "ONS_TEST",
    nameMain: "Système non déterminé",
    namingSystem: "undetermined",
    ...sharedFields(),
    ...overrides,
  };
}

function writeFiche(
  root: string,
  fileName: string,
  fiche: Record<string, unknown>
) {
  const dir = join(root, "systemes_onomastiques");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), JSON.stringify(fiche));
}

// ─── test suite ───────────────────────────────────────────────────────────────

describe("checkNamingSystemModel (ETNI-1460)", () => {
  let tmpDir: string;

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

  // @req REQ-080
  it("returns ok when the corpus directory does not exist", () => {
    const result = checkNamingSystemModel(tmpDir);
    expect(result.ok).toBe(true);
  });

  // AC1: totemic clan fiche — totemic prohibition + permitted given names
  // accepted, patronymic-chain depth refused as belonging to another system.
  // @req REQ-080
  it("accepts a valid totemic-clan fiche with its own subtype fields", () => {
    writeFiche(tmpDir, "ONS_TEST.json", totemicFiche());
    const result = checkNamingSystemModel(tmpDir);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // @req REQ-080
  it("rejects a totemic-clan fiche carrying a patronymic-chain field", () => {
    writeFiche(
      tmpDir,
      "ONS_TEST.json",
      totemicFiche({ patronymicChainDepth: 5 })
    );
    const result = checkNamingSystemModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("patronymicChainDepth") && e.includes("ONS-subtype")
      )
    ).toBe(true);
  });

  // @req REQ-080
  it("rejects a nisba fiche carrying a totemic-clan field", () => {
    writeFiche(tmpDir, "ONS_TEST.json", {
      id: "ONS_TEST",
      nameMain: "Système nisba test",
      namingSystem: "nisba",
      ...sharedFields(),
      nisbaSubtype: "geographic",
      totemicFoodProhibition: "Interdit alimentaire",
    });
    const result = checkNamingSystemModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("totemicFoodProhibition") && e.includes("ONS-subtype")
      )
    ).toBe(true);
  });

  // AC2: a fiche whose naming system is not determined is accepted and reads
  // as undetermined, never defaulted to the clan model.
  // @req REQ-080
  it("accepts an undetermined fiche using only shared fields", () => {
    writeFiche(tmpDir, "ONS_TEST.json", undeterminedFiche());
    const result = checkNamingSystemModel(tmpDir);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // @req REQ-080
  it("rejects an undetermined fiche carrying any subtype-only field", () => {
    writeFiche(
      tmpDir,
      "ONS_TEST.json",
      undeterminedFiche({ nisbaSubtype: "geographic" })
    );
    const result = checkNamingSystemModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("nisbaSubtype") && e.includes("ONS-subtype")
      )
    ).toBe(true);
  });

  // @req REQ-080
  it("rejects a fiche missing a required shared field", () => {
    const fiche = totemicFiche();
    delete (fiche as Record<string, unknown>).transmissionMode;
    writeFiche(tmpDir, "ONS_TEST.json", fiche);
    const result = checkNamingSystemModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("transmissionMode") && e.includes("ONS-shared")
      )
    ).toBe(true);
  });

  // @req REQ-080
  it("rejects a fiche with an unknown or missing namingSystem value", () => {
    writeFiche(
      tmpDir,
      "ONS_TEST.json",
      totemicFiche({ namingSystem: "unknown_system" })
    );
    const result = checkNamingSystemModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("ONS-namingSystem"))).toBe(
      true
    );
  });

  // @req REQ-080
  it("rejects a source with an invalid tier", () => {
    writeFiche(
      tmpDir,
      "ONS_TEST.json",
      totemicFiche({
        origin: {
          originType: "griot_oral_tradition",
          sources: [{ title: "T", url: "https://un.org/x", tier: "high" }],
        },
      })
    );
    const result = checkNamingSystemModel(tmpDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("ONS-tier"))).toBe(true);
  });
});
