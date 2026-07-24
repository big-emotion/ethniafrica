import { describe, expect, it } from "vitest";

import afroasiaticFamily from "../../dataset/source/afrik/famille_linguistique/FLG_AFROASIATIQUE.json";
import kruFamily from "../../dataset/source/afrik/famille_linguistique/FLG_KROU.json";
import betePeople from "../../dataset/source/afrik/peuples/FLG_KROU/PPL_BETE.json";
import zuluPeople from "../../dataset/source/afrik/peuples/FLG_BANTU/PPL_ZULU.json";
import burkinaFaso from "../../dataset/source/afrik/pays/BFA.json";
import coteDIvoire from "../../dataset/source/afrik/pays/CIV.json";
import { compareAfrikDrift } from "../lib/afrikDrift";

const source = {
  languageFamilies: [
    { id: kruFamily.id, content: kruFamily.content },
    { id: afroasiaticFamily.id, content: afroasiaticFamily.content },
  ],
  peoples: [
    { id: zuluPeople.id, content: zuluPeople.content },
    { id: betePeople.id, content: betePeople.content },
  ],
  countries: [
    { id: coteDIvoire.id, content: coteDIvoire.content },
    { id: burkinaFaso.id, content: burkinaFaso.content },
  ],
};

function reverseTopLevelFields(
  content: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(content).reverse());
}

describe("compareAfrikDrift", () => {
  it("reports missing database rows in hierarchy and identifier order", () => {
    expect(
      compareAfrikDrift(source, {
        languageFamilies: [],
        peoples: [],
        countries: [],
      })
    ).toEqual({
      languageFamilies: {
        missing: ["FLG_AFROASIATIQUE", "FLG_KROU"],
        stale: [],
      },
      peoples: {
        missing: ["PPL_BETE", "PPL_ZULU"],
        stale: [],
      },
      countries: {
        missing: ["BFA", "CIV"],
        stale: [],
      },
      hasDrift: true,
    });
  });

  it("reports stale content in deterministic identifier order", () => {
    expect(
      compareAfrikDrift(source, {
        languageFamilies: [
          { id: kruFamily.id, content: {} },
          { id: afroasiaticFamily.id, content: {} },
        ],
        peoples: [
          { id: zuluPeople.id, content: {} },
          { id: betePeople.id, content: {} },
        ],
        countries: [
          { id: coteDIvoire.id, content: {} },
          { id: burkinaFaso.id, content: {} },
        ],
      })
    ).toEqual({
      languageFamilies: {
        missing: [],
        stale: ["FLG_AFROASIATIQUE", "FLG_KROU"],
      },
      peoples: {
        missing: [],
        stale: ["PPL_BETE", "PPL_ZULU"],
      },
      countries: {
        missing: [],
        stale: ["BFA", "CIV"],
      },
      hasDrift: true,
    });
  });

  it("accepts synchronized content regardless of object key or row order", () => {
    const report = compareAfrikDrift(source, {
      languageFamilies: [
        {
          id: afroasiaticFamily.id,
          content: reverseTopLevelFields(afroasiaticFamily.content),
        },
        { id: kruFamily.id, content: reverseTopLevelFields(kruFamily.content) },
      ],
      peoples: [
        {
          id: betePeople.id,
          content: reverseTopLevelFields(betePeople.content),
        },
        {
          id: zuluPeople.id,
          content: reverseTopLevelFields(zuluPeople.content),
        },
      ],
      countries: [
        {
          id: burkinaFaso.id,
          content: reverseTopLevelFields(burkinaFaso.content),
        },
        {
          id: coteDIvoire.id,
          content: reverseTopLevelFields(coteDIvoire.content),
        },
        { id: "DATABASE_ONLY", content: {} },
      ],
    });

    expect(report).toEqual({
      languageFamilies: { missing: [], stale: [] },
      peoples: { missing: [], stale: [] },
      countries: { missing: [], stale: [] },
      hasDrift: false,
    });
    expect(JSON.stringify(report)).toBe(
      '{"languageFamilies":{"missing":[],"stale":[]},"peoples":{"missing":[],"stale":[]},"countries":{"missing":[],"stale":[]},"hasDrift":false}'
    );
  });
});
